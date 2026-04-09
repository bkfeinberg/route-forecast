import callOpenMeteo from './openmeteo';
import { fetchWeatherApi } from 'openmeteo';

jest.mock('openmeteo', () => ({
  fetchWeatherApi: jest.fn()
}));

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn()
}));

import Sentry from '@sentry/node';

const mockFetchWeatherApi = jest.mocked(fetchWeatherApi);
const mockSetContext = jest.mocked(Sentry.setContext);
const mockCaptureException = jest.mocked(Sentry.captureException);

describe('callOpenMeteo', () => {
  beforeEach(() => {
    mockFetchWeatherApi.mockReset();
    mockSetContext.mockClear();
    mockCaptureException.mockClear();
  });

  test('fetches OpenMeteo data and maps it to forecast fields', async () => {
    // Mock the response structure
    const mockResponse = {
      timezone: jest.fn(() => 'America/New_York'),
      hourly: jest.fn(() => ({
        time: jest.fn(() => 1712572800), // Some timestamp
        timeEnd: jest.fn(() => 1712572800 + 3600), // +1 hour
        interval: jest.fn(() => 3600), // 1 hour
        variables: jest.fn((index) => {
          const data = [
            [20, 22], // temperature_2m
            [75, 80], // cloud_cover
            [25, 30], // precipitation_probability
            [22, 24], // apparent_temperature
            [10, 12], // wind_gusts_10m
            [5, 6], // wind_speed_10m
            [60, 65], // relative_humidity_2m
            [61, 63], // weather_code (rain)
            [135, 140] // wind_direction_10m
          ];
          return {
            valuesArray: jest.fn(() => data[index])
          };
        })
      })),
      latitude: 40,
      longitude: -75,
      generationTimeMs: 10,
      utcOffsetSeconds: -14400,
      hourlyUnits: {}
    } as any;

    mockFetchWeatherApi.mockResolvedValue([mockResponse]);

    const result = await callOpenMeteo(
      40,
      -75,
      '2024-04-08T12:00:00',
      42,
      'America/New_York',
      90,
      () => 10,
      true,
      'en'
    );

    expect(mockFetchWeatherApi).toHaveBeenCalledTimes(1);
    expect(mockFetchWeatherApi).toHaveBeenCalledWith(
      "https://api.open-meteo.com/v1/forecast",
      {
        latitude: 40,
        longitude: -75,
        hourly: ["temperature_2m", "cloud_cover", "precipitation_probability", "apparent_temperature", "wind_gusts_10m", "wind_speed_10m", "relative_humidity_2m", "weather_code", "wind_direction_10m"],
        timezone: "auto",
        wind_speed_unit: "mph",
        temperature_unit: "fahrenheit",
        start_date: '2024-04-08',
        end_date: '2024-04-09',
      },
      4,
      0.3,
      3
    );

    expect(result).toMatchObject({
      distance: 42,
      summary: 'Rain: Slight, moderate and heavy intensity',
      precip: '25.0%',
      humidity: 60,
      cloudCover: '75.0%',
      windSpeed: '5',
      lat: 40,
      lon: -75,
      temp: '20',
      relBearing: 10,
      rainy: true,
      windBearing: 135,
      vectorBearing: 90,
      gust: '10',
      feel: 22,
      isControl: true,
    });
  });

});