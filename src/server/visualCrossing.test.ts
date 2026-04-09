jest.mock('axios');
import axios from 'axios';

const mockedAxios = jest.mocked(axios);

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  setContext: jest.fn(),
}));

import Sentry from '@sentry/node';
import callVisualCrossing from './visualCrossing';

describe('callVisualCrossing', () => {
  beforeAll(() => {
    process.env.VISUAL_CROSSING_KEY = 'test-key';
  });

  beforeEach(() => {
    mockedAxios.get.mockReset();
    (Sentry.captureMessage as jest.Mock).mockClear();
    (Sentry.setContext as jest.Mock).mockClear();
  });

  test('fetches Visual Crossing data and maps response fields', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        currentConditions: {
          datetimeEpoch: 1748779800,
          windspeed: 7.2,
          winddir: 200,
          humidity: 64.3,
          cloudcover: 10,
          precip: 0,
          precipprob: 5,
          temp: 66.7,
          windgust: 12.1,
          feelslike: 65.4,
          temperature: 66.7,
        },
        days: [
          { conditions: 'Clear' }
        ]
      }
    });

    const result = await callVisualCrossing(
      40,
      -75,
      '2025-06-01T12:10:00Z',
      42,
      'UTC',
      90,
      () => 20,
      false,
      'en'
    );

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/40,-75/1748779800?unitGroup=us&include=current&options=nonulls&lang=en&key=test-key'
    );

    expect(result).toMatchObject({
      distance: 42,
      summary: 'Clear',
      precip: '5.0%',
      humidity: 64,
      cloudCover: '10.0%',
      windSpeed: '7',
      lat: 40,
      lon: -75,
      temp: '67',
      relBearing: 20,
      rainy: false,
      windBearing: 200,
      vectorBearing: 90,
      gust: '12',
      feel: 65,
      isControl: false,
    });
  });

  test('uses windspeed as gust when windgust is undefined', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        currentConditions: {
          datetimeEpoch: 1748779800,
          windspeed: 10.4,
          winddir: 180,
          humidity: 55,
          cloudcover: undefined,
          precip: 0,
          precipprob: undefined,
          temp: 60,
          windgust: undefined,
          feelslike: undefined,
          temperature: 60,
        },
        days: [
          { conditions: 'Overcast' }
        ]
      }
    });

    const result = await callVisualCrossing(
      40,
      -75,
      '2025-06-01T12:10:00Z',
      42,
      'UTC',
      180,
      () => 0,
      true,
      'en'
    );

    expect(result.gust).toBe('10');
    expect(result.cloudCover).toBe('<unavailable>');
    expect(result.precip).toBe('0.0%');
    expect(result.feel).toBe(60);
  });

  test('throws when no current conditions are returned', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        currentConditions: undefined,
        days: [{ conditions: 'Fog' }]
      }
    });

    await expect(callVisualCrossing(
      40,
      -75,
      '2025-06-01T12:10:00Z',
      42,
      'UTC',
      180,
      () => 0,
      false,
      'en'
    )).rejects.toThrow('No current conditions');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Throwing error because no current conditions were returned', 'error');
  });
});
