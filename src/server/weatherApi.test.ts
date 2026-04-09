jest.mock('axios');
import axios from 'axios';

const mockedAxios = jest.mocked(axios);

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn(),
}));

import Sentry from '@sentry/node';
import callWeatherApi from './weatherApi';

describe('callWeatherApi', () => {
  beforeAll(() => {
    process.env.WEATHER_API_KEY = 'test-key';
  });

  beforeEach(() => {
    mockedAxios.get.mockReset();
    (Sentry.setContext as jest.Mock).mockClear();
    (Sentry.captureMessage as jest.Mock).mockClear();
  });

  test('fetches WeatherAPI forecast and maps the response fields', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        current: {
          air_quality: { pm2_5: 7.3 }
        },
        forecast: {
          forecastday: [
            {
              hour: [
                {
                  time_epoch: 4722504000,
                  condition: { text: 'Sunny' },
                  chance_of_rain: 10,
                  humidity: 45,
                  cloud: 12.5,
                  wind_mph: 8.4,
                  wind_degree: 180,
                  gust_mph: 14.9,
                  temp_f: 75.2,
                  feelslike_f: 77.1,
                  will_it_rain: 0,
                }
              ]
            }
          ]
        }
      }
    });

    const result = await callWeatherApi(
      40,
      -75,
      '2099-06-01T12:00:00Z',
      42,
      'UTC',
      90,
      () => 20,
      false,
      'en'
    );

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.weatherapi.com/v1/forecast.json?key=test-key&q=40,-75&days=1&hour=12&lang=en&aqi=yes&dt=2099-06-01'
    );

    expect(result).toMatchObject({
      distance: 42,
      summary: 'Sunny',
      precip: '10%',
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
      aqi: 7.3,
      isControl: false,
    });
  });

  test('returns <unavailable> for missing wind and gust values', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        current: {
          air_quality: {}
        },
        forecast: {
          forecastday: [
            {
              hour: [
                {
                  time_epoch: 4722504000,
                  condition: { text: 'Overcast' },
                  humidity: 55,
                  wind_degree: 90,
                  temp_f: 60,
                  will_it_rain: 1,
                }
              ]
            }
          ]
        }
      }
    });

    const result = await callWeatherApi(
      40,
      -75,
      '2099-06-01T12:00:00Z',
      42,
      'UTC',
      180,
      () => 0,
      true,
      'en'
    );

    expect(result.windSpeed).toBe('<unavailable>');
    expect(result.gust).toBe('<unavailable>');
    expect(result.cloudCover).toBe('<unavailable>');
    expect(result.precip).toBe('<unavailable>');
    expect(result.feel).toBe(60);
  });

  test('throws a formatted error when WeatherAPI returns an error payload', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        error: { code: 1006, message: 'No location found.' }
      }
    });

    await expect(callWeatherApi(
      40,
      -75,
      '2099-06-01T12:00:00Z',
      42,
      'UTC',
      180,
      () => 0,
      false,
      'en'
    )).rejects.toThrow('No location found.');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('WeatherAPI error No location found.', 'error');
  });
});
