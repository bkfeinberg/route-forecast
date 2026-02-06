//
/* eslint-disable max-params*/

import axios, { AxiosError } from "axios";
import { DateTime } from "luxon";
import { WeatherFunc } from "./weatherForecastDispatcher";
const Sentry = require('@sentry/node')

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
const callWeatherApi = async function (lat : number, lon : number, currentTime : string, 
    distance : number, zone : string, bearing : number, 
    getBearingDifference : (bearing: number, windBearing: number) => number, 
    isControl : boolean, lang: string) {
    const weatherApiKey = process.env.WEATHER_API_KEY;
    const startTime = DateTime.fromISO(currentTime, {zone:zone});
    let hour = startTime.minute > 30 ? startTime.hour + 1 : startTime.hour;
    if (hour > 23) {
        hour = 0;
    }
    const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${lat},${lon}&days=1&hour=${hour}&lang=${lang}&aqi=yes&dt=${startTime.toISODate()}`;
    const historyUrl = `https://api.weatherapi.com/v1/history.json?key=${weatherApiKey}&q=${lat},${lon}&hour=${hour}&unixdt=${startTime.toUnixInteger()}`;
    const url = startTime < DateTime.now() ? historyUrl : forecastUrl;
    Sentry.setContext('url',{'url':url});
    const forecastResult = await axios.get(url).catch((error : any) => {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            let message = axiosError.message;
            if (axiosError.response) {
                message += `: ${JSON.stringify(axiosError.response.data)}`;
            } else if (axiosError.request) {
                message += `No response received for: ${JSON.stringify(axiosError.request)}`;
            }
            throw Error(message);
        } else {
            throw Error(error);
        }
    });
    if (forecastResult.data.error !== undefined && forecastResult.data.error.code !== undefined) {
        Sentry.captureMessage(`WeatherAPI error ${forecastResult.data.error.message}`,'error')
        throw Error(forecastResult.data.error.message);
    }
    const current = forecastResult.data.forecast.forecastday[0].hour[0];
    const now = DateTime.fromSeconds(current.time_epoch, {zone:zone});
    const hasWind = current.wind_mph !== undefined;
    const windBearing = current.wind_degree;
    const relativeBearing = getBearingDifference(bearing, windBearing)
    const rainy = current.will_it_rain !== 0;
    return {
        'time':now.toISO(),
        zone:zone,
        'distance':distance,
        'summary':current.condition.text,
        'precip':current.chance_of_rain===undefined?'<unavailable>':`${current.chance_of_rain}%`,
        'humidity':current.humidity,
        'cloudCover':current.cloud===undefined?'<unavailable>':`${current.cloud.toFixed(1)}%`,
        'windSpeed':!hasWind?'<unavailable>':`${Math.round(current.wind_mph)}`,
        'lat':lat,
        'lon':lon,
        'temp':`${Math.round(current.temp_f)}`,
        'relBearing':relativeBearing,
        'rainy':rainy,
        'windBearing':windBearing,
        'vectorBearing':bearing,
        'gust':current.gust_mph===undefined?'<unavailable>':`${Math.round(current.gust_mph)}`,
        'feel':current.feelslike_f===undefined?Math.round(current.temp_f):Math.round(current.feelslike_f),
        'aqi':forecastResult.data?.current?.air_quality?.pm2_5,
        isControl:isControl
    }
} as WeatherFunc;

export default callWeatherApi;