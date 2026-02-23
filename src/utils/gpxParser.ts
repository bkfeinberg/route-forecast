import { parseGPX } from "@we-gold/gpxjs";
import { DateTime } from 'luxon';

import { inputPaceToSpeed, setMinMaxCoords } from './util';
import {getPowerOrVelocity} from "./windUtils"
import * as Sentry from "@sentry/browser"
import { UserControl} from '../redux/controlsSlice';
import type { GpxRouteData, RwgpsRoute, RwgpsTrip } from '../redux/routeInfoSlice';
import {nearestPointOnLine}from "@turf/nearest-point-on-line";
import {cleanCoords} from "@turf/clean-coords";
import { lineString, point } from "@turf/helpers";
import { create, all } from 'mathjs/number'
import type { Feature, LineString, GeoJsonProperties } from 'geojson';

// Format for finish times (moved from TimeFields to avoid circular dependency in tests)
const finishTimeFormat = 'EEE, MMM dd yyyy h:mma';
const config = {
  relTol: 1e-5,
  absTol: 1e-8,
}
const math = create(all, config)

const kmToMiles = 0.62137;
/**
 Begin section swiped from gpx parser
 */
const greatCircleRadius = {
        miles: 3956,
        km: 6367
};

type SingleForecast = {
    time : string
    distance: number
    windBearing: number
    windSpeed: string
    gust: string
}
type ForecastInfo = Array<SingleForecast>
export type Point = {lat : number, lon: number, dist?: number, elevation: number}
export type CalculatedValue = {arrival : string, banked: number, val: number, distance: number, [index:string]:any}
interface RwgpsCoursePointWithN {
    d:number, t:string, n:string, x:number, y:number, i:number, description:never
}
interface RwgpsCoursePointWithDescription {
    d:number, t:string, n:never, x:number, y:number, i:number, description:string
}

export type RwgpsCoursePoint = RwgpsCoursePointWithN|RwgpsCoursePointWithDescription
export type RwgpsPoi  = {lat: number, lng: number, n:string, t: number, d:string}
export type RwgpsPoint = {x:number, y:number, d:number, e:number}
export type GpxPoint = {latitude: number, longitude: number, elevation: number}
export interface ExtractedControl {
    distance: number,
    duration: number,
    name: string,
    lat?: number,
    lon?: number,
    business?: string
}
export type Segment = [number, number]
export type ForecastRequest = {
    lat: number
    lon: number
    distance: number
    bearing?: number
    time: string
    isControl: boolean
}

export type ChartData = {
    distanceInKm:number
    totalMinutesLost:number
    windSpeedMph:number
}

export type ChartDataType = ChartData[]

export type WindAdjustResults = {
    weatherCorrectionMinutes:number, 
    calculatedControlPointValues:Array<CalculatedValue>
    maxGustSpeed:number
    finishTime:string | null
    adjustedTimes:Array<{time:DateTime,index:number}>
    chartData:ChartDataType
}

export interface RouteAnalysisResults {
    forecastRequest: ForecastRequest[],
    points: Point[],
    values: CalculatedValue[],
    finishTime: string,
    timeInHours: number,
    totalDistMeters: number,
}

const desiredSeparationInMeters = 25;       // meters of distance desired between two points for grade calculation
class AnalyzeRoute {
    constructor() {
        this.walkRwgpsRoute = this.walkRwgpsRoute.bind(this);
        this.walkGpxRoute = this.walkGpxRoute.bind(this);
        this.analyzeRoute = this.analyzeRoute.bind(this);
        this.loadGpxFile = this.loadGpxFile.bind(this)
    }

    toRad = (num : number) => num * Math.PI / 180;

    loadGpxFile(gpxFileData : string) {
        const [parsedFile, error] = parseGPX(gpxFileData)
        if (parsedFile) {
            return {gpxData:{tracks:parsedFile.tracks,name:parsedFile.metadata.name}}
        } else {
            return {error: new Error('Error parsing GPX file: ' + (error ? error.message : 'unknown error'))}
        }
    }

    /**
     * Calculates the distance between the two points using the haversine method.
     * @param {number} lat1 The latitude of the first point.
     * @param {number} lon1 The longtitude of the first point.
     * @param {number} lat2 The latitude of the first point.
     * @param {number} lon2 The longtitude of the first point.
     * @returns {number} The distance in miles between the two points.
    **/
    calculateDistance(lat1 : number, lon1 : number, lat2 : number, lon2 : number) {
            var dLat = this.toRad((lat2 - lat1)),
                    dLon = this.toRad((lon2 - lon1));

            lat1 = this.toRad(lat1);
            lat2 = this.toRad(lat2);

            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return greatCircleRadius.km * c;
    }

    /**
     * Return a point far enough behind to make grade calculation meaningful, a constant defined
     * above specifies that distance. If the traversal hasn't progressed that far return the earliest point.
     * @param {array} previousPoints The array of already encountered course points, may be empty
     * @param {object} point The point for which we are searching for a predecessor
     * @returns {object} the point at the specified distance behind or undefined if this is the first point
     */
    findPreviousPoint = (previousPoints : Array<Point>, point : Point) : Point | undefined => {
        if (previousPoints.length > 0) {
            let discoveredPoint = previousPoints.slice().reverse().find(previous =>
                (this.calculateDistance(previous.lat, previous.lon, point.lat, point.lon)*1000) > desiredSeparationInMeters);
            return discoveredPoint == undefined ? previousPoints[0] : discoveredPoint;
        }
        return undefined;
    }

    // get grade between two points
    getGrade(previousPoints : Array<Point>, currentPoint : Point) {
        let grade = 0;
        let trailingPoint = this.findPreviousPoint(previousPoints,currentPoint);
        if (!trailingPoint) {
            return 0
        }
        let distanceFromPreviousInKm =
            this.calculateDistance(trailingPoint.lat,trailingPoint.lon,currentPoint.lat,currentPoint.lon);
        if (distanceFromPreviousInKm !== 0 && trailingPoint.elevation !== undefined)
        {
            grade = (currentPoint.elevation - trailingPoint.elevation) / (distanceFromPreviousInKm*1000);
        }
        return grade;
    }

    // returns distance traveled in _miles_, and climb in meters, along with the grade between the two points
    // in future we may want to expand this to calculate grade over a greater distance
    findDeltas(previousPoint : Point, currentPoint : Point) {
        // calculate distance and elevation from last at desired distance behind
        let distanceFromLast = this.calculateDistance(previousPoint.lat, previousPoint.lon,
            currentPoint.lat,currentPoint.lon);
        if (currentPoint.elevation > previousPoint.elevation) {
            return {distance:distanceFromLast,climb:currentPoint.elevation-previousPoint.elevation};
        } else {
            return {distance:distanceFromLast,climb:0};
        }
    }

    parseCoursePoints = (routeData : RwgpsRoute|RwgpsTrip) =>
        routeData.type === "route" ? routeData[routeData.type]['course_points'] : routeData[routeData.type]['course_points']

    isControl = (coursePoint : RwgpsCoursePoint) => {
        const controlRegexp = /^control|rest stop|regroup|lunch/i;
        const exclusionRegexp = /(^Depart)|(^Exit)/i 
        return coursePoint.d !== undefined && coursePoint.t === 'Control' || (coursePoint.n && coursePoint.n.match(controlRegexp) && !coursePoint.n.match(exclusionRegexp))
    }

    businessFromText = (coursePoint : RwgpsCoursePoint) => {
        const matched = coursePoint.description ? coursePoint.description.match(/_(?<resto>.*)_/) : (coursePoint.n ? coursePoint.n.match(/_(?<resto>.*)_/) : undefined)
        return (matched && matched.groups) ? matched.groups.resto : undefined
    }

    businessFromPoiText = (coursePoint : RwgpsPoi) => {
        const matched = this.poiText(coursePoint).match(/_(?<resto>.*)_/) 
        return (matched && matched.groups) ? matched.groups.resto : undefined
    }

    nameHasDuration = (name : string) => {
        const durationRegex = /(\d{2})m/;        
        const matchResult = name.match(durationRegex);
        return matchResult ? parseInt(matchResult[1], 10) : 1;
    }

    controlFromCoursePoint = (coursePoint : RwgpsCoursePoint, distanceInMiles : number) : ExtractedControl => 
        ({business: this.businessFromText(coursePoint), name:coursePoint.n?coursePoint.n:
            (coursePoint.description?coursePoint.description:' '), 
            duration: this.nameHasDuration(coursePoint.n?coursePoint.n:(coursePoint.description?coursePoint.description:' ')),
            lat: coursePoint.y, lon: coursePoint.x,
            distance:Math.min(Math.round((coursePoint.d*kmToMiles)/1000),Math.trunc(distanceInMiles))})

    extractControlPoints = (routeData : RwgpsRoute|RwgpsTrip) => {
        const distanceInMiles = ((routeData.route ? routeData.route.distance : routeData.trip.distance) * kmToMiles) / 1000
        return this.parseCoursePoints(routeData).filter((point : RwgpsCoursePoint) => this.isControl(point)).
            map((point : RwgpsCoursePoint) => this.controlFromCoursePoint(point, distanceInMiles))
    }

    findPoiDistance = (poi : RwgpsPoi, routeData : RwgpsRoute|RwgpsTrip, routeDataAsLineString: LineString | Feature<LineString, GeoJsonProperties>) => {
        const distanceInMiles = ((routeData.route ? routeData.route.distance : routeData.trip.distance) * kmToMiles) / 1000
        const found = routeData[routeData.type]?.track_points.find((value) => math.equal(value.x, poi.lng) && math.equal(value.y, poi.lat))
        if (found) {
            return Math.min(Math.round((found.d*kmToMiles)/1000),distanceInMiles)
        }
        const poiPoint = point([poi.lng, poi.lat])
        const nearestPoint = nearestPointOnLine(routeDataAsLineString, poiPoint, { units: "miles" })
        // console.log(`POI ${poi.n} is ${nearestPoint.properties.dist} miles from the route`)
        const foundNearest = routeData[routeData.type]?.track_points.find((value) => 
            math.equal(value.x, nearestPoint.geometry.coordinates[0]) && math.equal(value.y, nearestPoint.geometry.coordinates[1]))
        if (foundNearest) {
            const nearestDistance = Math.round((foundNearest.d*kmToMiles)/1000)
            return Math.min(nearestDistance,Math.trunc(distanceInMiles))
        }
        return 0
    }

    poiText = (poi : RwgpsPoi) => poi.n + (poi.d?'\n' + poi.d:'')

    controlFromPoi = (poi : RwgpsPoi, routeData : RwgpsRoute|RwgpsTrip, 
        routeAsLineString: Feature<LineString, GeoJsonProperties>) : ExtractedControl => (
        {name: this.poiText(poi), duration:1, lat:poi.lat, lon:poi.lng, business: this.businessFromPoiText(poi), 
            distance:this.findPoiDistance(poi, routeData, routeAsLineString)}
    )

    // specifically look for POIs of type control, aid station, rest stop, or food, 
    // which are the ones that would be relevant for time adjustments, and assign them a distance based on their nearest point on the route stream
    extractControlsFromPois = (routeData : RwgpsRoute|RwgpsTrip) => {
        // create GeoJson LineString for later POI analysis
        const coordinates = this.parseRwgpsRouteStream(routeData).map( point => [point.lon, point.lat])
        const routeAsLineString = lineString(coordinates)
        const cleanedLine = cleanCoords(routeAsLineString)
        return routeData[routeData.type]?.points_of_interest.filter((poi: RwgpsPoi) =>
             (poi.t===31||poi.t===13||poi.t===27||poi.t===20)).map((poi: RwgpsPoi) => this.controlFromPoi(poi, routeData, cleanedLine))
    }

    parseGpxRouteStream ( routeData : GpxRouteData) : Array<Point> {
        return routeData.tracks.reduce((accum : Array<GpxPoint>, current: {points: Array<GpxPoint>}) => accum.concat(current.points, []), []).
        map((point : GpxPoint) => ({ lat: point.latitude, lon: point.longitude, elevation: point.elevation }))
    }

    parseRwgpsRouteStream( routeData : RwgpsRoute|RwgpsTrip) : Array<Point> {
        if (routeData.type === "route") {
            return routeData['route']['track_points']
            .filter((point : RwgpsPoint) => point.x !== undefined && point.y !== undefined)
            .map((point : RwgpsPoint)  => ({ lat: point.y, lon: point.x, elevation: point.e, dist: point.d }))
        } else {
            return routeData['trip']['track_points']
            .filter((point : RwgpsPoint) => point.x !== undefined && point.y !== undefined)
            .map((point : RwgpsPoint)  => ({ lat: point.y, lon: point.x, elevation: point.e, dist: point.d }))
        }
    }

    computePointsAndBounds = (stream:Array<Point>) => {

        let bounds = { min_latitude: 90, min_longitude: 180, max_latitude: -90, max_longitude: -180 };

        stream
            .forEach((point : Point) => {
                bounds = setMinMaxCoords(point, bounds);
            })
        return {pointList: stream, bounds}
    };

    analyzeRoute(stream : Array<Point>, userStartTime : DateTime, pace : string, 
        intervalInHours : number, controls : Array<UserControl>, timeZoneId : string, 
        segment : Segment, totalDistMeters : number) : RouteAnalysisResults {

        let nextControl = 0;

        const checkAndUpdateControls = function(distanceInKm : number, startTime : DateTime, 
            elapsedTimeInHours : number, controls : Array<UserControl>,
            calculatedValues : Array<CalculatedValue>, point : Point, shouldSkip : boolean) {
            if (controls.length <= nextControl) {
                return 0;
            }
            let distanceInMiles = distanceInKm*kmToMiles;
            if (distanceInMiles < controls[nextControl].distance) {
                return 0
            }
            let delayInMinutes = controls[nextControl].duration;
            let arrivalTime = startTime.plus({hours:elapsedTimeInHours});
            let banked = Math.round(AnalyzeRoute.rusa_time(distanceInKm, elapsedTimeInHours));
            // id is populated only when/if the controls are sorted by distance after a user click
            let ctrlId = controls[nextControl].id
            calculatedValues.push({arrival:arrivalTime.toFormat(finishTimeFormat),
                banked: banked,
                val:(ctrlId?ctrlId:0), lat:point.lat, lon:point.lon,
                distance:controls[nextControl].distance
            });
            // add the control to the forecast request
            if (distanceInMiles > 0 && !shouldSkip) {
                // don't add request with duplicate distance
                if (Math.round(accumulatedDistanceKm * kmToMiles) !== forecastRequests[forecastRequests.length - 1].distance) {
                    forecastRequests.push(AnalyzeRoute.addToForecast(point, startTime, (accumulatedTime + idlingTime),
                        accumulatedDistanceKm * kmToMiles, true));
                    if (forecastPoint) {
                        bearings.push(AnalyzeRoute.getRelativeBearing(forecastPoint, point));
                    }
                }
            }
            //           
            nextControl++;
            return delayInMinutes/60;      // convert from minutes to hours
        };

        let forecastRequests : Array<ForecastRequest> = [];
        let baseSpeed = inputPaceToSpeed[pace];
        let first = true;
        let previousPoint : Point | null = null;
        let forecastPoint : Point | null = null;
        let accumulatedDistanceKm = 0;
        let accumulatedClimbMeters = 0;
        let accumulatedTime = 0;
        let idlingTime = 0;
        let calculatedValues : Array<CalculatedValue> = [];
        let lastTime = 0;
        let previousAccumulatedTime = 0;

        // correct start time for time zone
        let startTime = DateTime.fromISO(userStartTime.toFormat("yyyy-MM-dd'T'HH:mm"), {zone:timeZoneId});
        let bearings : Array<number> = [];
        const filterFunc = (point : Point) => {
            return (point.lat!==undefined && point.lon!==undefined)
        }
        const filterToSegment = (point : Point) => {
            return (point.lat!==undefined && point.lon!==undefined && (point.dist===undefined || point.dist<=segment[1]))
        }
        const substream = (segment[1]>segment[0]) ? stream.filter(filterToSegment) : stream.filter(filterFunc)
        substream.forEach(point => {
            const shouldSkip = point.dist !== undefined && point.dist < segment[0]
            if (first && !shouldSkip) {
                forecastRequests.push(AnalyzeRoute.addToForecast(point, startTime, accumulatedTime, accumulatedDistanceKm * kmToMiles, false));
                if (forecastPoint) {
                    bearings.push(AnalyzeRoute.getRelativeBearing(forecastPoint,point));
                }
                forecastPoint = point;
                first = false;
            }
            else if (previousPoint !== null) {
                let deltas = this.findDeltas(previousPoint,point);
                accumulatedDistanceKm += deltas.distance;
                // accumulate elevation gain
                accumulatedClimbMeters += deltas.climb;
                // then find elapsed time given pace
                accumulatedTime = Math.max(
                    AnalyzeRoute.calculateElapsedTime(accumulatedClimbMeters, accumulatedDistanceKm, baseSpeed),
                    previousAccumulatedTime
                );
            }
            idlingTime += checkAndUpdateControls(accumulatedDistanceKm, startTime, (accumulatedTime + idlingTime),
                controls, calculatedValues, point, shouldSkip);
            // see if it's time for forecast
            if (!shouldSkip && ((accumulatedTime + idlingTime) - lastTime) >= intervalInHours) {
                forecastRequests.push(AnalyzeRoute.addToForecast(point, startTime, (accumulatedTime + idlingTime),
                    accumulatedDistanceKm * kmToMiles, false));
                lastTime = accumulatedTime + idlingTime;
                previousAccumulatedTime = accumulatedTime;
                if (forecastPoint) {
                    bearings.push(AnalyzeRoute.getRelativeBearing(forecastPoint,point));
                }
                forecastPoint = point;
            }
            previousPoint = point;
        });
        if (previousPoint !== null && accumulatedTime !== 0) {
            forecastRequests.push(AnalyzeRoute.addToForecast(previousPoint, startTime, (accumulatedTime + idlingTime),
                accumulatedDistanceKm * kmToMiles, false));
            if (forecastPoint) {
                let lastBearing = AnalyzeRoute.getRelativeBearing(forecastPoint,previousPoint);
                bearings.push(lastBearing);    
            }
        }
        if (accumulatedDistanceKm < totalDistMeters) {
            console.log(`Route added up to ${(accumulatedDistanceKm*1000).toFixed(2)}km rather than stated ${totalDistMeters} meters`)
        }
        let finishTime = AnalyzeRoute.formatFinishTime(startTime,accumulatedTime,idlingTime);
        // console.info(`setting finish time ${finishTime} from start ${startTime} accumulated ${accumulatedTime} and idling ${idlingTime}`);
        AnalyzeRoute.fillLastControlPoints(finishTime, controls, nextControl, accumulatedTime + idlingTime,
            accumulatedDistanceKm, calculatedValues);
        calculatedValues.sort((a,b) => a.val-b.val);
        let requestsWithBearings : Array<ForecastRequest> = forecastRequests.map( 
            ( request, index) => {return (index === 0) ? {...request, bearing:0} : {...request, bearing:bearings.shift()}})
        return {forecastRequest:requestsWithBearings,
            points:stream,values:calculatedValues,
            finishTime: finishTime, timeInHours:accumulatedTime + idlingTime,
            totalDistMeters
        };
    }

    static getRelativeBearing(point1 : Point, point2 : Point) {
        const degreesToRadians = Math.PI / 180;
        let φ1 = point1.lat * degreesToRadians;
        let φ2 = point2.lat * degreesToRadians;
        let λ1 = point1.lon * degreesToRadians;
        let λ2 = point2.lon * degreesToRadians;
        let x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
        let y = Math.sin(λ2-λ1) * Math.cos(φ2);
        let relative_bearing = Math.atan2(y, x) / degreesToRadians;
        if (relative_bearing < 0) {
            return 360 + relative_bearing;
        }
        return relative_bearing;
    }

    static fillLastControlPoints(finishTime: string, controls: Array<UserControl>, nextControl: number,
        totalTime : number, totalDistanceInKm : number, calculatedValues : Array<CalculatedValue>) {
        while (nextControl < controls.length) {
            // update banked time also, supplying final distance in km and total time taken
            let banked = Math.round(AnalyzeRoute.rusa_time(totalDistanceInKm, totalTime));
            let ctrlId = controls[nextControl].id
            calculatedValues.push({ arrival: finishTime, banked: banked, val: ctrlId?ctrlId:0,
                distance: controls[nextControl].distance });
            ++nextControl;
        }
    }

    static formatFinishTime(startTime : DateTime, accumulatedTime : number, restTime : number) {
            return startTime.plus({hours:accumulatedTime+restTime}).toFormat(finishTimeFormat);
    }

    walkRwgpsRoute(routeData : RwgpsRoute|RwgpsTrip, startTime : DateTime, pace : string, interval : number, 
        controls : Array<UserControl>, timeZoneId : string, segment : Segment) {
        let modifiedControls = controls.slice();
        modifiedControls.sort((a,b) => a['distance']-b['distance']);
        const stream = this.parseRwgpsRouteStream(routeData)
        const totalDistKm = routeData.route ? routeData.route?.distance : routeData.trip?.distance
        return this.analyzeRoute(stream, startTime, pace, interval, modifiedControls, timeZoneId, segment, totalDistKm);
    }

    walkGpxRoute(routeData : GpxRouteData, startTime : DateTime, pace : string, interval: number,
        controls: Array<UserControl>, timeZoneId : string, segment : Segment) {
        let modifiedControls = controls.slice();
        modifiedControls.sort((a,b) => a['distance']-b['distance']);
        const stream = this.parseGpxRouteStream(routeData)
        const totalDistMeters = routeData.tracks[0].distance.total
        return this.analyzeRoute(stream, startTime, pace, interval, modifiedControls, timeZoneId, segment, totalDistMeters);
    }

    static rusa_time(accumulatedDistanceInKm : number, elapsedTimeInHours : number) {
         let closetimeMinutes;
        if (accumulatedDistanceInKm === 0) {
             return 0
         }

         let accumulatedDistance=accumulatedDistanceInKm*1000;
         let elapsedMinutes = elapsedTimeInHours * 60;
         if (accumulatedDistance <= 600000) {
             closetimeMinutes = accumulatedDistance * .004;         // 1 / 250;
         }
         else if (accumulatedDistance > 600000 && accumulatedDistance <= 1000000) {
             closetimeMinutes = 2400 + ((accumulatedDistance - 600000) * 0.00525);
         }
         else {           // 1000 - 1300 km
             closetimeMinutes = 4500 + ((accumulatedDistance - 1000000) * 0.0045);
         }
         return (closetimeMinutes - elapsedMinutes);
    }

    // in hours
    static calculateElapsedTime(climbInMeters : number, distanceInKm : number, baseSpeed : number) {
        let climbInFeet = (climbInMeters * 3.2808);
        let distanceInMiles = distanceInKm*kmToMiles;
        if (distanceInMiles < 1) {
            return 0;
        }
        let effectiveSpeed = AnalyzeRoute.getHilliness(climbInFeet, distanceInMiles, baseSpeed);
        return distanceInMiles / effectiveSpeed;     // hours
    }

    static getHilliness(climbInFeet : number, distanceInMiles : number, baseSpeed : number) {
        let hilliness = Math.min(((climbInFeet / distanceInMiles) / 25), 6);
        // handle edge case for walking speeds
        let effectiveSpeed = baseSpeed - hilliness;
        // sanity checking
        if (baseSpeed <= hilliness) {
            effectiveSpeed = 1;
        }
        // cycling speeds less than 3 mph will not happen
        if (baseSpeed > 9 && effectiveSpeed < 3) {
            effectiveSpeed = 3;
        }
        // if the pace is a hiking pace, the cycling hilliness computation doesn't really work
        if (baseSpeed < 7) {
            effectiveSpeed = baseSpeed;
        }
        return effectiveSpeed;
    }

    static addToForecast(trackPoint : Point, currentTime : DateTime, 
        elapsedTimeInHours : number, distanceInMiles : number, isControl : boolean) : ForecastRequest{
        return {lat:trackPoint.lat,lon:trackPoint.lon,distance:Math.round(distanceInMiles),
            time:currentTime.plus({hours:elapsedTimeInHours}).toFormat("yyyy-MM-dd'T'HH:mm:00ZZZ"), isControl:isControl};
    }

    static getBearingBetween(trackBearing : number, windBearing : number) {
        let relative_bearing2;
        let relative_bearing1;
        if ((trackBearing - windBearing) < 0) {
            relative_bearing1 = (trackBearing - windBearing) + 360;
        }
        else {
            relative_bearing1 = trackBearing - windBearing;
        }
        if ((windBearing - trackBearing) < 0) {
            relative_bearing2 = (windBearing - trackBearing) + 360;
        }
        else {
            relative_bearing2 = windBearing - trackBearing;
        }
        return Math.min(relative_bearing1,relative_bearing2);
    }

    static windToTimeInMinutes(baseSpeed : number, distance : number, modifiedVelocity : number) {
        // will be negative for a tailwind
        return (distance*60)/modifiedVelocity-(distance*60)/baseSpeed;
    }

    adjustForWind = (forecastInfo : ForecastInfo, stream : Array<Point>, pace : string, controls : Array<UserControl>, 
        previouslyCalculatedValues : Array<CalculatedValue>, start : DateTime, 
        finishTime : string, timeZoneId : string, totalDistMeters : number) : WindAdjustResults => {
        if (forecastInfo.length===0) {
            return {weatherCorrectionMinutes:0,calculatedControlPointValues:previouslyCalculatedValues,maxGustSpeed:0, adjustedTimes:[], finishTime:finishTime, chartData:[]};
        }

        const gustThreshold = 50;   // above this incorporate some of the gust into the effect on the rider
        let baseSpeed = inputPaceToSpeed[pace];
        let forecast = forecastInfo.slice().reverse();
        let currentForecast = forecast.pop();
        let currentControl = 0;
        let previousPoint : Point | null = null;
        let previousPoints : Array<Point> = [];
        let totalMinutesLost = 0;
        let totalDistanceInKm = 0;
        let accumulatedClimbMeters = 0;
        let calculatedValues : Array<CalculatedValue> = [];
        let maxGustSpeed = 0;
        let adjustedTimes = []
        let forecastIndex = 1
        let chartData : Array<ChartData> = []

        stream.filter(point => point != null && point.lat !== undefined && point.lon !== undefined).forEach(currentPoint => {
            if (previousPoint !== null) {
                let deltas = this.findDeltas(previousPoint,currentPoint);
                totalDistanceInKm += deltas.distance;
                // accumulate elevation gain
                accumulatedClimbMeters += deltas.climb;

                let distanceInMiles = deltas.distance*kmToMiles;
                if (distanceInMiles === 0) {
                    return;
                }
                // get current forecast
                if (forecast.length > 0 && (totalDistanceInKm*kmToMiles)>forecast[forecast.length-1].distance) {
                    currentForecast = forecast.pop();
                    if (currentForecast) {
                        // calculate adjusted forecast time for table display purposes
                        const initialForecastTime = DateTime.fromISO(currentForecast.time, {zone:timeZoneId});
                        adjustedTimes.push({time:initialForecastTime.plus({minutes:totalMinutesLost}),index:forecastIndex})
                        forecastIndex++
                    }
                }
                // get bearing between the two points
                let trackBearing = AnalyzeRoute.getRelativeBearing(previousPoint,currentPoint);
                if (currentForecast) {
                    let relativeBearing = AnalyzeRoute.getBearingBetween(trackBearing,currentForecast.windBearing);
                    // adjust speed
                    let averageWindSpeed = parseInt(currentForecast.windSpeed);
                    if (currentForecast.gust !== undefined) {
                        let gustSpeed = parseInt(currentForecast.gust);
                        if (gustSpeed > maxGustSpeed) {
                            maxGustSpeed = gustSpeed;
                        }
                        if (gustSpeed > gustThreshold) {
                            averageWindSpeed += (gustSpeed - averageWindSpeed)/2;
                        }
                    }
                    let effectiveWindSpeed = Math.cos((Math.PI / 180)*relativeBearing)*averageWindSpeed;
                    // sometimes the route data is missing elevation, so don't try to compute with it
                    if (previousPoint.elevation!==undefined && currentPoint.elevation!==undefined) {
                        let grade = this.getGrade(previousPoints, currentPoint);
                        if (grade < 0) {
                            grade = 0;
                        }
                        let effectiveSpeed = baseSpeed;
                        if (totalDistanceInKm > 0) {
                            effectiveSpeed = AnalyzeRoute.getHilliness(accumulatedClimbMeters* 3.2808, totalDistanceInKm*kmToMiles, baseSpeed);
                        }
                        const power = getPowerOrVelocity(deltas.distance, Math.abs(previousPoint.elevation-currentPoint.elevation)/2,
                            grade, 0, undefined, effectiveSpeed);
                        const modifiedVelocity = getPowerOrVelocity(deltas.distance, Math.abs(previousPoint.elevation-currentPoint.elevation)/2,
                            grade, effectiveWindSpeed, power, effectiveSpeed);
                        // console.info(`grade was ${grade} power was ${power} wind:${effectiveWindSpeed} speed:${effectiveSpeed} modifiedVelocity was ${modifiedVelocity}`);
                        if (modifiedVelocity > 0) {
                            totalMinutesLost += AnalyzeRoute.windToTimeInMinutes(effectiveSpeed, distanceInMiles, modifiedVelocity);
                            // flip the sign of effective wind speed for charting purposes, make headwinds look negative
                            chartData.push( {distanceInKm:totalDistanceInKm, totalMinutesLost: totalMinutesLost , windSpeedMph: -effectiveWindSpeed })
                        }
                    }
                }

                let desiredDistance = totalDistanceInKm*kmToMiles;   // because the controls always use miles internally
                currentControl = AnalyzeRoute.calculateValuesForWind(controls, previouslyCalculatedValues,
                    calculatedValues, currentControl, desiredDistance, totalMinutesLost, start, totalDistanceInKm*kmToMiles, timeZoneId);
            }
            previousPoint = currentPoint;
            previousPoints.push(currentPoint);
        });

        // calculatedValues.sort((a,b) => a.val-b.val);
        // in case there is one more forecast line to update
        if (forecast.length > 0) {
            currentForecast = forecast.pop();
            // calculate adjusted forecast time for table display purposes
            if (currentForecast) {
                const initialForecastTime = DateTime.fromISO(currentForecast.time, {zone:timeZoneId});
                adjustedTimes.push({time:initialForecastTime.plus({minutes:totalMinutesLost}),index:forecastIndex})    
                currentControl = AnalyzeRoute.calculateValuesForWind(controls, previouslyCalculatedValues,
                    calculatedValues, currentControl, (totalDistMeters*kmToMiles)/1000, totalMinutesLost, start, totalDistanceInKm*kmToMiles, timeZoneId);
            }
        }
        if (!finishTime) {
            Sentry.addBreadcrumb({
                category: 'fromFormat',
                level: "warning",
                message: `Finish time missing in adjustForWind`
            })                                    
        }
        return {weatherCorrectionMinutes:totalMinutesLost,calculatedControlPointValues:calculatedValues, maxGustSpeed:maxGustSpeed,
                finishTime:DateTime.fromFormat(finishTime,finishTimeFormat).plus({minutes:totalMinutesLost}).toFormat(finishTimeFormat),
                adjustedTimes:adjustedTimes, chartData:chartData
            };
    };

    static calculateValuesForWind(controls : Array<UserControl>, previouslyCalculatedValues : Array<CalculatedValue>,
                                  calculatedValues : Array<CalculatedValue>, currentControl : number, desiredDistance : number,
                                  totalMinutesLost : number, start : DateTime, totalDistanceInMiles : number, timeZoneId : string) {
        if (controls.length > currentControl) {
            if (desiredDistance >= controls[currentControl].distance) {
                // console.info(`updating control ${currentControl} with delay ${totalMinutesLost} minutes`);
                if (!previouslyCalculatedValues[currentControl].arrival) {
                    Sentry.addBreadcrumb({
                        category: 'fromFormat',
                        level: "warning",
                        message: `Previous control arrival time missing for ${currentControl}`
                    })                                    
                }
                let previousArrivalTime = DateTime.fromFormat(previouslyCalculatedValues[currentControl].arrival, finishTimeFormat, {zone:timeZoneId});
                let arrivalTime = previousArrivalTime.plus({minutes:totalMinutesLost});
                let elapsedDuration = arrivalTime.diff(start);
                let banked = Math.round(AnalyzeRoute.rusa_time(totalDistanceInMiles / kmToMiles, elapsedDuration.as('hours')));
                calculatedValues.push({...previouslyCalculatedValues[currentControl], arrival:arrivalTime.toFormat(finishTimeFormat),
                    banked:banked});

                currentControl++;
            }
        }
        return currentControl;
    }
}

export { AnalyzeRoute };
export default new AnalyzeRoute();
