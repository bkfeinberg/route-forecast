import callTomorrowIo from './tomorrowio';
import callWeatherApi from './weatherApi'
import callVisualCrossing from './visualCrossing'
import callNWS from './nws'
const callMeteomatics = require('./meteomatics');
import callWeatherKit from './weatherKit';
import callOpenMeteo from './openmeteo';
import callOneCall from './oneCall'
import * as Sentry from "@sentry/node";
const { error } = Sentry.logger;

const getBearingDifference = function (bearing : number,windBearing : number) {
    return Math.min(bearing - windBearing < 0 ? bearing - windBearing + 360 : bearing - windBearing,
        windBearing - bearing < 0 ? windBearing - bearing + 360 : windBearing - bearing);
};

/* eslint-disable max-params*/

export type WeatherFunc =
    (lat : number, lon : number, 
        currentTime : string, distance : number, zone : string, bearing : number,
        getBearingDifference : (bearing: number, windBearing: number) => number, isControl : boolean,
        lang: string) =>
        Promise<{
        time: string
        zone: string,
        distance:number
        summary: string
        precip: string
        humidity: number
        cloudCover: string
        windSpeed: string
        lat: number
        lon: number
        temp: string
        relBearing: number
        rainy: boolean
        windBearing: number
        vectorBearing: number
        gust: string
        feel: number
        aqi?: number
        isControl: boolean
        }>

/**
 *
 * @param {string} service - which service to call
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @param {date} currentTime - time at which to obtain forecast
 * @param {number} distance - used only in the return value, not the call
 * @param {string} zone time zone
 * @param {number} bearing the direction of travel at the time of the forecast
 * @param {boolean} isControl the forecast point is from a controle
 * @returns {Promise<{time: *, distance: *, summary: *, precip: string, cloudCover: string, windSpeed: string,
 * lat: *, lon: *, temp: string, relBearing: null, rainy: boolean, windBearing: number,
 * vectorBearing: *, gust: string} | never>} a promise to evaluate to get the forecast results
 */
const callWeatherService = function (service : string, lat : number, lon : number, 
    currentTime : string, distance : number, zone : string, bearing : number, isControl : boolean,
    lang: string) {
    switch (service) {
    case 'climacell':
        return Sentry.startSpan({ name: "tomorrow.io" }, () => {
            return callTomorrowIo(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    case 'weatherapi':
        return Sentry.startSpan({ name: "weatherapi" }, () => {
            return callWeatherApi(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    case 'visualcrossing':
        return Sentry.startSpan({ name: "visualcrossing" }, () => {
            return callVisualCrossing(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    case 'nws':
        return Sentry.startSpan({ name: "nws" }, () => {
            return callNWS(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    // case 'meteomatics':
    //     return callMeteomatics(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang);
    case 'weatherKit':
        return Sentry.startSpan({ name: "weatherkit" }, () => {
            return callWeatherKit(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    case 'oneCall':
        return Sentry.startSpan({ name: "oneCall" }, () => {
            return callOneCall(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    case 'openMeteo':
        return Sentry.startSpan({ name: "openMeteo" }, () => {
            return callOpenMeteo(lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang)
        })
    default:
        error(`Unknown weather service requested: ${service}`);
        return null;
    }
}

export default callWeatherService;