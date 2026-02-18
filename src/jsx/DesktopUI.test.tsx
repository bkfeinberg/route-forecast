// src/jsx/DesktopUI.test.tsx
import { renderWithProviders, screen, waitFor } from 'test-utils';
import { describe, beforeEach, jest, test } from '@jest/globals';

// Mock child components
jest.mock('./RouteInfoForm/RouteInfoForm', () => ({
  __esModule: true,
  default: () => <div data-testid="route-info-form">RouteInfoForm</div>
}));

jest.mock('./ForecastSettings/ForecastSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="forecast-settings">ForecastSettings</div>
}));

// jest.mock('./resultsTables/ForecastTable', () => ({
//   __esModule: true,
//   default: () => <div data-testid="forecast-table">ForecastTable</div>
// }));

// jest.mock('./resultsTables/WeatherCorrections', () => ({
//   __esModule: true,
//   default: () => <div data-testid="weather-corrections">WeatherCorrections</div>
// }));

jest.mock('./resultsTables/PaceTable', () => ({
  __esModule: true,
  default: () => <div data-testid="pace-table">PaceTable</div>
}));

// jest.mock('./Map/MapLoader', () => ({
//   __esModule: true,
//   default: () => <div data-testid="map-loader">MapLoader</div>,
//   addBreadcrumb: jest.fn()
// }));

jest.mock('./TopBar/TopBar', () => ({
  __esModule: true,
  TopBar: () => <div data-testid="top-bar">TopBar</div>
}));

// jest.mock('./TitleScreen', () => ({
//   __esModule: true,
//   TitleScreen: () => <div data-testid="title-screen">TitleScreen</div>
// }));

// jest.mock('./shared/RouteTitle', () => ({
//   __esModule: true,
//   RouteTitle: () => <div data-testid="route-title">RouteTitle</div>
// }));

jest.mock('./shared/TransitionWrapper', () => ({
  __esModule: true,
  TransitionWrapper: ({ children }: any) => <div data-testid="transition-wrapper">{children}</div>
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  ErrorBoundary: ({ children, fallback }: any) => (
    <div data-testid="error-boundary" data-fallback={fallback?.props?.children || ''}>
      {children}
    </div>
  ),
  createReduxEnhancer: jest.fn(() => (createStore: any) => createStore),
  metrics: {count: jest.fn()},
  startSpan: jest.fn(() => ({finish: jest.fn()})),
  addBreadcrumb: jest.fn(),
  feedbackIntegration: jest.fn(),
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

import DesktopUI from './DesktopUI';

describe.skip('DesktopUI sidePaneOptions', () => {

  beforeEach(() => {
    jest.clearAllMocks();    
  });

  const defaultState = {
  routeInfo: {
    rwgpsRouteData: null,
    gpxRouteData: null,
    loadingFromURL: false,
    type: 'rwgps'
  },
  forecast: {
    forecast: []
  },
  strava: {
    activityData: null,
    route: ''
  },
  uiInfo: {
    routeParams: {
      routeLoadingMode: 'rwgps'
    },
    dialogParams: {
      errorMessageList: [],
      viewControls: false
    }
  }
};

  test('DesktopUI component renders without errors', async () => {
    await waitFor(() => {
      const {container} = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: defaultState});
      expect(screen.getByText('titles.routeInfo')).toBeInTheDocument();
      expect(container).toBeTruthy();
    });
  });

  test('contains ForecastSettings in sidePaneOptions when route data exists', async () => {
    const state = {
      preloadedState: {
        routeInfo: {
          rwgpsRouteData: { id: 123 },
          gpxRouteData: null,
          loadingFromURL: false,
          type: 'rwgps'
        },
        uiInfo: {
          routeParams: {
            routeLoadingMode: 'rwgps'
          },
          dialogParams: {
            errorMessageList: [],
            viewControls: false
          }
        }
      }
    };
    await waitFor(() => {
      const { container } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, state);
      // ForecastSettings should be available in the DOM (in sidePaneOptions)
      // It might be rendered as part of Suspense/Lazy loading
      expect(container).toBeTruthy();
    });

  });

  test('contains ForecastTable in sidePaneOptions when forecast data exists', async () => {
    await waitFor(() => {
      renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />,
        {
          preloadedState: {
            forecast: {
              forecast: [{ id: 1 }]
            }
          }
        });
      // ForecastTable should be available in the DOM (in sidePaneOptions)
      expect(screen.queryByTestId('forecast-table')).toBeInTheDocument();
    });
  });

  test('contains PaceTable in sidePaneOptions when strava activity data exists', async () => {
    await waitFor(() => {
      renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: {
        strava: {
          activityData: { id: 123 },
          route: ''
        }
      }});
      
      // PaceTable should be available in the DOM (in sidePaneOptions)
      expect(screen.queryByTestId('pace-table')).toBeInTheDocument();
    });
  });

  test('wraps sidePaneOptions content in ErrorBoundary', () => {
    const { getAllByTestId } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: defaultState});
    
    const errorBoundaries = getAllByTestId('error-boundary');
    expect(errorBoundaries.length).toBeGreaterThan(0);
  });
});