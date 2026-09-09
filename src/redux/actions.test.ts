import {
  setPace,
  setTimeFromIso,
  setStart,
  setInterval,
  updateUserControls,
  setWeatherProvider,
  shortenUrl
} from './actions';
import { cancelForecast } from './forecastActions';
import { paceSet, initialStartTimeSet, startTimeSet, intervalSet } from './routeParamsSlice';
import { forecastInvalidated, weatherProviderSet } from './forecastSlice';
import { userControlsUpdated } from './controlsSlice';
import { errorDetailsSet, shortUrlSet } from './dialogParamsSlice';
import * as Sentry from '@sentry/react';
import type { UserControl } from './controlsSlice';

jest.mock('@sentry/react', () => ({
  __esModule: true,
  startSpan: jest.fn((_options: unknown, callback: () => unknown) => callback()),
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

describe('actions', () => {
  const dispatch = jest.fn();
  const getState = jest.fn();
  const control: UserControl = {
    id: 1,
    name: 'Control',
    distance: 10,
    lat: 40,
    lon: -105,
    duration: 0,
    business: 'no'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Sentry.startSpan as jest.Mock).mockImplementation((_options, callback) => callback());
    global.fetch = jest.fn();
  });

  it('dispatches pace, time, start, interval, and provider changes', () => {
    setPace('B')(dispatch);
    setTimeFromIso('2024-01-01T08:00:00Z', 'America/Denver')(dispatch);
    setStart(123)(dispatch);
    setInterval(2)(dispatch);
    setWeatherProvider('openMeteo')(dispatch);

    expect(dispatch).toHaveBeenCalledWith(paceSet('B'));
    expect(dispatch).toHaveBeenCalledWith(initialStartTimeSet({ start: '2024-01-01T08:00:00Z', zone: 'America/Denver' }));
    expect(dispatch).toHaveBeenCalledWith(startTimeSet(123));
    expect(dispatch).toHaveBeenCalledWith(intervalSet(2));
    expect(dispatch).toHaveBeenCalledWith(weatherProviderSet('openMeteo'));
    expect(dispatch).toHaveBeenCalledWith(forecastInvalidated());
    expect(dispatch.mock.calls.some(([action]) => typeof action === 'function')).toBe(true);
  });

  it('updates controls and cancels only when controls differ', () => {
    getState.mockReturnValue({ controls: { userControlPoints: [control] } });

    updateUserControls([control])(dispatch, getState);
    expect(dispatch).toHaveBeenCalledWith(userControlsUpdated([control]));
    expect(dispatch.mock.calls.some(([action]) => typeof action === 'function')).toBe(false);

    dispatch.mockClear();
    const changedControl = { ...control, duration: 30 };
    updateUserControls([changedControl])(dispatch, getState);
    expect(dispatch).toHaveBeenCalledWith(userControlsUpdated([changedControl]));
    expect(dispatch.mock.calls.some(([action]) => typeof action === 'function')).toBe(true);
  });

  it('shortens a URL and stores a successful response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ url: 'https://short.test/abc' })
    });

    await shortenUrl('https://example.com', 'Example')(dispatch);

    expect(global.fetch).toHaveBeenCalledWith('/short_io', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ longUrl: 'https://example.com', title: 'Example' })
    }));
    expect(dispatch).toHaveBeenCalledWith(shortUrlSet('https://short.test/abc'));
  });

  it('handles short URL API errors and malformed responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'quota exceeded' })
    });
    await shortenUrl('https://example.com')(dispatch);
    expect(dispatch).toHaveBeenCalledWith(errorDetailsSet('quota exceeded'));

    dispatch.mockClear();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({})
    });
    await shortenUrl('https://example.com')(dispatch);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: errorDetailsSet('Unexpected response from short.io: {}').type
    }));
  });

  it('handles a failed short URL request', async () => {
    const failure = new Error('network failure');
    (global.fetch as jest.Mock).mockRejectedValue(failure);

    await shortenUrl('https://example.com')(dispatch);

    expect(dispatch).toHaveBeenCalledWith(errorDetailsSet(failure));
    expect(Sentry.metrics.count).toHaveBeenCalledWith('shorten_url_failure', 1, expect.any(Object));
  });
});
