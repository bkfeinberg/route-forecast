const mockGet = jest.fn();
const mockAxiosInstance = {
  get: mockGet,
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token')
}));

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn()
}));

import axios from 'axios';
import Sentry from '@sentry/node';
import callWeatherKit from './weatherKit';

type MockAxios = {
  create: jest.Mock;
};

describe('callWeatherKit', () => {
  const mockAxios = axios as unknown as MockAxios;

  beforeAll(() => {
    process.env.WEATHERKIT_KEY = 'test-key';
    mockAxios.create.mockReturnValue(mockAxiosInstance);
  });

  beforeEach(() => {
    mockGet.mockReset();
    (Sentry.setContext as jest.Mock).mockClear();
    (Sentry.captureException as jest.Mock).mockClear();
  });

  test('fetches WeatherKit data and maps it to forecast fields', async () => {
    mockGet.mockResolvedValue({
      data: {
        currentWeather: {
          asOf: '2025-06-01T12:00:00Z',
          windDirection: 135,
          conditionCode: 'Rain',
          temperature: 20,
          cloudCover: 0.75,
          windSpeed: 5,
          windGust: 10,
          temperatureApparent: 22,
        },
        forecastHourly: {
          hours: [
            {
              precipitationChance: 0.25,
              humidity: 0.6,
              windGust: 10,
            }
          ]
        }
      }
    });

    const result = await callWeatherKit(
      40,
      -75,
      '2025-06-01T12:00:00Z',
      42,
      'America/New_York',
      90,
      () => 10,
      true,
      'en'
    );

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      'https://weatherkit.apple.com/api/v1/weather/en/40/-75?timezone=America/New_York&dataSets=currentWeather,forecastHourly,forecastNextHour,&countryCode=US&currentAsOf=2025-06-01T12:00:00Z&hourlyStart=2025-06-01T12:00:00Z&hourlyEnd=2025-06-01T13:00:00Z',
      { headers: { Authorization: 'Bearer signed-token' } }
    );

    expect(result).toMatchObject({
      distance: 42,
      summary: 'Rain',
      precip: '25.0%',
      humidity: 60,
      cloudCover: '75.0%',
      windSpeed: '3',
      lat: 40,
      lon: -75,
      temp: '68',
      relBearing: 10,
      rainy: true,
      windBearing: 135,
      vectorBearing: 90,
      gust: '6',
      feel: 72,
      isControl: true,
    });
  });

  test('captures exception and rethrows when axios request fails', async () => {
    const error = new Error('network failure');
    mockGet.mockRejectedValue(error);

    await expect(callWeatherKit(
      40,
      -75,
      '2025-06-01T12:00:00Z',
      42,
      'America/New_York',
      90,
      () => 10,
      false,
      'en'
    )).rejects.toThrow('network failure');

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  test('returns <unavailable> for gust when windGust is undefined', async () => {
    mockGet.mockResolvedValue({
      data: {
        currentWeather: {
          asOf: '2025-06-01T12:00:00Z',
          windDirection: 135,
          conditionCode: 'Cloudy',
          temperature: 15,
          cloudCover: 0.25,
          windSpeed: 4,
          temperatureApparent: 15,
        },
        forecastHourly: {
          hours: [
            {
              precipitationChance: 0,
              humidity: 0.5,
            }
          ]
        }
      }
    });

    const result = await callWeatherKit(
      40,
      -75,
      '2025-06-01T12:00:00Z',
      42,
      'America/New_York',
      270,
      () => 0,
      false,
      'en'
    );

    expect(result.gust).toBe('<unavailable>');
    expect(result.summary).toBe('Cloudy');
  });
});
