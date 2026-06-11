import React from 'react';

let shouldThrow = false;

jest.mock('./main', () => ({
  __esModule: true,
  default: ({ search, href, origin, action, maps_api_key, timezone_api_key, bitly_token }: any) => {
    if (shouldThrow) {
      throw new Error('Test render error');
    }
    return (
      <div data-testid="route-weather-ui">
        <div>{`search:${search}`}</div>
        <div>{`href:${href}`}</div>
        <div>{`origin:${origin}`}</div>
        <div>{`action:${action}`}</div>
        <div>{`maps:${maps_api_key}`}</div>
        <div>{`timezone:${timezone_api_key}`}</div>
        <div>{`bitly:${bitly_token}`}</div>
      </div>
    );
  },
}));

jest.mock('./ChunkErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  ErrorBoundary: class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch() {
      // no-op
    }

    render() {
      if (this.state.hasError) {
        return this.props.fallback;
      }
      return this.props.children;
    }
  },
  createReduxEnhancer: jest.fn(() => (createStore: any) => createStore),
  metrics: { count: jest.fn() },
  startSpan: jest.fn(() => ({ finish: jest.fn() })),
  addBreadcrumb: jest.fn(),
  feedbackIntegration: jest.fn(),
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn(),
  },
}));

import { render, screen, waitFor } from 'test-utils';
import TopLevel from './topLevel';
import LocationContext from '../locationContext';

describe('TopLevel', () => {
  test('renders the lazy-loaded RouteWeatherUI with provided props', async () => {
    render(
      <LocationContext.Provider
        value={{ href: 'https://example.com/path', search: '?a=1', origin: 'https://example.com' }}
      >
        <TopLevel
          action="test-action"
          maps_api_key="maps-key"
          timezone_api_key="tz-key"
          bitly_token="bitly-key"
        />
      </LocationContext.Provider>
    );

    expect(screen.getByText('Loading main UI')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('route-weather-ui')).toBeInTheDocument());

    expect(screen.getByText('search:?a=1')).toBeInTheDocument();
    expect(screen.getByText('href:https://example.com/path')).toBeInTheDocument();
    expect(screen.getByText('origin:https://example.com')).toBeInTheDocument();
    expect(screen.getByText('action:test-action')).toBeInTheDocument();
    expect(screen.getByText('maps:maps-key')).toBeInTheDocument();
    expect(screen.getByText('timezone:tz-key')).toBeInTheDocument();
    expect(screen.getByText('bitly:bitly-key')).toBeInTheDocument();
  });

  test('displays ErrorBoundary fallback when child throws', async () => {
    shouldThrow = true;

    render(
      <LocationContext.Provider
        value={{ href: 'https://example.com/path', search: '?a=1', origin: 'https://example.com' }}
      >
        <TopLevel
          action="test-action"
          maps_api_key="maps-key"
          timezone_api_key="tz-key"
          bitly_token="bitly-key"
        />
      </LocationContext.Provider>
    );

    await waitFor(() => expect(screen.getByText('Something went wrong.')).toBeInTheDocument());

    shouldThrow = false;
  });
});
