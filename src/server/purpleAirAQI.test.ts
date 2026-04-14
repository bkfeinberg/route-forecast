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

jest.spyOn(console, 'warn').mockImplementation(() => {});

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn(),
}));

import getPurpleAirAQI from './purpleAirAQI';

describe('getPurpleAirAQI', () => {
  beforeAll(() => {
    process.env.PURPLE_AIR_KEY = 'test-key';
  });

  beforeEach(() => {
    mockedAxiosInstanceGet.mockReset();
    mockedAxios.get.mockReset();
  });

  test('returns EPA AQI from the closest PurpleAir sensor', async () => {
    mockedAxiosInstanceGet.mockResolvedValue({
      data: {
        fields: ['pm2.5_cf_1', 'humidity', 'latitude', 'longitude'],
        data: [
          [12.0, 50, 41.0, -75.0],
          [8.0, 40, 40.0, -74.95]
        ]
      }
    });

    const result = await getPurpleAirAQI(40, -75, );

    expect(mockedAxiosInstanceGet).toHaveBeenCalledTimes(1);
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('https://api.purpleair.com/v1/sensors?fields=pm2.5_cf_1,ozone1,humidity,latitude,longitude'));
    expect(mockedAxiosInstanceGet.mock.calls[0][0]).toEqual(expect.stringContaining('&api_key=test-key'));
    expect(result).toBe(27);
  });

  test('returns undefined when PurpleAir data is not available for any range', async () => {
    mockedAxiosInstanceGet.mockResolvedValue({
      data: {
        fields: ['pm2.5_cf_1', 'humidity', 'latitude', 'longitude'],
        data: []
      }
    });

    const result = await getPurpleAirAQI(40, -75);

    expect(result).toBeUndefined();
    expect(mockedAxiosInstanceGet).toHaveBeenCalledTimes(6);
  });
});
