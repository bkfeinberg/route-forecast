import React from 'react';
import ReactGA from 'react-ga4';
import VersionContext from '../versionContext';
import LocationContext from '../locationContext';

type RootMock = {
  render: jest.Mock<void, [React.ReactElement]>;
};

const renderMock = jest.fn<void, [React.ReactElement]>();
const createRootMock = jest.fn<RootMock, [HTMLElement]>(() => ({ render: renderMock }));
const topLevelMock = jest.fn((props: any) => <div data-testid="top-level" {...props} />);

jest.mock('react-dom/client', () => ({
  createRoot: createRootMock
}));

jest.mock('./topLevel', () => ({
  __esModule: true,
  default: topLevelMock
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  init: jest.fn(),
  setTag: jest.fn(),
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn()
  },
  metrics: { count: jest.fn() },
  feedbackIntegration: jest.fn(),
  browserSessionIntegration: jest.fn(),
  browserTracingIntegration: jest.fn(),
  browserProfilingIntegration: jest.fn(),
  replayIntegration: jest.fn(),
  replayCanvasIntegration: jest.fn(),
  thirdPartyErrorFilterIntegration: jest.fn((opts: any) => opts),
  setContext: jest.fn(),
  getGlobalScope: jest.fn(() => ({ setAttributes: jest.fn() }))
}));

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    set: jest.fn(),
    event: jest.fn()
  }
}));

describe('src/jsx/app/app.tsx', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="content"></div><script name="routeui"></script>';
    const script = document.querySelector('script[name="routeui"]') as HTMLScriptElement;
    script.setAttribute('action', 'test-action');
    script.setAttribute('maps_api_key', 'maps-key');
    script.setAttribute('timezone_api_key', 'tz-key');
    script.setAttribute('bitly_token', 'bitly-key');
    script.setAttribute('version', '1.2.3');
  });

  test('renders TopLevel with script configuration props', async () => {
    await jest.isolateModulesAsync(async () => {
      await import('./app');
    });

    const container = document.getElementById('content') as HTMLElement;
    expect(createRootMock).toHaveBeenCalledWith(container);
    expect(renderMock).toHaveBeenCalledTimes(1);

    const renderedElement = renderMock.mock.calls[0][0];
    expect(renderedElement.props.value).toBe('1.2.3');

    const locationProvider = renderedElement.props.children;
    expect(locationProvider.props.value).toEqual({
      href: 'http://localhost/',
      search: '',
      origin: 'http://localhost'
    });

    const topLevelElement = locationProvider.props.children;
    expect(topLevelElement.type).toBe(topLevelMock);
    expect(topLevelElement.props).toMatchObject({
      action: 'test-action',
      maps_api_key: 'maps-key',
      timezone_api_key: 'tz-key',
      bitly_token: 'bitly-key'
    });
  });

  test('does not attempt to render when container is missing', async () => {
    document.body.innerHTML = '<script name="routeui"></script>';
    const script = document.querySelector('script[name="routeui"]') as HTMLScriptElement;
    script.setAttribute('action', 'test-action');
    script.setAttribute('maps_api_key', 'maps-key');
    script.setAttribute('timezone_api_key', 'tz-key');
    script.setAttribute('bitly_token', 'bitly-key');
    script.setAttribute('version', '1.2.3');

    await jest.isolateModulesAsync(async () => {
      await import('./app');
    });

    expect(createRootMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  test('does not render when required script configuration is missing', async () => {
    document.body.innerHTML = '<div id="content"></div><script name="routeui"></script>';
    const script = document.querySelector('script[name="routeui"]') as HTMLScriptElement;
    script.setAttribute('action', 'test-action');
    script.setAttribute('maps_api_key', 'maps-key');
    script.setAttribute('timezone_api_key', 'tz-key');
    // bitly_token intentionally missing
    script.setAttribute('version', '1.2.3');

    await jest.isolateModulesAsync(async () => {
      await import('./app');
    });

    expect(createRootMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  test('falls back to version 0.0.0 when version is missing', async () => {
    document.body.innerHTML = '<div id="content"></div><script name="routeui"></script>';
    const script = document.querySelector('script[name="routeui"]') as HTMLScriptElement;
    script.setAttribute('action', 'test-action');
    script.setAttribute('maps_api_key', 'maps-key');
    script.setAttribute('timezone_api_key', 'tz-key');
    script.setAttribute('bitly_token', 'bitly-key');
    // no version attribute set

    await jest.isolateModulesAsync(async () => {
      await import('./app');
    });

    expect(createRootMock).toHaveBeenCalled();
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(ReactGA.set).not.toHaveBeenCalled();

    const renderedElement = renderMock.mock.calls[0][0];
    expect(renderedElement.props.value).toBe('0.0.0');
  });
});
