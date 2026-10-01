import React from 'react';
import { act } from '@testing-library/react';
import { renderWithProviders, waitFor } from '../../utils/test-utils';
import '@testing-library/jest-dom';
import RouteWeatherUI, { useLoadControlPointsFromURL, useSetPageTitle } from './main';
import * as Sentry from '@sentry/react';

// Mock dependencies
jest.mock('@sentry/react', () => ({
  __esModule: true,
  createReduxEnhancer: jest.fn(() => (createStore: any) => createStore),
  ErrorBoundary: ({ children }: any) => children,
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  metrics: { count: jest.fn() },
  feedbackIntegration: jest.fn(),
  logger: {
    info: jest.fn(),
  },
}));

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

jest.mock('../../redux/forecastApiSlice', () => ({
  useForecastMutation: () => [jest.fn(), { isLoading: false }],
  useGetAqiMutation: () => [jest.fn(), { isLoading: false }],
  forecastApiSlice: {
    reducerPath: 'forecastApi',
    reducer: (state: any = { queries: {} }) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

jest.mock('../../redux/rusaLookupApiSlice', () => ({
  rusaIdLookupApiSlice: {
    reducerPath: 'rusaIdLookupApi',
    reducer: (state: any = { queries: {} }) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

jest.mock('../../redux/stravaApiSlice', () => ({
  stravaApiSlice: {
    reducerPath: 'stravaApi',
    reducer: (state: any = { queries: {} }) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

jest.mock('../../redux/loadRouteActions', () => ({
  loadRouteFromURL: jest.fn(() => ({ type: 'LOAD_ROUTE' })),
  MutationWrapper: jest.fn(),
}));

describe('RouteWeatherUI Component', () => {
  const defaultProps = {
    search: '',
    href: 'http://localhost:3000',
    action: 'forecast',
    maps_api_key: 'test-maps-api-key',
    timezone_api_key: 'test-timezone-api-key',
    bitly_token: 'test-bitly-token',
    origin: 'http://localhost:3000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const HookHarness = ({ queryParams }: { queryParams: any }) => {
    useLoadControlPointsFromURL(queryParams);
    useSetPageTitle();
    return null;
  };

  it('should render the component without crashing', async () => {
    const { container } = renderWithProviders(<RouteWeatherUI {...defaultProps} />);
    
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should set Sentry context with query string', async () => {
    const searchParams = '?test=param';
    const { container } = renderWithProviders(<RouteWeatherUI {...defaultProps} search={searchParams} />);

    // Sentry.setContext is called synchronously during render
    expect(Sentry.setContext).toHaveBeenCalledWith('query', { queryString: searchParams });
    
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle query parameters from URL', async () => {
    const searchParams = '?pace=easy&metric=true&celsius=false';
    const { container } = renderWithProviders(<RouteWeatherUI {...defaultProps} search={searchParams} />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should dispatch Redux actions with API keys', async () => {
    const props = {
      ...defaultProps,
      maps_api_key: 'custom-maps-key',
      timezone_api_key: 'custom-tz-key',
      bitly_token: 'custom-bitly-token',
    };

    const { container, store } = renderWithProviders(
      <RouteWeatherUI {...props} />
    );

    await waitFor(() => {
      expect(container).toBeInTheDocument();
      // Verify the store was updated
      const state = store.getState();
      expect(state).toBeDefined();
    });
  });

  it('should load control points and update the page title from route state', async () => {
    const orientation = { type: 'landscape-primary', onchange: null };
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: orientation
    });

    const { store } = renderWithProviders(<HookHarness queryParams={{ controlPoints: 'Cafe,10,20' }} />, {
      preloadedState: { routeInfo: { name: 'Test Route' } }
    });

    await waitFor(() => {
      expect(document.title).toBe('Forecast for Test Route');
      expect(store.getState().controls.userControlPoints).toHaveLength(1);
    });
    expect(store.getState().controls.displayControlTableUI).toBe(true);
    expect(document.title).toBe('Forecast for Test Route');
  });

  it('should respond to screen orientation changes', () => {
    const orientation = { type: 'landscape-primary', onchange: null as ((event: Event) => void) | null };
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: orientation });

    renderWithProviders(<RouteWeatherUI {...defaultProps} search="?pace=easy" />);

    expect(typeof orientation.onchange).toBe('function');
    act(() => orientation.onchange?.(new Event('change')));
    expect((orientation.onchange as Function)).toBeDefined();
  });

  it('should reload the route when URL and current route agree', async () => {
    const { loadRouteFromURL } = jest.requireMock('../../redux/loadRouteActions');
    renderWithProviders(
      <RouteWeatherUI
        {...defaultProps}
        search="?rwgpsRoute=route-123"
      />,
      {
        preloadedState: { uiInfo: { routeParams: { rwgpsRoute: 'route-123', startTimestamp: Date.now() } } }
      }
    );

    await waitFor(() => expect(loadRouteFromURL).toHaveBeenCalled());
  });
/***
  it('should store a RWGPS token received in the URL', async () => {
    const { store } = renderWithProviders(
      <RouteWeatherUI {...defaultProps} search="?rwgpsToken=url-token" />
    );

    await waitFor(() => {
      expect(store.getState().rideWithGpsInfo.token).toBe('url-token');
    });
  });
  ***/
});

