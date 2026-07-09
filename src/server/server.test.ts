import request from 'supertest';

if (typeof global.setImmediate === 'undefined') {
  // jsdom test environment may not provide setImmediate for Express async flow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  },
  get: jest.fn(),
  request: jest.fn()
};
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance),
    post: mockAxiosPost,
    request: mockAxiosInstance.request
  },
  isAxiosError: jest.fn((error: any) => !!error && error.response !== undefined)
}));

jest.mock('./instrument.js', () => ({}), { virtual: true });
jest.mock('./weatherForecastDispatcher.js', () => ({
  __esModule: true,
  default: jest.fn(),
}), { virtual: true });
jest.mock('./purpleAirAQI.js', () => ({
  __esModule: true,
  default: jest.fn(),
}), { virtual: true });
jest.mock('./airNowAQI.js', () => ({
  __esModule: true,
  default: jest.fn(),
}), { virtual: true });

describe('src/server/server.ts', () => {
  beforeEach(() => {
    process.env.BITLY_TOKEN = 'test-bitly-token';
    process.env.SHORT_IO_KEY = 'test-short-io-key';
    process.env.RWGPS_API_KEY = 'test-rwgps-api-key';
    process.env.RWGPS_OAUTH_CLIENT_ID = 'rwgps-client';
    process.env.RWGPS_OAUTH_SECRET = 'rwgps-secret';
    process.env.STRAVA_CLIENT_ID = 'strava-client';
    process.env.STRAVA_API_KEY = 'strava-secret';
    jest.resetModules();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.request.mockReset();
    mockAxiosPost.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.BITLY_TOKEN;
    delete process.env.SHORT_IO_KEY;
    delete process.env.RWGPS_API_KEY;
    delete process.env.RWGPS_OAUTH_CLIENT_ID;
    delete process.env.RWGPS_OAUTH_SECRET;
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_API_KEY;
    delete global.fetch;
    jest.restoreAllMocks();
  });

  test('rejects invalid route numbers on /rwgps_route', async () => {
    const { default: app } = await import('./server');

    const response = await request(app)
      .get('/rwgps_route')
      .query({ route: 'bad route' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ status: 'Invalid route number' });
  });

  test('rejects missing location payload on /forecast_one', async () => {
    const { default: app } = await import('./server');

    const response = await request(app)
      .post('/forecast_one')
      .send({ timezone: 'UTC' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ status: 'Missing location key' });
  });

  test('rejects missing timezone payload on /forecast_one', async () => {
    const { default: app } = await import('./server');

    const response = await request(app)
      .post('/forecast_one')
      .send({ locations: { lat: 1, lon: 2, time: '2026-01-01T00:00:00Z', distance: 0, bearing: 0, isControl: false } });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ status: 'Missing timezone key' });
  });

  test('returns a forecast for multi-service requests on /forecast_one', async () => {
    const weatherService = await import('./weatherForecastDispatcher.js');
    (weatherService.default as jest.Mock).mockResolvedValueOnce({ temp: '44' }).mockResolvedValueOnce({ temp: '46' });

    const { default: app } = await import('./server');
    const response = await request(app)
      .post('/forecast_one')
      .send({
        locations: { lat: 1, lon: 2, time: '2026-01-01T00:00:00Z', distance: 0, bearing: 0, isControl: false },
        timezone: 'UTC',
        service: 'metno,icon'
      });

    expect(response.status).toBe(200);
    expect(response.body.forecast.temp).toBe('44');
    expect(response.body.forecast.stdDev).toBe(1.4142135623730951);
  });

  test('rejects missing location payload on /aqi_one', async () => {
    const { default: app } = await import('./server');

    const response = await request(app)
      .post('/aqi_one')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ status: 'Missing location key' });
  });

  test('returns AQI data for /aqi_one', async () => {
    const purpleAirModule = await import('./purpleAirAQI.js');
    const airNowModule = await import('./airNowAQI.js');
    (airNowModule.default as jest.Mock).mockResolvedValueOnce({ aqi: 12 });
    (purpleAirModule.default as jest.Mock).mockResolvedValueOnce({ aqi: 15 });

    const { default: app } = await import('./server');
    const response = await request(app)
      .post('/aqi_one')
      .send({ locations: { lat: 1, lon: 2 } });

    expect(response.status).toBe(200);
    expect(response.body.aqi).toEqual({ aqi: { aqi: 12 } });
  });

  test('returns 200 for a valid rwgps route response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ type: 'route' }))
    });

    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/rwgps_route')
      .query({ route: 'abc123' });

    expect(response.status).toBe(200);
    expect(response.text).toBe(JSON.stringify({ type: 'route' }));
  });

  test('returns 401 when rwgps route result is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ type: 'notroute' }))
    });

    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/rwgps_route')
      .query({ route: 'abc123' });

    expect(response.status).toBe(401);
    expect(response.text).toBe(JSON.stringify({ type: 'notroute' }));
  });

  test('maps fetch rejection status text number to status code for /rwgps_route', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('404'));

    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/rwgps_route')
      .query({ route: 'abc123' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('status', 'Error: 404');
  });

  test('shortens a url via /bitly', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ groups: [{ guid: 1 }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ link: 'https://bit.ly/test' }) });

    const { default: app } = await import('./server');
    const response = await request(app)
      .post('/bitly')
      .send({ longUrl: 'https://example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: null, url: 'https://bit.ly/test' });
  });

  test('returns bitly error when group lookup fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });

    const { default: app } = await import('./server');
    const response = await request(app)
      .post('/bitly')
      .send({ longUrl: 'https://example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Error: Bitly groupid fetch failed with 401 Unauthorized', url: null });
  });

  test('creates a short.io link via /short_io', async () => {
    mockAxiosInstance.request.mockResolvedValueOnce({ data: { shortURL: 'https://go.randoplan.com/abc' } });

    const { default: app } = await import('./server');
    const response = await request(app)
      .post('/short_io')
      .send({ longUrl: 'https://example.com', title: 'Test' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: null, url: 'https://go.randoplan.com/abc' });
  });

  test('returns short.io error on request failure', async () => {
    mockAxiosInstance.request.mockRejectedValueOnce(new Error('boom'));

    const { default: app } = await import('./server');
    const response = await request(app)
      .post('/short_io')
      .send({ longUrl: 'https://example.com', title: 'Test' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'boom', url: null });
  });

  test('rejects missing state on /stravaAuthReq', async () => {
    const { default: app } = await import('./server');
    const response = await request(app).get('/stravaAuthReq');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ status: 'Missing OAuth state from Strava' });
  });

  test('redirects to Strava auth when /stravaAuthReq has state', async () => {
    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/stravaAuthReq')
      .query({ state: 'abc' })
      .set('host', 'example.com');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('client_id=strava-client');
    expect(response.headers.location).toContain('state=abc');
  });

  test('redirects to root on /stravaAuthReply without code', async () => {
    const { default: app } = await import('./server');
    const response = await request(app).get('/stravaAuthReply');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('strava_error=Strava%20authentication%20denied');
  });

  test('exchanges a Strava code on /stravaAuthReply and redirects with token', async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: { access_token: 'at', refresh_token: 'rt', expires_at: '123' } });
    const stateValue = `?${encodeURIComponent(JSON.stringify({ foo: 'bar' }))}`;

    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/stravaAuthReply')
      .query({ code: 'code123', state: stateValue });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('strava_access_token=at');
    expect(response.headers.location).toContain('foo=bar');
  }); 

  test('rejects missing refresh token on /refreshStravaToken', async () => {
    const { default: app } = await import('./server');
    const response = await request(app).get('/refreshStravaToken');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ status: 'Bad call to refresh Strava token' });
  });

  test('refreshes a Strava token on /refreshStravaToken', async () => {
    mockAxiosPost.mockResolvedValueOnce({ data: { access_token: 'rat', refresh_token: 'rrt', expires_at: '456' } });

    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/refreshStravaToken')
      .query({ refreshToken: 'refresh123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ access_token: 'rat', refresh_token: 'rrt', expires_at: '456' });
  });

  test('returns error when Strava refresh fails on /refreshStravaToken', async () => {
    mockAxiosPost.mockRejectedValueOnce({ statusCode: 401, error: { message: 'invalid refresh' } });

    const { default: app } = await import('./server');
    const response = await request(app)
      .get('/refreshStravaToken')
      .query({ refreshToken: 'refresh123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'invalid refresh' });
  });
});
