jest.mock('axios', () => {
  const axios = jest.requireActual('axios');
  axios.create = jest.fn(() => ({
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    defaults: {},
    request: jest.fn()
  }));
  axios.get = jest.fn();
  return axios;
});
import axios from 'axios';

const mockedAxios = jest.mocked(axios);

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn(),
}));

import Sentry from '@sentry/node';
import callOneCall from './oneCall';

describe('callOneCall', () => {
  beforeAll(() => {
    process.env.OPEN_WEATHER_KEY = 'test-key';
  });

  beforeEach(() => {
    mockedAxios.get.mockReset();
    (Sentry.setContext as jest.Mock).mockClear();
    (Sentry.captureMessage as jest.Mock).mockClear();
  });

  test('fetches OpenWeather timemachine data and maps it to forecast fields', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [
          {
            dt: 1748793600,
            wind_deg: 300,
            temp: 68.3,
            humidity: 55,
            feels_like: 70.1,
            wind_gust: 18.7,
            rain: '1',
            clouds: 42,
            wind_speed: 12.4,
            weather: [
              {
                main: 'Rain',
                description: 'light rain'
              }
            ]
          }
        ]
      }
    });

    const result = await callOneCall(
      40,
      -75,
      '2025-06-01T12:00:00',
      42,
      'America/New_York',
      90,
      () => 45,
      true,
      'en'
    );

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=40&lon=-75&units=imperial&dt=1748793600&appid=test-key&lang=en'
    );

    expect(result).toMatchObject({
      distance: 42,
      summary: 'light rain',
      precip: '100%',
      humidity: 55,
      cloudCover: '42.0%',
      windSpeed: '12',
      lat: 40,
      lon: -75,
      temp: '68',
      relBearing: 45,
      rainy: true,
      windBearing: 300,
      vectorBearing: 90,
      gust: '19',
      feel: 70,
      isControl: true,
    });
  });

  test('throws a formatted error when OpenWeather returns an error payload', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        error: { code: 401, message: 'Invalid API key.' }
      }
    });

    await expect(callOneCall(
      40,
      -75,
      '2025-06-01T12:00:00',
      42,
      'America/New_York',
      90,
      () => 0,
      false,
      'en'
    )).rejects.toThrow('Invalid API key.');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('OneCall error Invalid API key.', 'error');
  });
});
