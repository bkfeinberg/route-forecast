import type { AxiosError, AxiosRequestConfig } from "axios";
import { WeatherFunc } from "./weatherForecastDispatcher";

import { DateTime } from "luxon";
import axios from 'axios'
import * as Sentry from "@sentry/node";
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  timeout: 60000,
});

const axiosInstance = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 30000
})
import axiosRetry from "axios-retry";

axiosRetry(axiosInstance, {
    retries: 5,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: AxiosError) => {
        // in the weird case that we don't get a response field in the error then report to Sentry and fail the request
        if (!error.response) {
            Sentry.captureMessage(`Error object reported to OneCall was missing the response`)
            Sentry.captureMessage(`Defective error object from OneCall:${JSON.stringify(error)}`)
            return false
        }
        switch (error.response.status) {
        case 501:
        case 429:
            return true;
        default:
            return false;
        }
    },
    onRetry: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => {
        console.log(`OneCall axios retry count ${retryCount} for ${requestConfig.url}`);
    },
    onMaxRetryTimesExceeded: (err: any) => {
        console.log(`last OneCall axios error after retrying was ${err}`)
    }
});

/* eslint-disable max-params*/

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
interface OneCallData {
    data: Array<{dt: number, 
        wind_deg: number, 
        temp: number, 
        humidity: number, 
        feels_like: number, 
        wind_gust: number, 
        rain?: string,
        clouds: number
        wind_speed: number
        weather: Array<{main:string, 
            description:string}>}>
    error?: {
        code?: number
        message: string
    },
}
const callOneCall = async function callWeatherApi (lat, lon, currentTime, distance, zone, bearing, 
    getBearingDifference, isControl, lang) {
    const oneCallKey = process.env.OPEN_WEATHER_KEY;
    const startTime = DateTime.fromISO(currentTime, {zone:zone});
    const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&units=imperial&dt=${startTime.toUTC().toUnixInteger()}&appid=${oneCallKey}&lang=${lang}`
    Sentry.setContext('url',{'url':url})
    const forecastResult = await axios.get<OneCallData>(url).catch((error : AxiosError<{cod:number, message:string}>) => {
        if ("response" in error && error.response && "data" in error.response && error.response.data && error.response.data) {
            throw Error(error.response.data.message);
        } else {
            throw Error(error.message);
        }
    });
    if (forecastResult.data.error !== undefined && forecastResult.data.error.code !== undefined) {
        Sentry.captureMessage(`OneCall error ${forecastResult.data.error.message}`,'error')
        console.log('now throwing ', forecastResult.data.error.message)
        throw Error(forecastResult.data.error.message);
    }
    const current = forecastResult.data.data[0]
    const now = DateTime.fromSeconds(current.dt, {zone:zone});
    const windBearing = current.wind_deg;
    const relativeBearing = getBearingDifference(bearing, windBearing)
    const rainy = current.weather[0].main.match(/rain/i) ? true : false
    return {
        'time':now.toISO(),
        zone:zone,
        'distance':distance,
        'summary':current.weather[0].description,
        'precip':current.rain?'100%':`0%`,
        'humidity':current.humidity,
        'cloudCover':`${current.clouds.toFixed(1)}%`,
        'windSpeed':`${Math.round(current.wind_speed)}`,
        'lat':lat,
        'lon':lon,
        'temp':`${Math.round(current.temp)}`,
        'relBearing':relativeBearing,
        'rainy':rainy,
        'windBearing':windBearing,
        'vectorBearing':bearing,
        'gust':`${Math.round(current.wind_gust)}`,
        'feel':Math.round(current.feels_like),
        isControl:isControl
    }
} as WeatherFunc

export default callOneCall