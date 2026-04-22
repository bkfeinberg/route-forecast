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

const mockedAxios = jest.mocked(axios);
const mockedAxiosInstance = (axios as any).mockedAxiosInstance as { get: jest.Mock<any, any> };

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
    mockedAxiosInstanceGet.mockResolvedValueOnce({
      data: {
        properties: {
          forecastGridData: 'https://api.weather.gov/grid/forecast'
        }
      }
    });

    mockedAxiosInstanceGet.mockResolvedValueOnce({
      data: {
        properties: {
          temperature: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 20 }
            ]
          },
          apparentTemperature: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 18 }
            ]
          },
          skyCover: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 40 }
            ]
          },
          windDirection: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 135 }
            ]
          },
          windSpeed: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 20 }
            ]
          },
          windGust: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 25 }
            ]
          },
          probabilityOfPrecipitation: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 45 }
            ]
          },
          weather: {
            values: [
              {
                validTime: '2099-06-01T12:00:00Z/PT1H',
                value: [
                  {
                    coverage: 'chance',
                    intensity: 'moderate',
                    weather: 'rain',
                    attributes: {},
                    visibility: 0
                  }
                ]
              }
            ]
          },
          relativeHumidity: {
            values: [
              { validTime: '2099-06-01T12:00:00Z/PT1H', value: 70 }
            ]
          }
        }
      }
    });

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
});
