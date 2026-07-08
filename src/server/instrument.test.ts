describe('src/server/instrument.ts', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('initializes Sentry when NODE_ENV is not development', async () => {
    process.env.NODE_ENV = 'production';
    const initMock = jest.fn();
    const nodeProfilingIntegrationMock = jest.fn(() => ({ integration: 'nodeProfiling' }));

    jest.doMock('@sentry/node', () => ({
      __esModule: true,
      init: initMock
    }));

    jest.doMock('@sentry/profiling-node', () => ({
      __esModule: true,
      nodeProfilingIntegration: nodeProfilingIntegrationMock
    }));

    await jest.isolateModulesAsync(async () => {
      await import('./instrument.ts');
    });

    expect(nodeProfilingIntegrationMock).toHaveBeenCalled();
    expect(initMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: expect.stringContaining('https://'),
      _experiments: { enableLogs: true },
      integrations: [{ integration: 'nodeProfiling' }],
      tracesSampleRate: 0.3,
      sampleRate: 1
    }));
  });

  test('does not initialize Sentry in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const initMock = jest.fn();
    const nodeProfilingIntegrationMock = jest.fn(() => ({ integration: 'nodeProfiling' }));

    jest.doMock('@sentry/node', () => ({
      __esModule: true,
      init: initMock
    }));

    jest.doMock('@sentry/profiling-node', () => ({
      __esModule: true,
      nodeProfilingIntegration: nodeProfilingIntegrationMock
    }));

    await jest.isolateModulesAsync(async () => {
      await import('./instrument.ts');
    });

    expect(nodeProfilingIntegrationMock).not.toHaveBeenCalled();
    expect(initMock).not.toHaveBeenCalled();
  });
});
