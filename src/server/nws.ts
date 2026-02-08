import { WeatherFunc } from "./weatherForecastDispatcher";

import { DateTime, Interval } from "luxon"
const axios = require('axios');
const axiosInstance = axios.create()
import * as Sentry from "@sentry/node"
const { trace, debug, info, warn, error, fatal, fmt } = Sentry.logger;
const milesToMeters = 1609.34;
import axiosRetry from "axios-retry";
import { AxiosError, AxiosRequestConfig } from "axios";

axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (...arg: any) => axiosRetry.exponentialDelay(...arg),
    retryCondition: (error: AxiosError) => {
        warn(`NWS axios retry condition called due to error: ${error.message} ${error.code}`);
        // in the weird case that we don't get a response field in the error then report to Sentry and fail the request
        if (!error.response) {
            return false
        }
        switch (error.response.status) {
            case 500:
            case 503:
            case 504:
            case 404:
                return true;
            default:
                return false;
        }
    },
    onRetry: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => {
        console.log(`nws axios retry count: ${retryCount} for ${requestConfig.url} with ${error.message}`)
        warn(`nws axios retry count: ${retryCount} for ${requestConfig.url} with ${error.message}`)
    },
    onMaxRetryTimesExceeded: (err: any, retryCount: number) => {
        console.log(`last nws axios error after retrying ${retryCount} times was ${err}`)
        error(`last nws axios error after retrying ${retryCount} times was ${err}`)
    }
})

const getForecastUrl = async (lat : number, lon : number) => {
    const url = `https://api.weather.gov/points/${lat},${lon}`;
    const gridResult = await axiosInstance.get(url).catch(
        (        error: { response: { data: { detail: any; }; }; }) => {throw error.response.data.detail});
    if (!gridResult.data || !gridResult.data.properties || !gridResult.data.properties.forecastGridData) {
        warn(`NWS API call returned ${JSON.stringify(gridResult.data.properties)} but no forecast URL`);
        throw Error(`NWS API call for ${lat},${lon} returned no forecast URL`);
    }
    return gridResult.data.properties.forecastGridData;
}

type Summary = {
    coverage:string, 
    intensity:string, 
    weather:string
}
interface ValueType<T> {
    values: Array<{validTime: string, value: T}>
}
interface ForecastGridType {
    data : {
        properties: {
            temperature: ValueType<number>
            apparentTemperature: ValueType<number>
            skyCover: ValueType<number>
            windDirection : ValueType<number>
            windSpeed: ValueType<number>
            windGust: ValueType<number>
            probabilityOfPrecipitation : ValueType<number>
            weather: ValueType<Array<Summary>>
            relativeHumidity : ValueType<number>
        }
    }
}
const findNearestTime = <T>(data : {values: Array<{validTime: string, value: T}>}, 
    time : DateTime, dataType: string) : T => {
    let newerThan = data.values.find(value => {return Interval.fromISO(value.validTime, {setZone:true}).contains(time)});
    if (!newerThan) {
        throw Error(`No matching ${dataType} data for ${time.toString()} in ${JSON.stringify(data.values)}`);
    }
    return newerThan.value;
};

const formatSummary = (summary : Summary) => {
    if (summary.coverage && summary.intensity && summary.weather) {
        if (/chance/.test(summary.coverage)) {
            return `${summary.coverage} of ${summary.intensity} ${summary.weather}`
        } else {
            return `${summary.coverage} ${summary.intensity} ${summary.weather}`
        }
    } else {
        return ""
    }
}

const extractForecast = (forecastGridData : ForecastGridType, currentTime : DateTime) => {
    const temperatureInC = findNearestTime(forecastGridData.data.properties.temperature, currentTime, 'temperature');
    const apparentTemperatureInC = findNearestTime(forecastGridData.data.properties.apparentTemperature, currentTime, 'apparentTemperature');
    const cloudCover = findNearestTime(forecastGridData.data.properties.skyCover, currentTime, 'skyCover');
    const windBearing = findNearestTime(forecastGridData.data.properties.windDirection, currentTime, 'windDirection');
    const windSpeed = findNearestTime(forecastGridData.data.properties.windSpeed, currentTime, 'windSpeed');
    const gust = findNearestTime(forecastGridData.data.properties.windGust, currentTime, 'windGust');
    const precip = findNearestTime(forecastGridData.data.properties.probabilityOfPrecipitation, currentTime, 'probabilityOfPrecipitation');
    let weatherSummary = null
    try {
        const {attributes, visibility, ...summary} = findNearestTime<Array<any>>(forecastGridData.data.properties.weather, currentTime, 'weather')[0];
        weatherSummary = summary
    } catch (err : any) {
        error(`Failed to get weather summary for ${currentTime} - ${JSON.stringify(forecastGridData.data.properties.weather)}`)
    }
    const humidity = findNearestTime(forecastGridData.data.properties.relativeHumidity, currentTime, 'relativeHumidity');
    return {
        temperatureInC:temperatureInC,
        apparentTemperatureInC:apparentTemperatureInC,
        cloudCover:cloudCover,
        windBearing:windBearing,
        windSpeedInKph:windSpeed,
        gustInKph:gust,
        precip:precip,
        summary:weatherSummary,
        humidity:humidity
    }
};

const getForecastFromNws = async (forecastUrl : string) => {
    const forecastGridData = await axiosInstance.get(forecastUrl, 
        { headers: { "User-Agent": '(randoplan.com, randoplan.ltd@gmail.com)' } }).catch(
        (        err: AxiosError) => {
            error(`Failed to get NWS forecast from ${forecastUrl} : ${err.message}`);
            throw Error(`Failed to get NWS forecast from ${forecastUrl} : ${err.message}`);
        }
    );
    return forecastGridData;
};
/* eslint-disable max-params, max-lines-per-function */
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
  * @returns {Promise<{time: *, distance: *, summary: *, precip: string, humidity: number, cloudCover: string, windSpeed: string,
 * lat: *, lon: *, temp: string, fullTime: *, relBearing: null, rainy: boolean, windBearing: number,
 * vectorBearing: *, gust: string} | never>} a promise to evaluate to get the forecast results
 */
const callNWS = async function (lat, lon, currentTime, distance, zone, bearing, getBearingDifference, isControl) {
    const forecastUrl = await getForecastUrl(lat, lon);
    Sentry.setContext('forecastUrl', {'forecastUrl': forecastUrl})
    if (!forecastUrl) {
        Sentry.captureMessage(`NWS forecast url for ${lat} ${lon} was null`)
    }
    const forecastGridData = await getForecastFromNws(forecastUrl);
    const startTime = DateTime.fromISO(currentTime, {zone:zone});
    const forecastValues = extractForecast(forecastGridData, startTime);
    const rainy = forecastValues.precip > 30;
    // eslint-disable-next-line no-mixed-operators
    const temperatureInF = forecastValues.temperatureInC * 9/5 + 32;
    // eslint-disable-next-line no-mixed-operators
    const apparentTemperatureInF = forecastValues.apparentTemperatureInC * 9/5 + 32;
    const windSpeedInMph = forecastValues.windSpeedInKph * 1000/milesToMeters;
    const windGustInMph = forecastValues.gustInKph * 1000/milesToMeters;
    const formattedSummary = forecastValues.summary ? formatSummary(forecastValues.summary) : ''
    return new Promise((resolve) => {resolve({
        'time':currentTime,
        'zone':zone,
        'distance':distance,
        'summary':formattedSummary,
        'precip':`${forecastValues.precip.toFixed(1)}%`,
        'humidity':forecastValues.humidity,
        'cloudCover':`${forecastValues.cloudCover.toFixed(1)}%`,
        'windSpeed':`${Math.round(windSpeedInMph)}`,
        'lat':lat,
        'lon':lon,
        'temp':`${Math.round(temperatureInF)}`,
        'relBearing':getBearingDifference(bearing, forecastValues.windBearing),
        'rainy':rainy,
        'windBearing':Math.round(forecastValues.windBearing),
        'vectorBearing':bearing,
        'gust':`${Math.round(windGustInMph)}`,
        'feel':Math.round(apparentTemperatureInF),
        isControl:isControl
    }
    )
    }
 )
} as WeatherFunc

export default callNWS