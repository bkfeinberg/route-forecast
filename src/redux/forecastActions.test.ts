jest.mock('@sentry/react', () => ({
  captureMessage: jest.fn(),
  metrics: { count: jest.fn() },
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

jest.mock('react-ga4', () => ({
  event: jest.fn()
}));

jest.mock('../utils/routeUtils', () => ({
  getForecastRequest: jest.fn()
}));

jest.mock('./dialogParamsSlice', () => ({
  forecastFetchBegun: jest.fn(() => ({ type: 'dialogParams/forecastFetchBegun' })),
  errorMessageListSet: jest.fn((payload: any) => ({ type: 'dialogParams/errorMessageListSet', payload })),
  errorMessageListAppend: jest.fn((payload: any) => ({ type: 'dialogParams/errorMessageListAppend', payload }))
}));

jest.mock('./forecastSlice', () => ({
  forecastFetched: jest.fn((payload: any) => ({ type: 'forecast/forecastFetched', payload })),
  forecastAppended: jest.fn((payload: any) => ({ type: 'forecast/forecastAppended', payload })),
  forecastInvalidated: jest.fn(() => ({ type: 'forecast/forecastInvalidated' })),
  Forecast: jest.fn()
}));

import { cancelForecast, msgFromError, errorDetails, removeDuplicateForecasts, extractRejectedResults, getDaysInFuture, forecastWithHook } from './forecastActions';
import { getForecastRequest } from '../utils/routeUtils';
import * as Sentry from '@sentry/react';
import * as ReactGA from 'react-ga4';
import { forecastFetchBegun, errorMessageListSet, errorMessageListAppend } from './dialogParamsSlice';
import { forecastFetched, forecastAppended, forecastInvalidated } from './forecastSlice';

const mockDispatch = jest.fn();
const mockGetState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockDispatch.mockClear();
  mockGetState.mockClear();
});

describe('forecastActions', () => {
  describe('msgFromError', () => {
    it('returns details from error.reason.data.details and counts it in Sentry metrics', () => {
      const error = { reason: { data: { details: 'Service unavailable', which: 1 } } };

      const result = msgFromError(error, 'openWeather', 'forecast');

      expect(result).toBe('Service unavailable');
      expect(Sentry.metrics.count).toHaveBeenCalledWith('forecast_errors', 1, {
        attributes: { provider: 'openWeather', details: 'Service unavailable', context: 'forecast' }
      });
    });

    it('falls back to JSON.stringify(reason) when no data.details is present', () => {
      const error = { reason: { data: undefined, reason: 'Network failure' } };

      const result = msgFromError(error, 'openWeather', 'aqi');

      expect(result).toBe(JSON.stringify(error.reason));
      expect(Sentry.metrics.count).toHaveBeenCalledWith('forecast_errors', 1, {
        attributes: { provider: 'openWeather', details: error.reason, context: 'aqi' }
      });
    });
  });

  describe('errorDetails', () => {
    it('returns error.data.details when available', () => {
      expect(errorDetails({ data: { details: 'broken request' } })).toBe('broken request');
    });

    it('serializes the error when details are not present', () => {
      expect(errorDetails('simple error')).toBe(JSON.stringify('simple error'));
    });
  });

  describe('removeDuplicateForecasts', () => {
    it('drops the second duplicate when the first forecast is a control', () => {
      const results = [
        { forecast: { time: 1234, isControl: true, distance: 10 }, which: 0 },
        { forecast: { time: 1234, isControl: false, distance: 20 }, which: 1 },
        { forecast: { time: 1235, isControl: false, distance: 30 }, which: 2 }
      ];

      expect(removeDuplicateForecasts(results)).toEqual([
        results[0],
        results[2]
      ]);
    });

    it('drops the first duplicate when it is not a control', () => {
      const results = [
        { forecast: { time: 1234, isControl: false, distance: 10 }, which: 0 },
        { forecast: { time: 1234, isControl: true, distance: 20 }, which: 1 }
      ];

      expect(removeDuplicateForecasts(results)).toEqual([
        results[1]
      ]);
    });
  });

  describe('extractRejectedResults', () => {
    it('returns only rejected results not part of succeededParts', () => {
      const results = [
        { status: 'fulfilled', value: { forecast: 'ok' } },
        { status: 'rejected', reason: { data: { which: 0, details: 'fail A' } } },
        { status: 'rejected', reason: { data: { which: 1, details: 'fail B' } } }
      ] as Array<PromiseSettledResult<any>>;

      const rejected = extractRejectedResults(results, [0]);

      expect(rejected).toEqual([
        results[2]
      ]);
    });
  });

  describe('getDaysInFuture', () => {
    it('returns a value close to one day for timestamp 24 hours in the future', () => {
      const futureTimestamp = Date.now() + 24 * 60 * 60 * 1000;
      const days = getDaysInFuture(futureTimestamp);
      expect(days).toBeGreaterThan(0.99);
      expect(days).toBeLessThan(1.02);
    });
  });

  describe('forecastWithHook', () => {
    it('dispatches forecast fetch and appends a single forecast with AQI results', async () => {
      const fakeForecast = { forecast: { distance: 5, isControl: false, time: 1000 }, which: 0 };
      const fakeAqi = { aqi: { aqi: 42 } };
      const forecastFunc = jest.fn(() => ({ unwrap: () => Promise.resolve(fakeForecast) }));
      const aqiFunc = jest.fn(() => ({ unwrap: () => Promise.resolve(fakeAqi) }));

      (getForecastRequest as jest.Mock).mockReturnValue([{
        locations: { lat: 39.9, lon: -105.0 }
      }]);

      mockGetState.mockReturnValue({
        routeInfo: {
          rwgpsRouteData: null,
          gpxRouteData: {
            tracks: [
              {
                distance: { total: 5000 },
                link: { href: 'https://example.com/123' },
                name: 'Sample Route'
              }
            ],
            name: 'GPX Route'
          },
          name: 'My Route',
          routeUUID: 'uuid'
        },
        uiInfo: {
          routeParams: {
            startTimestamp: Date.now() + 24 * 60 * 60 * 1000,
            zone: 'America/Denver',
            pace: 10,
            interval: 60,
            segment: null
          }
        },
        forecast: {
          weatherProvider: 'weatherKit',
          fetchAqi: true
        },
        controls: {
          userControlPoints: []
        },
        strava: {
          route: ''
        }
      });

      await forecastWithHook(forecastFunc as any, aqiFunc as any, mockDispatch as any, mockGetState as any, 'en');

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'dialogParams/forecastFetchBegun' });
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'forecast/forecastFetched' }));
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'forecast/forecastAppended' }));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'dialogParams/errorMessageListSet', payload: [] });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'dialogParams/errorMessageListAppend', payload: [] });
      expect(ReactGA.event).toHaveBeenCalledWith('weather_provider', { provider: 'weatherKit' });
      expect((ReactGA.event as jest.Mock).mock.calls.some(call => call[0] === 'add_payment_info')).toBe(true);
    });

    it('overrides provider when the selected provider cannot forecast that far and reports no successful forecasts', async () => {
      const forecastFunc = jest.fn(() => ({ unwrap: () => Promise.reject({ data: { details: 'Forecast failed', which: 0 } }) }));
      const aqiFunc = jest.fn(() => ({ unwrap: () => Promise.resolve({ aqi: { aqi: 100 } }) }));
      const startTimestamp = Date.now() + 5 * 24 * 60 * 60 * 1000;

      (getForecastRequest as jest.Mock).mockReturnValue([{ locations: { lat: 39.9, lon: -105.0 } }]);

      mockGetState.mockReturnValue({
        routeInfo: {
          rwgpsRouteData: null,
          gpxRouteData: {
            tracks: [
              {
                distance: { total: 5000 },
                link: { href: 'https://example.com/123' },
                name: 'Sample Route'
              }
            ],
            name: 'GPX Route'
          },
          name: 'My Route',
          routeUUID: 'uuid'
        },
        uiInfo: {
          routeParams: {
            startTimestamp,
            zone: 'America/Denver',
            pace: 10,
            interval: 60,
            segment: null
          }
        },
        forecast: {
          weatherProvider: 'climacell',
          fetchAqi: true
        },
        controls: {
          userControlPoints: []
        },
        strava: {
          route: ''
        }
      });

      await forecastWithHook(forecastFunc as any, aqiFunc as any, mockDispatch as any, mockGetState as any, 'en');

      expect((ReactGA.event as jest.Mock).mock.calls.some(call => call[1]?.provider === 'visualcrossing')).toBe(true);
      expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'forecast/forecastFetched' }));
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dialogParams/errorMessageListSet' }));
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dialogParams/errorMessageListAppend' }));
    });
  });

  describe('cancelForecast', () => {
    it('dispatches forecastInvalidated when cancelForecast is invoked', () => {
      const thunk = cancelForecast();
      thunk(mockDispatch as any);
      expect(forecastInvalidated).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'forecast/forecastInvalidated' });
    });
  });
});
