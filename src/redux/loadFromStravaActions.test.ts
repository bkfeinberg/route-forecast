jest.mock('react-ga4', () => ({ event: jest.fn() }));

jest.mock('./forecastActions', () => ({
  cancelForecast: jest.fn(() => ({ type: 'forecast/cancelForecast' }))
}));

import { loadStravaActivity, loadStravaRoute } from './loadFromStravaActions';

describe('loadFromStravaActions', () => {
  const mockDispatch = jest.fn();
  const mockGetState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loadStravaActivity returns a thunk function', () => {
    const thunk = loadStravaActivity();
    expect(typeof thunk).toBe('function');
  });

  test('loadStravaActivity navigates to authenticate when no refresh token exists', async () => {
    mockGetState.mockReturnValue({
      strava: {
        refresh_token: null,
        expires_at: null,
        activity: '42'
      }
    });

    const thunk = loadStravaActivity();
    await thunk(mockDispatch, mockGetState);

    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining('stravaFetchBegun') }));
  });

  test('loadStravaRoute returns a thunk function', () => {
    const thunk = loadStravaRoute('123');
    expect(typeof thunk).toBe('function');
  });

  test('loadStravaRoute navigates to authenticate when Strava refresh token is missing', async () => {
    mockGetState.mockReturnValue({
      strava: {
        refresh_token: null,
        expires_at: null,
        route: '123'
      }
    });

    const thunk = loadStravaRoute('123');
    await thunk(mockDispatch, mockGetState);

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dialogParams/routeLoadingBegun' }));
  });
});
