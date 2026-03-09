import * as Sentry from '@sentry/browser';
import { DateTime } from 'luxon';
const { trace, debug, info, warn, error, fatal, fmt } = Sentry.logger;

interface TimeZoneResult {
    offset: number
    zoneId: string
}
const findTimezoneForPoint = (lat : number, lon : number, time : DateTime, timezone_api_key : string, abortSignal : AbortSignal): Promise<TimeZoneResult|Error> => {
    return fetch(`https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${time.toSeconds()}&key=${timezone_api_key}`, {signal: abortSignal})
    .then( response => {
        if (response.ok) {
            return response.json();
        }
        error(`Failed to get time zone from ${lat},${lon} with error ${response.statusText}`)
        throw Error(response.statusText);
    })
    .then (body => {
        // check for error in body of message
        if (body.errorMessage !== undefined) {
            error(`Failed to get time zone from ${lat},${lon} with error ${body.errorMessage}`)
            throw Error(body.errorMessage);
        }
        // determine total timezone offset in seconds
        let tzOffset = body.dstOffset + body.rawOffset;
        return ({offset:tzOffset,zoneId:body.timeZoneId});
    })
    .catch(error => {return Error(error.message + " time zone")});
}

import type { RouteInfoState } from '../redux/routeInfoSlice';
interface TimeZoneIdSuccess {
    result: "success"
    value: {offset: number, zoneId: string}
}
interface TimeZoneIdFailure {
    result: "error"
    error: string | Error
}
type TimeZoneIdType = TimeZoneIdSuccess | TimeZoneIdFailure

const getTimeZoneId = async (routeInfo: RouteInfoState, routeStart: DateTime, timezoneApiKey: string, abortSignal: AbortSignal): Promise<TimeZoneIdType> => {
    const rwgpsRouteData = routeInfo.rwgpsRouteData
    if (routeInfo.type === "rwgps") {
        const rwgpsType = rwgpsRouteData.type
        const rwgpsRouteDatum = rwgpsRouteData[rwgpsType];
        if (!rwgpsRouteDatum) {
            error(`Failed to get time zone because RWGPS route data was missing for type:${routeInfo.type} ${rwgpsType}`)
            return { result: "error", error: "RWGPS route data missing" }
        }
        if (rwgpsRouteDatum.country_code === "CN") {
            info(`RWGPS route ${rwgpsRouteDatum.id} in China`);
        }
        const point = rwgpsRouteDatum['track_points'][0]

        const zoneInfo = await findTimezoneForPoint(point.y, point.x, routeStart, timezoneApiKey, abortSignal);
        if (zoneInfo instanceof Error) {
            error(`Failed to get time zone from ${point.y},${point.x} with error ${zoneInfo.message}`)
            return { result: "error", error: zoneInfo }
        }

        return { result: "success", value: zoneInfo }
    } else if (routeInfo.gpxRouteData !== null) {
        if (routeInfo.gpxRouteData.tracks[0] === undefined) {
            Sentry.captureMessage(JSON.stringify(routeInfo.gpxRouteData));
            return { result: "error", error: "GPX route missing tracks" }
        }
        const point = routeInfo.gpxRouteData.tracks[0].points[0];
        const zoneInfo = await findTimezoneForPoint(point.lat, point.lon, routeStart, timezoneApiKey, abortSignal)
        if (zoneInfo instanceof Error) {
            error(`Failed to get time zone from ${point.lat},${point.lon} with error ${zoneInfo.message}`)
            return { result: "error", error: zoneInfo }
        }
        return { result: "success", value: zoneInfo }
    } else {
        error(`Failed to get time zone because route data was missing for type:${routeInfo.type} `)

        return { result: "error", error: "Route data missing" }
    }
}

export const requestTimeZoneForRoute = async (routeInfo : RouteInfoState, routeStart: DateTime, apiKey: string) => {
    const fetchController = new AbortController()
    const timeZoneResults = await getTimeZoneId(routeInfo, routeStart, apiKey, fetchController.signal)
    if (timeZoneResults.result === "error") {
        return { result: "error", error: timeZoneResults.error }
    }
        
    return { result: timeZoneResults.value.zoneId }
}
