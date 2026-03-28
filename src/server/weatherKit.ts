import type { AxiosError, AxiosRequestConfig } from "axios";
import type { WeatherFunc } from "./weatherForecastDispatcher";

import { DateTime } from "luxon";
const jwt = require("jsonwebtoken");
import * as Sentry from "@sentry/node";
import axios from "axios";
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 15000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 15000,
});

const axiosInstance = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 10000
})
import axiosRetry from "axios-retry";

const milesToMeters = 1609.34;

const keyId = "4JSC7L3B75";
const teamId = "2B6A6N9QBQ";
const serviceId = "com.randoplan.weatherkit-client";
const privateKey = process.env.WEATHERKIT_KEY;
const makeJwt = () => {
    return jwt.sign(
        {
            sub: serviceId
        },
        privateKey,
        {
            algorithm: "ES256",
            expiresIn: "1h",
            issuer: teamId,
            header: {
                alg: "ES256",
                kid: keyId,
                id: `${teamId}.${serviceId}`
            }
        }
    )
}

axiosRetry(axiosInstance, {
    retries: 5,
    retryDelay: axiosRetry.exponentialDelay, // (...arg) => axiosRetry.exponentialDelay(...arg, 200),
    retryCondition: (error: AxiosError) => {
        // in the weird case that we don't get a response field in the error then report to Sentry and fail the request
        if (!error.response) {
            Sentry.captureMessage(`Error object reported to Apple WeatherKit was missing the response`)
            Sentry.captureMessage(`Defective error object from WeatherKit:${JSON.stringify(error)}`)
            return false
        }
        switch (error.response.status) {
        case 504:
        case 404:
            return true;
        default:
            return false;
        }
    },
    onRetry: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => {
        console.log(`weatherKit axios retry count ${retryCount} for ${requestConfig.url}`);
    },
    onMaxRetryTimesExceeded: (err: any) => {
        console.log(`last weatherKit axios error after retrying was ${err}`)
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
const callWeatherKit = async function (lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl, lang) {
    const startTime = DateTime.fromISO(currentTime, { zone: 'utc' });
    const weatherKitKey = makeJwt();
    const when = startTime.toISO({ suppressMilliseconds: true });
    const later = startTime.plus({ hours: 1 }).toISO({ suppressMilliseconds: true });
    const url = `https://weatherkit.apple.com/api/v1/weather/${lang}/${lat}/${lon}?timezone=${zone}&dataSets=currentWeather,forecastHourly,forecastNextHour,&countryCode=US&currentAsOf=${when}&hourlyStart=${when}&hourlyEnd=${later}`;
    Sentry.setContext('url', { 'url': url })
    const forecastResult = await axiosInstance.get(url, { headers: { 'Authorization': `Bearer ${weatherKitKey}` } }).
        catch((error: any) => {
            Sentry.captureException( error )
            throw error;
        });
    const forecast = forecastResult.data
    const current = forecast.forecastHourly.hours[0];
    const now = DateTime.fromISO(forecast.currentWeather.asOf, { zone: zone });
    const windBearing = forecast.currentWeather.windDirection
    const relativeBearing = getBearingDifference(bearing, windBearing)
    const rainy = forecast.currentWeather.conditionCode === "Rain";
    const temperatureInC = forecast.currentWeather.temperature;
    // eslint-disable-next-line no-mixed-operators
    const temperatureInF = temperatureInC * 9 / 5 + 32;
    return {
        'time': now.toISO(),
        zone:zone,
        'distance': distance,
        'summary': forecast.currentWeather.conditionCode,
        'precip': `${(current.precipitationChance * 100).toFixed(1)}%`,
        'humidity': Math.round(current.humidity * 100),
        'cloudCover': `${(forecast.currentWeather.cloudCover * 100).toFixed(1)}%`,
        'windSpeed': `${Math.round(forecast.currentWeather.windSpeed * 1000 / milesToMeters)}`,
        'lat': lat,
        'lon': lon,
        'temp': `${Math.round(temperatureInF)}`,
        'relBearing': relativeBearing,
        'rainy': rainy,
        'windBearing': windBearing,
        'vectorBearing': bearing,
        'gust': current.windGust === undefined ? '<unavailable>' : `${Math.round(forecast.currentWeather.windGust * 1000 / milesToMeters)}`,
        // eslint-disable-next-line no-mixed-operators
        'feel': Math.round(forecast.currentWeather.temperatureApparent * 9 / 5 + 32),
        isControl:isControl
    }
} as WeatherFunc

export default callWeatherKit;