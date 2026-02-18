// src/jsx/DesktopUI.test.tsx
import { renderWithProviders, screen, waitFor } from 'test-utils';
import { describe, beforeEach, jest, test } from '@jest/globals';

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
import { DateTime } from 'luxon';

describe('DesktopUI sidePaneOptions', () => {

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
      routeLoadingMode: 1,
      rwgpsRoute: '',
      rwgpsRouteIsTrip: false,
      startTimestamp: DateTime.now().toMillis(),
      zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: false,
      pace: 'D',
      interval: 1,
      min_interval: 1,
      segment: [0,0],
      succeededed: null
    },
    dialogParams: {
      errorMessageList: [],
      viewControls: false
    }
  }
};
    const futureTime = DateTime.now().plus({ days: 4 }).set({hour:7, minute:0});
    const futureTimestamp = futureTime.toMillis();

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
          rwgpsRouteData: {type: 'route', route: { track_points: [], distance: 0}},
          gpxRouteData: null,
          loadingFromURL: false,
          type: 'rwgps'
        },
        forecast: {
          forecast: []
        },
        uiInfo: {
          routeParams: {
            routeLoadingMode: 1,
            rwgpsRoute: '123',
            rwgpsRouteIsTrip: false,
            startTimestamp: futureTimestamp,
            zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: false,
            pace: 'D',
            interval: 1,
            segment: [0,0]
          },
          dialogParams: {
            errorMessageList: [],
            viewControls: false
          }
        },
        strava: {
          activityData: null,
          route: '',
          activity: '',
          activityStream: null
        }
      }
    };
    await waitFor(() => {
      renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, state);
    });
    // ForecastSettings should be available in the DOM (in sidePaneOptions)
    // It might be rendered as part of Suspense/Lazy loading
    expect(screen.getByText('titles.forecastSettings')).toBeTruthy();

  });

  test('contains ForecastTable in sidePaneOptions when forecast data exists', async () => {

    await waitFor(() => {
      renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />,
        {
          preloadedState: {
            forecast: {
              forecast: [{ id: 1 }]
            },
          uiInfo: {
            routeParams: {
              startTimestamp: futureTimestamp,
              zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: false,
              pace: 'D',
              interval: 1,
              segment: [0,0]
            }
          }
          }
        });
    });
    // ForecastTable should be available in the DOM (in sidePaneOptions)
    expect(screen.getByText('titles.forecast')).toBeTruthy();
  });

  test('contains PaceTable in sidePaneOptions when strava activity data exists', async () => {
    await waitFor(() => {
      renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {
        preloadedState: {
          strava: {
            activityData: { id: 123 },
            route: ''
          },
          uiInfo: {
            routeParams: {
              startTimestamp: futureTimestamp,
              zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: false,
              pace: 'D',
              interval: 1,
              segment: [0,0]
            }
          },
          routeInfo: {
            rwgpsRouteData: {type: 'route', route: { track_points: [], distance: 0}},
            gpxRouteData: null,
            loadingFromURL: false,
            type: 'rwgps'
          },
          forecast: {
            forecast: [{a:'1'}]
          },
        }
      });
    });
    // PaceTable should be available in the DOM (in sidePaneOptions)
    expect(screen.getByText('titles.paceAnalysis')).toBeTruthy();
  });

  test('wraps sidePaneOptions content in ErrorBoundary', async () => {
    await waitFor(() => {
      const { getAllByTestId } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, { preloadedState: defaultState });

      const errorBoundaries = getAllByTestId('error-boundary');
      expect(errorBoundaries.length).toBeGreaterThan(0);
    })
  });
});