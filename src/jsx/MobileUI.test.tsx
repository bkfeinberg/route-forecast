// src/jsx/MobileUI.test.tsx
import { renderWithProviders, screen, waitFor } from 'test-utils';
import { describe, beforeEach, jest, test } from '@jest/globals';
import userEvent from '@testing-library/user-event';

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

import MobileUI from './MobileUI';
import { DateTime } from 'luxon';

describe('MobileUI tabs/navigation', () => {

  beforeEach(() => {
    jest.clearAllMocks();    
  });

  const defaultState = {
    routeInfo: {
      rwgpsRouteData: null,
      gpxRouteData: null,
      loadingFromURL: false,
      type: 'rwgps',
      canDoUserSegment: true,
      distanceInKm: 0,
      country: 'US'
    },
    controls:{
      metric:false,
      celsius:false,
      userControlPoints: [],
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

  test('MobileUI component renders without errors', async () => {
    await waitFor(() => {
      const {container} = renderWithProviders(<MobileUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: defaultState});
      expect(container).toBeTruthy();
    });
    expect(screen.getByTitle(/randoplan/i)).toBeInTheDocument();
    expect(screen.getByText(/data\.loading/i)).toBeInTheDocument();
  });

  test('navigates to /controlPoints and shows ForecastSettings when route data exists', async () => {
    await waitFor(() => {
      const {container} = renderWithProviders(<MobileUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {
        preloadedState: {
          ...defaultState,
          routeInfo: {
            ...defaultState.routeInfo,
            rwgpsRouteData: {type: 'route', route: { track_points: [], distance: 0}},
          },
          uiInfo: {
            ...defaultState.uiInfo,
            routeParams: {
              ...defaultState.uiInfo.routeParams,
              startTimestamp: futureTimestamp,
            }
          }
        }
      });
      expect(container).toBeTruthy();
    });

    const settings = await screen.findByText('Loading forecast settings...');
    expect(settings).toBeTruthy();
    // expect(screen.getByText('titles.forecastSettings')).toBeTruthy();
  });

    test('navigates to /forecastTable and shows ForecastTable when forecast data exists', async () => {
        const user = userEvent.setup();

      await waitFor(() => {
        renderWithProviders(<MobileUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {
          preloadedState: {
            ...defaultState,
            routeInfo: {
              ...defaultState.routeInfo,
              rwgpsRouteData: {type: 'route', route: { track_points: [], distance: 30}},
              distanceInKm: 30,
              canDoUserSegment: true,
              country: 'US'
            },
            forecast: {
              forecast: [{
                "time": "2026-02-20T07:00:00.000-08:00",
                "zone": "America/Los_Angeles",
                "distance": 0,
                "summary": "Mainly clear, partly cloudy, and overcast",
                "precip": "1.0%",
                "humidity": 76,
                "cloudCover": "100.0%",
                "windSpeed": "6",
                "lat": 37.37564,
                "lon": -122.11944,
                "temp": "40",
                "relBearing": 130.10084533691406,
                "rainy": false,
                "windBearing": 230,
                "vectorBearing": 0,
                "gust": "6",
                "feel": 34,
                "isControl": false
              },
              {
                "time": "2026-02-20T08:00:00.000-08:00",
                "zone": "America/Los_Angeles",
                "distance": 15,
                "summary": "Mainly clear, partly cloudy, and overcast",
                "precip": "0.0%",
                "humidity": 65,
                "cloudCover": "100.0%",
                "windSpeed": "3",
                "lat": 37.4353,
                "lon": -122.28601,
                "temp": "42",
                "relBearing": 50.684601010775964,
                "rainy": false,
                "windBearing": 243,
                "vectorBearing": 294.1196138281588,
                "gust": "3",
                "feel": 37,
                "isControl": true
              }], valid: true, timeZoneId: 'America/Los_Angeles',
              tableViewed: false, mapViewed: false, weatherProvider: 'nws', zoomToRange: true,
              fetchAqi: false, range: []
            },
            uiInfo: {
              ...defaultState.uiInfo,
              routeParams: {
                ...defaultState.uiInfo.routeParams,
                startTimestamp: futureTimestamp,
              }
            }
          }
        });
      });

        const forecastButtons = screen.getAllByRole('button', { name: /forecast/i })
        await user.click(forecastButtons[0]);
        expect(screen.getByRole('table')).toBeTruthy();
    });

  test('navigates to /paceTable and shows PaceTable when strava activity data exists', async () => {
    const user = userEvent.setup();
    await waitFor(() => {
      renderWithProviders(<MobileUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {
        preloadedState: {
          ...defaultState,
          routeInfo: {
            ...defaultState.routeInfo,
            rwgpsRouteData: { type: 'route', route: { track_points: [], distance: 30 } },
            distanceInKm: 30,
            canDoUserSegment: true,
            country: 'US'
          },
          forecast: {
            forecast: [{
              "time": "2026-02-20T07:00:00.000-08:00",
              "zone": "America/Los_Angeles",
              "distance": 0,
              "summary": "Mainly clear, partly cloudy, and overcast",
              "precip": "1.0%",
              "humidity": 76,
              "cloudCover": "100.0%",
              "windSpeed": "6",
              "lat": 37.37564,
              "lon": -122.11944,
              "temp": "40",
              "relBearing": 130.10084533691406,
              "rainy": false,
              "windBearing": 230,
              "vectorBearing": 0,
              "gust": "6",
              "feel": 34,
              "isControl": false
            },
            {
              "time": "2026-02-20T08:00:00.000-08:00",
              "zone": "America/Los_Angeles",
              "distance": 15,
              "summary": "Mainly clear, partly cloudy, and overcast",
              "precip": "0.0%",
              "humidity": 65,
              "cloudCover": "100.0%",
              "windSpeed": "3",
              "lat": 37.4353,
              "lon": -122.28601,
              "temp": "42",
              "relBearing": 50.684601010775964,
              "rainy": false,
              "windBearing": 243,
              "vectorBearing": 294.1196138281588,
              "gust": "3",
              "feel": 37,
              "isControl": true
            }], valid: true, timeZoneId: 'America/Los_Angeles',
            tableViewed: false, mapViewed: false, weatherProvider: 'nws', zoomToRange: true,
            fetchAqi: false, range: []
          },
          uiInfo: {
            ...defaultState.uiInfo,
            routeParams: {
              ...defaultState.uiInfo.routeParams,
              startTimestamp: futureTimestamp,
            }
          },
          strava: {
            activityData: {
              totalElevationGain: 500, elapsed_time: 3600, average_speed: 6.4,
              total_elevation_gain: 500, distance: 64000, start_date: "2025-09-22T15:42:24Z"
            },
            activityStream: { time: {data: [0, 1, 2]}, distance: {data: [0, 1, 1]}, altitude: {data: [0, 10, 20]}, moving: {data: [true, true, false]} },
            route: '',
            analysisInterval: 1,
            subrange: []
          },
        }
      });
    });

    const paceButtons = screen.getAllByRole('button', { name: /strava/i })
    await user.click(paceButtons[0]);

    expect(screen.getByRole('table')).toBeTruthy();
  });

  test('wraps tabs content in ErrorBoundary', async () => {
    await waitFor(() => {
      const { getAllByTestId } = renderWithProviders(<MobileUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, { preloadedState: defaultState });

      const errorBoundaries = getAllByTestId('error-boundary');
      expect(errorBoundaries.length).toBeGreaterThan(0);
    })
  });

});
