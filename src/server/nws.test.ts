jest.mock('axios', () => {
  const axios = jest.requireActual('axios');
  const mockedAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    defaults: {},
    request: jest.fn()
  };
  axios.create = jest.fn(() => mockedAxiosInstance);
  axios.get = jest.fn();
  (axios as any).mockedAxiosInstance = mockedAxiosInstance;
  return axios;
});
import axios from 'axios';
import axiosRetry from 'axios-retry';

const mockedAxios = jest.mocked(axios);
const mockedAxiosInstance = (axios as any).mockedAxiosInstance as { get: jest.Mock<any, any> };

jest.mock('axios-retry', () => {
  const mockedRetry = jest.fn() as jest.Mock & { exponentialDelay: jest.Mock };
  mockedRetry.exponentialDelay = jest.fn(() => 100);
  return mockedRetry;
});

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn(),
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn(),
  }
}));

import Sentry from '@sentry/node';
import callNWS from './nws';

const validTime = '2099-06-01T12:00:00Z/PT1H';

const makeForecastGridData = (
  weather: Array<Record<string, string>> = [
    { coverage: 'chance', intensity: 'moderate', weather: 'rain', attributes: '', visibility: '' }
  ],
  weatherValidTime = validTime
) => ({
  properties: {
    temperature: { values: [{ validTime, value: 20 }] },
    apparentTemperature: { values: [{ validTime, value: 18 }] },
    skyCover: { values: [{ validTime, value: 40 }] },
    windDirection: { values: [{ validTime, value: 135 }] },
    windSpeed: { values: [{ validTime, value: 20 }] },
    windGust: { values: [{ validTime, value: 25 }] },
    probabilityOfPrecipitation: { values: [{ validTime, value: 45 }] },
    weather: { values: [{ validTime: weatherValidTime, value: weather }] },
    relativeHumidity: { values: [{ validTime, value: 70 }] }
  }
});

const mockNwsResponses = (
  weather?: Array<Record<string, string>>,
  weatherValidTime?: string
) => {
  mockedAxiosInstance.get.mockResolvedValueOnce({
    data: { properties: { forecastGridData: 'https://api.weather.gov/grid/forecast' } }
  });
  mockedAxiosInstance.get.mockResolvedValueOnce({
    data: makeForecastGridData(weather, weatherValidTime)
  });
};

const callNwsWithDefaults = () => callNWS(
  40,
  -75,
  '2099-06-01T12:00:00Z',
  42,
  'UTC',
  90,
  () => 30,
  false,
  'en'
);

describe('callNWS', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxiosInstance.get.mockReset();
    (axios.create as jest.Mock).mockClear();
    (Sentry.setContext as jest.Mock).mockClear();
    (Sentry.captureMessage as jest.Mock).mockClear();
  });

  test('fetches NWS forecast and maps the response fields', async () => {
    const mockedAxiosInstanceGet = mockedAxiosInstance.get as jest.Mock<any, any>;
    mockNwsResponses();

    const result = await callNWS(
      40,
      -75,
      '2099-06-01T12:00:00Z',
      42,
      'UTC',
      90,
      () => 30,
      false,
      "en"
    );

    expect(mockedAxiosInstanceGet).toHaveBeenCalledTimes(2);
    expect(mockedAxiosInstanceGet).toHaveBeenCalledWith('https://api.weather.gov/points/40,-75');
    expect(mockedAxiosInstanceGet).toHaveBeenCalledWith(
      'https://api.weather.gov/grid/forecast',
      { headers: { 'User-Agent': '(randoplan.com, randoplan.ltd@gmail.com)' } }
    );

    expect(result).toMatchObject({
      distance: 42,
      summary: 'chance of moderate rain',
      precip: '45.0%',
      humidity: 70,
      cloudCover: '40.0%',
      windSpeed: '12',
      lat: 40,
      lon: -75,
      temp: '68',
      relBearing: 30,
      rainy: true,
      windBearing: 135,
      vectorBearing: 90,
      gust: '16',
      feel: 64,
      isControl: false,
      time: '2099-06-01T12:00:00Z',
      zone: 'UTC'
    });
  });

  test('throws when NWS point lookup returns no forecast URL', async () => {
    const mockedAxiosInstanceGet = mockedAxiosInstance.get as jest.Mock<any, any>;
    mockedAxiosInstanceGet.mockResolvedValueOnce({
      data: {
        properties: {}
      }
    });

    await expect(callNWS(
      40,
      -75,
      '2099-06-01T12:00:00Z',
      42,
      'UTC',
      0,
      () => 0,
      false,
      "en"
    )).rejects.toThrow('NWS API call for 40,-75 returned no forecast URL');
  });

  test('retries selected NWS responses and reports retry events', () => {
    const retryOptions = (axiosRetry as jest.Mock).mock.calls[0][1];
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    for (const status of [500, 503, 504, 404]) {
      expect(retryOptions.retryCondition({ message: 'request failed', response: { status } })).toBe(true);
    }
    expect(retryOptions.retryCondition({ message: 'bad request', response: { status: 400 } })).toBe(false);
    expect(retryOptions.retryCondition(new Error('network error'))).toBe(false);
    expect(retryOptions.retryDelay(1, {})).toBe(100);

    retryOptions.onRetry(1, new Error('temporary'), { url: 'https://api.weather.gov' });
    retryOptions.onMaxRetryTimesExceeded(new Error('exhausted'), 3);
    expect(logSpy).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });

  test('throws the point lookup detail when the NWS request fails', async () => {
    mockedAxiosInstance.get.mockRejectedValueOnce({
      response: { data: { detail: 'Point not found' } }
    });

    await expect(callNwsWithDefaults()).rejects.toBe('Point not found');
  });

  test('wraps errors from the forecast grid request', async () => {
    mockedAxiosInstance.get.mockResolvedValueOnce({
      data: { properties: { forecastGridData: 'https://api.weather.gov/grid/forecast' } }
    });
    mockedAxiosInstance.get.mockRejectedValueOnce(new Error('upstream timeout'));

    await expect(callNwsWithDefaults()).rejects.toThrow(
      'Failed to get NWS forecast from https://api.weather.gov/grid/forecast : upstream timeout'
    );
  });

  test.each([
    [[{ coverage: 'Areas', intensity: 'light', weather: 'rain' }], validTime, 'Areas light rain'],
    [[{}], validTime, ''],
    [[{ coverage: 'chance', intensity: 'moderate', weather: 'rain' }], '2099-06-01T14:00:00Z/PT1H', '']
  ])('formats available weather summaries and falls back when missing', async (weather, weatherTime, expectedSummary) => {
    mockNwsResponses(weather, weatherTime);

    const result = await callNwsWithDefaults();

    expect(result.summary).toBe(expectedSummary);
  });
});
