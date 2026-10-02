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
import axiosRetry from 'axios-retry';

const mockedAxios = jest.mocked(axios);

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn(),
}));

jest.mock('axios-retry', () => jest.fn());

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

  test('configures retries for rate limits and server errors only', () => {
    const retryOptions = (axiosRetry as jest.Mock).mock.calls[0][1];
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    expect(retryOptions.retryCondition({ response: { status: 501 } })).toBe(true);
    expect(retryOptions.retryCondition({ response: { status: 429 } })).toBe(true);
    expect(retryOptions.retryCondition({ response: { status: 400 } })).toBe(false);
    expect(retryOptions.retryCondition(new Error('network error'))).toBe(false);
    expect(Sentry.captureMessage).toHaveBeenNthCalledWith(
      1,
      'Error object reported to OneCall was missing the response'
    );
    expect(Sentry.captureMessage).toHaveBeenNthCalledWith(
      2,
      'Defective error object from OneCall:{}'
    );

    retryOptions.onRetry(1, {}, { url: 'https://example.test' });
    retryOptions.onMaxRetryTimesExceeded(new Error('exhausted'));
    expect(logSpy).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });

  test.each([
    [{ response: { data: { message: 'OpenWeather unavailable' } } }, 'OpenWeather unavailable'],
    [new Error('Network unavailable'), 'Network unavailable'],
  ])('normalizes Axios rejection errors', async (error, expectedMessage) => {
    mockedAxios.get.mockRejectedValue(error);

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
    )).rejects.toThrow(expectedMessage);
  });

  test('maps a dry non-rain response', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [
          {
            dt: 1748793600,
            wind_deg: 180,
            temp: 64,
            humidity: 40,
            feels_like: 62,
            wind_gust: 7,
            clouds: 0,
            wind_speed: 4,
            weather: [{ main: 'Clear', description: 'clear sky' }]
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
      () => -120,
      false,
      'en'
    );

    expect(result).toMatchObject({
      precip: '0%',
      rainy: false,
      summary: 'clear sky',
      relBearing: -120,
      isControl: false
    });
  });
});
