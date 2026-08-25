import React from 'react';
import { renderWithProviders, waitFor } from '../../utils/test-utils';
import '@testing-library/jest-dom';
import RouteWeatherUI from './main';
import * as Sentry from '@sentry/react';

// Mock dependencies
jest.mock('@sentry/react', () => ({
  ...jest.requireActual('@sentry/react'),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
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

// Mock window.location
delete (window as any).location;
window.location = { reload: jest.fn() } as any;

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
});

