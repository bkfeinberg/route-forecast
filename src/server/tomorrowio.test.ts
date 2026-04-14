jest.mock('axios', () => {
  const axios = jest.requireActual('axios');
  const mockedInstanceGet = jest.fn();
  axios.create = jest.fn(() => ({
    get: mockedInstanceGet,
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
const mockedAxiosInstanceGet = (axios.create as jest.Mock).mock.results[0]?.value?.get as jest.Mock<any, any>;

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
    fmt: jest.fn()
  }
}));

import Sentry from '@sentry/node';
import callTomorrowIo from './tomorrowio';

describe('callTomorrowIo', () => {
  beforeAll(() => {
    process.env.CLIMACELL_KEY = 'test-key';
  });

  beforeEach(() => {
    mockedAxiosInstanceGet.mockReset();
    mockedAxios.get.mockReset();
    (Sentry.setContext as jest.Mock).mockClear();
    (Sentry.captureMessage as jest.Mock).mockClear();
  });

  test('fetches Tomorrow.io forecast and maps the response fields', async () => {
    mockedAxiosInstanceGet.mockResolvedValue({
      data: {
        data: {
          timelines: [
            {
              intervals: [
                {
                  startTime: '2099-06-01T12:00:00Z',
                  values: {
                    windSpeed: 8.4,
                    precipitationProbability: 10,
                    windDirection: 180,
                    temperature: 75.2,
                    temperatureApparent: 77.1,
                    windGust: 14.9,
                    cloudCover: 12.5,
                    precipitationType: 0,
                    weatherCode: 1000,
                    humidity: 45,
                    epaIndex: 12
                  }
                }
              ]
            }
          ]
        }
      }
    });

    const result = await callTomorrowIo(
      40,
      -75,
      '2099-06-01T12:00:00',
      42,
      'UTC',
      90,
      () => 20,
      false, "en"
    );

    expect(mockedAxiosInstanceGet).toHaveBeenCalledTimes(1);
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('https://api.tomorrow.io/v4/timelines?location=40,-75'));
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('&apikey=test-key'));

    expect(result).toMatchObject({
      distance: 42,
      summary: 'Clear',
      precip: '10.0%',
      humidity: 45,
      cloudCover: '12.5%',
      windSpeed: '8',
      lat: 40,
      lon: -75,
      temp: '75',
      relBearing: 20,
      rainy: false,
      windBearing: 180,
      vectorBearing: 90,
      gust: '15',
      feel: 77,
      aqi: 12,
      isControl: false
    });
  });

  test('returns <unavailable> fields when wind and precip values are missing', async () => {
    mockedAxiosInstanceGet.mockResolvedValue({
      data: {
        data: {
          timelines: [
            {
              intervals: [
                {
                  startTime: '2099-06-01T12:00:00Z',
                  values: {
                    temperature: 60.4,
                    weatherCode: 1001,
                    humidity: 55
                  }
                }
              ]
            }
          ]
        }
      }
    });

    const result = await callTomorrowIo(
      40,
      -75,
      '2099-06-01T12:00:00',
      10,
      'UTC',
      180,
      () => 0,
      true, "en"
    );

    expect(result.windSpeed).toBe('<unavailable>');
    expect(result.gust).toBe('<unavailable>');
    expect(result.cloudCover).toBe('<unavailable>');
    expect(result.precip).toBe('<unavailable>');
    expect(result.feel).toBe('60');
    expect(result.summary).toBe('Cloudy');
    expect(result.isControl).toBe(true);
  });
});
