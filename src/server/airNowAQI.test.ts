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
}));

process.env.AIRNOW_KEY = 'test-key';

import getAirNowAQI from './airNowAQI';

describe('getAirNowAQI', () => {

  beforeEach(() => {
    mockedAxiosInstanceGet.mockReset();
    mockedAxios.get.mockReset();
  });

  test('returns last PM2.5 AQI from AirNow results', async () => {
    mockedAxiosInstanceGet.mockResolvedValue({
      data: [
        { parameterName: 'PM2.5', aqi: -1 },
        { parameterName: 'PM2.5', aqi: 50 },
        { parameterName: 'O3', aqi: 10 },
        { parameterName: 'PM2.5', aqi: 60 }
      ]
    });

    const result = await getAirNowAQI(40, -75);

    expect(mockedAxiosInstanceGet).toHaveBeenCalledTimes(1);
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('&latitude=40'));
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('&longitude=-75'));
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('API_KEY='));
    expect(result).toBe(60);
  });

  test('returns undefined when AirNow returns empty data', async () => {
    mockedAxiosInstanceGet.mockResolvedValue({ data: [] });

    const result = await getAirNowAQI(40, -75);

    expect(result).toBeUndefined();
  });

  test('returns undefined when axios request fails', async () => {
    mockedAxiosInstanceGet.mockRejectedValue(new Error('network'));

    const result = await getAirNowAQI(40, -75);

    expect(result).toBeUndefined();
    expect(mockedAxiosInstanceGet).toHaveBeenCalledTimes(1);
  });
});
