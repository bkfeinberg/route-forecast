/* eslint-disable max-params, max-lines-per-function */

import axios from "axios";
import { DateTime } from "luxon";
import { WeatherFunc } from "./weatherForecastDispatcher";
const Sentry = require('@sentry/node')

const convertToValidStart = (currentTime : string) => {
    let startTime = DateTime.fromISO(currentTime, { zone: 'utc' });
    // round up to nearest hour
    if (startTime.minute >= 25) {
        startTime = startTime.plus({hours : 1}).set({minute: 0})
    }
    return startTime
}
/**
 *
 * @param {number} lat latitude
 * @param {number} lon longitude
 * @param {date} currentTime time at which to obtain forecast
 * @param {number} distance used only in the return value, not the call
 * @param {string} zone time zone
 * @param {number} bearing the direction of travel at the time of the forecast
 * @param {function} getBearingDifference - returns the difference between two bearings
 * @param {boolean} isControl the forecast point is from a controle
* @returns {Promise<{time: *, distance: *, summary: *, precip: string, cloudCover: string, windSpeed: string,
 * lat: *, lon: *, temp: string, relBearing: null, rainy: boolean, windBearing: number,
 * vectorBearing: *, gust: string} | never>} a promise to evaluate to get the forecast results
 */
const callVisualCrossing = async function (lat : number, lon : number, currentTime : string, 
    distance : number, zone : string, bearing : number, 
    getBearingDifference : (bearing: number, windBearing: number) => number, 
    isControl : boolean, lang: string) {
    if (typeof lat !== 'number' || lat < -90 || lat > 90 || isNaN(lat)) {
        throw new Error('Invalid latitude value');
    }
    if (typeof lon !== 'number' || lon < -180 || lon > 180 || isNaN(lon)) {
        throw new Error('Invalid longitude value');
    }
    const visualCrossingKey = process.env.VISUAL_CROSSING_KEY;
    if (!visualCrossingKey) {
        throw new Error("Missing Visual Crossing key")
    }
    const startTime = convertToValidStart(currentTime)
    if (!startTime.isValid) {
        Sentry.captureMessage(`Invalid start time for Visual Crossing request: ${startTime.invalidReason} ${startTime.invalidExplanation} ${startTime.toString()}`)
        throw new Error(`Invalid start time for Visual Crossing request: ${startTime.invalidReason} ${startTime.invalidExplanation} ${startTime.toString()}`)
    }
    const startTimestamp = startTime.toUnixInteger();
    if (isNaN(startTimestamp)) {
        Sentry.captureMessage(`Invalid start timestamp for Visual Crossing request - from ${startTime.toString()}`)
        throw new Error(`Invalid start timestamp for Visual Crossing request - from ${startTime.toString()}`)
    }
    const url = new URL(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${startTimestamp}`);
    url.searchParams.append('unitGroup', 'us');
    url.searchParams.append('include', 'current');
    url.searchParams.append('options', 'nonulls');
    url.searchParams.append('lang', lang)
    url.searchParams.append('key', visualCrossingKey);
    const weatherResult = await axios.get(url.toString()).catch((error : any)=> {Sentry.captureMessage(`axios error ${error.response?error.response.data:error}`,'error')
        throw error.response?error.response.data:error});
    const forecast = weatherResult.data;
    if (forecast.code !== undefined) {
        Sentry.captureMessage(`got error code ${forecast.code}`,'error')
        throw forecast.message;
    }
    const current = forecast.currentConditions;
    if (current === undefined) {
        Sentry.captureMessage(`Throwing error because no current conditions were returned`,'error');
        throw Error("No current conditions");
    }
    const now = DateTime.fromSeconds(current.datetimeEpoch, {zone: zone})
    const hasWind = current.windspeed !== undefined;
    const windBearing = current.winddir;
    const relativeBearing = getBearingDifference(bearing, windBearing)
    const rainy = current.precip !== 0;
    const precip = current.precipprob !== undefined ? current.precipprob : 0;
    const isoTime = now.toISO()
    return new Promise((resolve) => {resolve({
        'time':isoTime?isoTime:'N/A',
        zone:zone,
        'distance':distance,
        'summary':forecast.days[0].conditions,
        'precip':`${precip.toFixed(1)}%`,
        'humidity':Math.round(current.humidity),
        'cloudCover':current.cloudcover===undefined?'<unavailable>':`${current.cloudcover.toFixed(1)}%`,
        'windSpeed':!hasWind?'<unavailable>':`${Math.round(current.windspeed)}`,
        'lat':lat,
        'lon':lon,
        'temp':`${Math.round(current.temp)}`,
        'relBearing':relativeBearing,
        'rainy':rainy,
        'windBearing':Math.round(windBearing),
        'vectorBearing':bearing,
        'gust':current.windgust===undefined?`${Math.round(current.windspeed)}`:`${Math.round(current.windgust)}`,
        'feel':current.feelslike===undefined?Math.round(current.temperature):Math.round(current.feelslike),
        isControl:isControl
    })})
} as WeatherFunc;

export default callVisualCrossing;