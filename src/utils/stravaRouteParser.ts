import { DateTime } from 'luxon';
import queryString from 'query-string';
import Cookies from 'universal-cookie';
import { Api } from 'rest-api-handler';

import { paceToSpeed, setMinMaxCoords } from './util';
import type { UserControl } from '../redux/controlsSlice';

const metersToMiles = 0.00062137;
const metersToFeet = 3.2808;

export type StravaActivityData = {
    message : string
    total_elevation_gain : number
    [index:string]:any
}

export type StravaActivityStream = {
    message: string
    distance: {data:Array<number>}
    time: {data:Array<number>}
    altitude: {data:Array<number>}
    latlng: {data: Array<[number,number]>}
    moving: { data: Array<number>}
}

class StravaActivityParser {
    api: Api<any>;
    constructor() {
        this.processActivityStream = this.processActivityStream.bind(this);
        this.fetchActivity = this.fetchActivity.bind(this);
        this.api = new Api('https://www.strava.com/api/v3', [(response) => Promise.resolve(response.json())]);
    }

    fetchStravaActivity(activityId : string, token : string) {
        "use memo";
        if (token === null) {
            this.authenticate(activityId);
            return new Promise<{activity: StravaActivityData;
                stream: StravaActivityStream}>((_resolve, reject) => reject(new Error('fetching authentication token')));
        }
        const cookies = new Cookies(null, { path: '/' });
        
        this.api.setDefaultHeader('Authorization', `Bearer ${token}`);
        let activityPromise = this.fetchActivity(activityId, this.api);
        return new Promise<{activity: StravaActivityData;
            stream: StravaActivityStream}>((resolve, reject) => {
            activityPromise.then((activityData : StravaActivityData) => {
                let activityDataPromise = this.processActivityStream(activityId, this.api);
                activityDataPromise.then((activityStream : StravaActivityStream) => {
                    if (activityData.message !== undefined) {
                        if (activityData.message !== "Record Not Found") {
                            cookies.remove('strava_token');
                        }
                        reject(activityData.message);
                        return;
                    }
                    if (activityStream.message !== undefined) {
                        if (activityStream.message !== "Record Not Found") {
                            cookies.remove('strava_token');
                        }
                        reject(activityStream.message);
                        return;
                    }
                    resolve({ activity: activityData, stream: activityStream });
                }, error => {
                    reject(error);
                });
            }, error => {
                reject(error);
            });
        });
    }

    computeControlPointArrivalTimes = (activityData : StravaActivityData, activityStream : StravaActivityStream, 
        controlPoints : Array<UserControl>) => {
            "use memo";
        let arrivalTimes : Array<{time:string,val:number}>= [];
        let modifiedControls = controlPoints.slice();
        modifiedControls.sort((a,b) => a['distance']-b['distance']);
        let distances = activityStream.distance.data;
        let times = activityStream.time.data;
        StravaActivityParser.walkActivity(activityData['start_date'], distances, times, modifiedControls, arrivalTimes);
        arrivalTimes.sort((a,b) => a['val']-b['val']);
        return arrivalTimes;
    }

    computeActualFinishTime = (activityData : StravaActivityData) => DateTime.fromISO(activityData['start_date']).plus({seconds:activityData['elapsed_time']}).toFormat('MMMM dd, yyyy h:mm a');

    computeWWPaceForActivity = (activityData : StravaActivityData) => {
        // all below in meters
        let average_speed_in_meters = activityData.average_speed;
        let averageSpeedInMilesPerHour = (average_speed_in_meters*3600)*metersToMiles;
        let climbInMeters = activityData.total_elevation_gain;
        let distanceInMeters = activityData.distance;
        let climbInFeet = (climbInMeters * metersToFeet);
        let distanceInMiles = distanceInMeters*metersToMiles;
        return StravaActivityParser.wwPaceCalc(climbInFeet, distanceInMiles, averageSpeedInMilesPerHour);
    }

    static wwPaceCalc(climbInFeet : number, distanceInMiles : number, averageSpeedInMilesPerHour : number) {
        let hilliness = (climbInFeet / distanceInMiles) / 25;
        return averageSpeedInMilesPerHour + hilliness;
    }

    computePointsAndBounds = (activityStream : StravaActivityStream) => {
        let latlng = activityStream.latlng;
        let distance = activityStream.distance;
        let altitude = activityStream.altitude
        let bounds = { min_latitude: 90, min_longitude: 180, max_latitude: -90, max_longitude: -180 };
        return {
            pointList: latlng.data.map((coord, i) => {
                let point : {lat:number, lon:number, dist:number, elevation:number} = Object.assign({}, 
                    {lat:coord[0], lon:coord[1]}, {dist:distance.data[i]}, {elevation:altitude.data[i]});
                bounds = setMinMaxCoords(point, bounds);
                return point
            }),
            bounds
        };
    };

    fetchActivity(activityId : string, api : Api) {
        return api.get(`/activities/${activityId}`);
    }

    findMovingAverages(activity : StravaActivityData, activityStreams : StravaActivityStream,intervalInHours : number) {
        let start = DateTime.fromISO(activity.start_date);
        let intervalInSeconds = intervalInHours * 3600;
        let distances = activityStreams.distance.data;
        let times = activityStreams.time.data;
        let altitudes = activityStreams.altitude.data;

        let index = 0;
        let startingDistanceMeters = 0;
        let intervalStartTimeSeconds = 0;
        let intervalElevationGainMeters = 0;
        let lastElevation = null;
        let averages = [];

        const addToAverages = function (intervalStartTimeSeconds : number, startingDistanceMeters : number, distance : number,
                                        intervalMovingTimeSeconds : number, 
                                        _value : number, stoppedTimeSeconds : number) {
            // compute average, set up for next interval
            let currentMoment = start.plus({seconds:intervalStartTimeSeconds});
            let distanceTraveledMeters = distance - startingDistanceMeters;
            let distanceTraveledMiles = distanceTraveledMeters * metersToMiles;
            let movingAverage = (distanceTraveledMiles) / (intervalMovingTimeSeconds / 3600);
            let climbInFeet = intervalElevationGainMeters * metersToFeet;
            let pace = StravaActivityParser.wwPaceCalc(climbInFeet, distanceTraveledMiles, movingAverage);
            return ({
                speed: movingAverage, distance: distanceTraveledMiles, climb: climbInFeet,
                start:startingDistanceMeters, end:distance,
                pace: pace, alphaPace: StravaActivityParser.getAlphaPace(Math.round(pace)),
                time: currentMoment.toFormat('EEE, MMM dd h:mma'), stoppedTimeSeconds: stoppedTimeSeconds
            });
        };

        const moving = activityStreams.moving.data;
        let prevTime = 0;
        let movingTimeSeconds = 0;
        let stoppedTimeSeconds = 0;
        for (let value of times) {
            if (moving[index]) {
                movingTimeSeconds += value - prevTime;
            } else {
                stoppedTimeSeconds += value - prevTime;
            }
            prevTime = value;
            // try to apply some smoothing to elevation gain
            if (lastElevation !== null) {
                if (altitudes[index] > (lastElevation + 0.2)) {
                    intervalElevationGainMeters += (altitudes[index] - lastElevation);
                }
                else if (altitudes[index] > (lastElevation + 0.1)) {
                    intervalElevationGainMeters += (altitudes[index] - lastElevation)/2;
                }
            }
            lastElevation = altitudes[index];
            // only calculate speed while we are moving, and determine the moving time by adding moving time
            // in the interval up until now, and add in the time since we started moving most recently
            if (moving[index] && movingTimeSeconds >= intervalInSeconds) {
                averages.push(addToAverages(intervalStartTimeSeconds, startingDistanceMeters, distances[index],
                                            movingTimeSeconds, value, stoppedTimeSeconds));
                intervalStartTimeSeconds = value;
                startingDistanceMeters = distances[index];
                intervalElevationGainMeters = 0;
                movingTimeSeconds = 0;
                stoppedTimeSeconds = 0;
            }
            ++index;
        }
        if (movingTimeSeconds > 0) {
            averages.push(addToAverages(intervalStartTimeSeconds,startingDistanceMeters,distances[distances.length-1],
                                        movingTimeSeconds, times[times.length-1], stoppedTimeSeconds));
        }
        return averages;
    }

    static getAlphaPace(pace : number) {
        let alpha : string | undefined = 'A-';     // default
        alpha = Object.keys(paceToSpeed).reverse().find(value => {
            return (pace >= paceToSpeed[value])});
        return alpha;
    }

    static walkActivity(start : string, distance : Array<number>, time : Array<number>, 
        controlPoints : Array<UserControl>, arrivalTimes : Array<{time:string,val:number}>) {
        if (controlPoints.length === 0) {
            return;
        }
        let startMoment = DateTime.fromISO(start);
        let controlsCopy = controlPoints.slice();
        let currentControl = controlsCopy.shift();
        let index = 0;
        for (let value of distance) {
            let distanceInMiles = value * metersToMiles;
            if (distanceInMiles >= currentControl!.distance) {
                let currentMoment = startMoment.plus({seconds:time[index]})
                let ctrlId = currentControl!.id
                arrivalTimes.push({time:currentMoment.toFormat('EEE, MMM dd h:mma'),val:ctrlId?ctrlId:0});
                if (controlsCopy.length===0) {
                    return;
                } else {
                    currentControl = controlsCopy.shift();
                }
            }
            index++;
        }
    }

    processActivityStream(activityId : string,api:Api) {
        return api.get(`activities/${activityId}/streams?keys=distance,time,altitude,velocity_smooth,moving,latlng&key_by_type=true`);
    }

    authenticate(zactivityId? : string ) : void {
        let params = queryString.parse(location.search);
        if (zactivityId !== undefined) {
            params['strava_activity'] = zactivityId;
        }
        params['strava_analysis'] = 'true';
        window.location.href = '/stravaAuthReq?state=' + encodeURIComponent(JSON.stringify(params));
    }
}

export default new StravaActivityParser();
