import { DateTime } from "luxon";
import { WeatherFunc } from "./weatherForecastDispatcher.js";
import { fetchWeatherApi } from "openmeteo";
import * as Sentry from "@sentry/node";

const findClosestDateTimeIndex = (sortedDates: DateTime[], targetDate: DateTime) => {
    if (sortedDates.length === 0) {
        return -1;
    }

    // Use reduce to iterate and find the closest date
    const closestIndex = sortedDates.reduce((closestIdx, currentDate, currentIndex) => {
        // Calculate the absolute difference in milliseconds for the current date
        const currentDiff = Math.abs(currentDate.valueOf() - targetDate.valueOf());

        // Calculate the absolute difference in milliseconds for the previously considered closest date
        const closestDate = sortedDates[closestIdx];
        const closestDiff = Math.abs(closestDate.valueOf() - targetDate.valueOf());

        // If the current date is closer to the target date, update the closest index
        if (currentDiff < closestDiff) {
            return currentIndex;
        }

        return closestIdx;
    }, 0); // Start with the first index as the initial closest

    return closestIndex;
}

const makeWmoTable = () => {
    const wmoCodes = new Map();

    // Helper function to map multiple codes to a single description
    function addMapping(codes: number[], description: string) {
        codes.forEach((code: number) => {
            wmoCodes.set(code, description);
        });
    }


    addMapping([0], 'Clear sky');
    addMapping([1, 2, 3], 'Mainly clear, partly cloudy, and overcast');
    addMapping([45, 48], 'Fog and depositing rime fog');
    addMapping([51, 53, 55], 'Drizzle: Light, moderate, and dense intensity');
    addMapping([56, 57], 'Freezing Drizzle: Light and dense intensity');
    addMapping([61, 63, 65], 'Rain: Slight, moderate and heavy intensity');
    addMapping([66, 67], 'Freezing Rain: Light and heavy intensity');
    addMapping([71, 73, 75], 'Snow fall: Slight, moderate, and heavy intensity');
    addMapping([77], 'Snow grains');
    addMapping([80, 81, 82], 'Rain showers: Slight, moderate, and violent');
    addMapping([85, 86], 'Snow showers slight and heavy');
    addMapping([95], 'Thunderstorm: Slight or moderate');
    addMapping([96, 99], 'Thunderstorm with slight and heavy hail');

    return wmoCodes;
}
// Example usage:
// const code = 80;
// console.log(`Weather for code ${code}: ${wmoCodes.get(code)}`); // Output: Weather for code 80: Rain showers: Slight, moderate, and violent

// Map WMO codes to descriptions (based on WMO FM-94 BUFR/Open-Meteo interpretation)

const wmoTable = makeWmoTable();
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
const callOpenMeteo = async function (lat : number, lon : number, currentTime : string, 
    distance : number, zone : string, bearing : number, 
    getBearingDifference : (bearing: number, windBearing: number) => number, 
    isControl : boolean, lang: string) {
    if (typeof lat !== 'number' || lat < -90 || lat > 90 || isNaN(lat)) {
        throw new Error('Invalid latitude value');
    }
    if (typeof lon !== 'number' || lon < -180 || lon > 180 || isNaN(lon)) {
        throw new Error('Invalid longitude value');
    }
    const startTime = DateTime.fromISO(currentTime, {zone:zone});
    const params = {
        latitude: lat,
        longitude: lon,
        hourly: ["temperature_2m", "cloud_cover", "precipitation_probability", "apparent_temperature", "wind_gusts_10m", "wind_speed_10m", "relative_humidity_2m", "weather_code", "wind_direction_10m"],
        timezone: "auto",
        wind_speed_unit: "mph",
        temperature_unit: "fahrenheit",
        start_date: startTime.toISODate(),
        end_date: startTime.plus({days:1}).toISODate(),
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params, 4, 0.3, 3);
    const response = responses[0];      // first and only location

    // const latitude = response.latitude();
    // const longitude = response.longitude();
    const timezone = response.timezone();
    const hourly = response.hourly()!;

    // Note: The order of weather variables in the URL query and the indices below need to match!
    const weatherData = {
        hourly: {
            time: Array.from(
                { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
                (_, i) => DateTime.fromSeconds((Number(hourly.time()) + i * hourly.interval()), {zone: timezone||undefined})
            ),
            temperature_2m: hourly.variables(0)!.valuesArray(),
            cloud_cover: hourly.variables(1)!.valuesArray(),
            precipitation_probability: hourly.variables(2)!.valuesArray(),
            apparent_temperature: hourly.variables(3)!.valuesArray(),
            wind_gusts_10m: hourly.variables(4)!.valuesArray(),
            wind_speed_10m: hourly.variables(5)!.valuesArray(),
            relative_humidity_2m: hourly.variables(6)!.valuesArray(),
            weather_code: hourly.variables(7)!.valuesArray(),
		    wind_direction_10m: hourly.variables(8)!.valuesArray(),
        },
    };
    const matchingForecastIndex = findClosestDateTimeIndex(weatherData.hourly.time, startTime);
    if (matchingForecastIndex === -1) {
        throw new Error('No matching forecast data found for the specified time');
    }
    const now = weatherData.hourly.time[matchingForecastIndex]
    const windBearing = weatherData.hourly.wind_direction_10m![matchingForecastIndex];
    const relativeBearing = getBearingDifference(bearing, windBearing)
    const precip = weatherData.hourly.precipitation_probability![matchingForecastIndex];
    const temperature = weatherData.hourly.temperature_2m![matchingForecastIndex];
    const windSpeed = weatherData.hourly.wind_speed_10m![matchingForecastIndex];
    const cloudCover = weatherData.hourly.cloud_cover![matchingForecastIndex];
    const humidity = weatherData.hourly.relative_humidity_2m![matchingForecastIndex];
    const gusts = weatherData.hourly.wind_gusts_10m![matchingForecastIndex];
    const feelsLike = weatherData.hourly.apparent_temperature![matchingForecastIndex];

    const isoTime = now.toISO()
    return new Promise((resolve) => {resolve({
        'time':isoTime?isoTime:'N/A',
        zone:zone,
        'distance':distance,
        'summary':wmoTable.get(weatherData.hourly.weather_code![matchingForecastIndex]),
        'precip':`${precip.toFixed(1)}%`,
        'humidity':Math.round(humidity),
        'cloudCover':`${cloudCover.toFixed(1)}%`,
        'windSpeed':`${Math.round(windSpeed)}`,
        'lat':lat,
        'lon':lon,
        'temp':`${Math.round(temperature)}`,
        'relBearing':relativeBearing,
        'rainy':precip > 20,
        'windBearing':Math.round(windBearing),
        'vectorBearing':bearing,
        'gust':`${Math.round(gusts)}`,
        'feel':Math.round(feelsLike),
        isControl:isControl
    })})
} as WeatherFunc;

export default callOpenMeteo;