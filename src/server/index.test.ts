jest.resetModules();

describe('src/server/index.ts', () => {
  let originalInfo: typeof console.info;
  let originalPort: string | undefined;
  let listenMock: jest.Mock;

  beforeAll(() => {
    originalInfo = console.info;
    originalPort = process.env.PORT;
  });

  beforeEach(() => {
    jest.resetModules();
    listenMock = jest.fn((port: number | string, callback: () => void) => {
      callback();
      return { close: jest.fn() };
    });
    console.info = jest.fn();
  });

  afterEach(() => {
    console.info = originalInfo;
    if (originalPort !== undefined) {
      process.env.PORT = originalPort;
    } else {
      delete process.env.PORT;
    }
    jest.restoreAllMocks();
  });

  test('starts the server on the default port when PORT is not defined', async () => {
    delete process.env.PORT;
    process.env.npm_package_version = '1.0.0';

    jest.doMock('./server.js', () => ({
      __esModule: true,
      default: {
        listen: listenMock,
      },
    }), { virtual: true });

    await import('./index');

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(8080, expect.any(Function));
    expect(console.info).toHaveBeenCalledWith('Route forecast server v1.0.0 listening on port 8080!');
  });

  test('starts the server on the port from PORT environment variable', async () => {
    process.env.PORT = '5005';
    process.env.npm_package_version = '2.0.0';

    jest.doMock('./server.js', () => ({
      __esModule: true,
      default: {
        listen: listenMock,
      },
    }), { virtual: true });

    await import('./index');

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith('5005', expect.any(Function));
    expect(console.info).toHaveBeenCalledWith('Route forecast server v2.0.0 listening on port 5005!');
  });
});
