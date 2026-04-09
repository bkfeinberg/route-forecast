import { AxiosError } from "axios";
import { WeatherFunc } from "./weatherForecastDispatcher.js";

import { DateTime } from "luxon";
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
import axios from "axios";
const axiosInstance = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 30000
})
import * as Sentry from "@sentry/node";
import axiosRetry from "axios-retry";
const { trace, debug, info, warn, error, fatal, fmt } = Sentry.logger;

const weatherCodes  : {[index: string]: any} = {
    "0": "Unknown",
    "1000": "Clear",
    "1001": "Cloudy",
    "1100": "Mostly Clear",
    "1101": "Partly Cloudy",
    "1102": "Mostly Cloudy",
    "2000": "Fog",
    "2100": "Light Fog",
    "3000": "Light Wind",
    "3001": "Wind",
    "3002": "Strong Wind",
    "4000": "Drizzle",
    "4001": "Rain",
    "4200": "Light Rain",
    "4201": "Heavy Rain",
    "5000": "Snow",
    "5001": "Flurries",
    "5100": "Light Snow",
    "5101": "Heavy Snow",
    "6000": "Freezing Drizzle",
    "6001": "Freezing Rain",
    "6200": "Light Freezing Rain",
    "6201": "Heavy Freezing Rain",
    "7000": "Ice Pellets",
    "7101": "Heavy Ice Pellets",
    "7102": "Light Ice Pellets",
    "8000": "Thunderstorm"    
}

axiosRetry(axiosInstance, {
    retries: 4,
    retryDelay: (...arg: any) => axiosRetry.exponentialDelay(...arg),
    retryCondition: (error: AxiosError) => {
        if (!error.response) {
            warn(`Tomorrow.io axios retry condition called due to error with no response: ${error.message} ${error.code}`);
            return false
        }
        switch (error.response.status) {
            case 429:
                return true;
            default:
                return false;
        }
    },
    onRetry: (retryCount: number) => {
        info(`tommorow.io axios retry count: ${retryCount}`);
    },
    onMaxRetryTimesExceeded: (err: any) => {
        warn(`last tomorrow.io axios error after retrying was ${err}`)
    }
});

const getFromTomorrowIoWithBackoff = async (forecastUrl : string) => {
    const forecastResult = await axiosInstance.get(forecastUrl).catch((error : AxiosError) => {
        // Sentry.captureException(error)
        console.error('Axios error', error.response?.statusText)
        throw Error(`Failed to get Tomorrow.io forecast from ${forecastUrl}: ${error}`)
    })
    if (forecastResult !== undefined) {
        const forecast = forecastResult.data;
        if (forecast.code !== undefined) {
            Sentry.captureMessage(`got error code ${forecast.code} with ${forecast.message}`,'error')
            console.log(forecast);
        }
        return forecast;
    }
    Sentry.captureMessage(`No forecast returned from Tomrrow.io on ${forecastUrl}`)
    throw Error("No forecast from Tomorrow.io")
}

/* eslint-disable max-params */
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
const callTomorrowIo = async function callTomorrowIo (lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl) {
    const climacellKey = process.env.CLIMACELL_KEY;
    const startTime = DateTime.fromISO(currentTime, {zone:zone});
    const endTime = startTime.plus({hours:1})

    const startTimeString = startTime.toISO()
    const endTimeString = endTime.toISO()
    const baseUrl = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}` +
        '&fields=windSpeed,precipitationProbability,windDirection,temperature,temperatureApparent,windGust,cloudCover,precipitationType,weatherCode,humidity,epaIndex' +
        `&timezone=${zone}&startTime=${startTimeString}&endTime=${endTimeString}&timesteps=1h&units=imperial`
    const url = `${baseUrl}&apikey=${climacellKey}`
    Sentry.setContext('url',{'url':baseUrl})
    const forecast = await getFromTomorrowIoWithBackoff(url);

    const current = forecast.data.timelines[0];
    const values = current.intervals[0].values;
    const hasWind = values.windSpeed != undefined;
    const windBearing = values.windDirection;
    const relativeBearing = hasWind && windBearing !== undefined ? getBearingDifference(bearing, windBearing) : null;
    const rainy = current.precipitationType === 1;
    let temperature = values.temperature==undefined ? '<unavailable>':`${Math.round(values.temperature)}`;
    
    return {
        'time':current.startTime,
        zone:zone,
        'distance':distance,
        'summary':weatherCodes[values.weatherCode],
        'precip':values.precipitationProbability===undefined?'<unavailable>':`${values.precipitationProbability.toFixed(1)}%`,
        'humidity':Math.round(values.humidity),
        'cloudCover':values.cloudCover===undefined?'<unavailable>':`${values.cloudCover.toFixed(1)}%`,
        'windSpeed':!hasWind?'<unavailable>':`${Math.round(values.windSpeed)}`,
        'lat':lat,
        'lon':lon,
        'temp': temperature,
        'relBearing':relativeBearing,
        'rainy':rainy,
        'windBearing':windBearing==undefined?'<unavailable>':Math.round(windBearing),
        'vectorBearing':bearing,
        'gust':values.windGust==undefined?'<unavailable>':`${Math.round(values.windGust)}`,
        'feel':values.temperatureApparent==undefined? temperature : Math.round(values.temperatureApparent),
        'aqi':values.epaIndex,
        isControl:isControl
    }
} as WeatherFunc;

export default callTomorrowIo