import { loadStravaActivity, loadStravaRoute, componentLoader } from './loadFromStravaActions';
import * as loadFromStravaActions from './loadFromStravaActions';
import { Api } from 'rest-api-handler';
import ReactGA from 'react-ga4';

const mockFetchStravaActivity = jest.fn();

jest.mock('react-ga4', () => ({ event: jest.fn() }));

jest.mock('rest-api-handler', () => ({
  Api: jest.fn()
}));

jest.mock('../utils/stravaRouteParser', () => ({
  __esModule: true,
  default: { fetchStravaActivity: mockFetchStravaActivity }
}));

jest.mock('./forecastActions', () => ({
  cancelForecast: jest.fn(() => ({ type: 'forecast/cancelForecast' }))
}));

describe('loadFromStravaActions', () => {
  const mockDispatch = jest.fn();
  const mockGetState = jest.fn();
  const mockApi = { setDefaultHeader: jest.fn(), get: jest.fn() };
  const ApiMock = Api as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    ApiMock.mockImplementation(() => mockApi);
    mockApi.setDefaultHeader.mockClear();
    mockApi.get.mockClear();
    mockFetchStravaActivity.mockClear();
    global.fetch = jest.fn();
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

  test('loadStravaActivity dispatches fetch actions when Strava access token exists', async () => {
    mockGetState.mockReturnValue({
      strava: {
        refresh_token: 'refresh-token',
        expires_at: Math.round(Date.now() / 1000) + 1000,
        access_token: 'access-token',
        activity: '42'
      }
    });
    mockFetchStravaActivity.mockResolvedValue({ activity: {some: 'data'}, stream: {some: 'stream'} });

    const thunk = loadStravaActivity();
    await thunk(mockDispatch, mockGetState);

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'strava/stravaFetchBegun' }));
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'strava/stravaFetched' }));
    expect(ReactGA.event).toHaveBeenCalledWith('login', { method: '42' });
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
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  test('loadStravaRoute dispatches error on empty GPX response', async () => {
    mockGetState.mockReturnValue({
      strava: {
        refresh_token: 'refresh-token',
        expires_at: Math.round(Date.now() / 1000) + 1000,
        access_token: 'access-token',
        route: '321'
      }
    });
    mockApi.get
      .mockResolvedValueOnce(JSON.stringify({ segments: [{ country: 'CA' }] }))
      .mockResolvedValueOnce('   ');

    const thunk = loadStravaRoute('');
    await thunk(mockDispatch, mockGetState);

    expect(mockApi.setDefaultHeader).toHaveBeenCalledWith('Authorization', 'Bearer access-token');
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dialogParams/errorDetailsSet' }));
  });

  test('loadStravaRoute dispatches error on Strava JSON error message response', async () => {
    mockGetState.mockReturnValue({
      strava: {
        refresh_token: 'refresh-token',
        expires_at: Math.round(Date.now() / 1000) + 1000,
        access_token: 'access-token',
        route: '321'
      }
    });
    mockApi.get
      .mockResolvedValueOnce(JSON.stringify({ segments: [{ country: 'CA' }] }))
      .mockResolvedValueOnce(JSON.stringify({ message: 'Bad thing' }));

    const thunk = loadStravaRoute('');
    await thunk(mockDispatch, mockGetState);

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'dialogParams/errorDetailsSet' }));
  });

  test('componentLoader resolves a successfully loaded module', async () => {
    const module = Promise.resolve({ default: { loaded: true } });
    const result = await componentLoader(module, 3);
    expect(result).toEqual({ default: { loaded: true } });
  });
});
