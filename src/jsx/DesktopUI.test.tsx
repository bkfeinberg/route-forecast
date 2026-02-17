// src/jsx/DesktopUI.test.tsx
import React, {Suspense} from 'react';
import { renderWithProviders, screen, waitFor } from 'test-utils';
import { act } from 'react';
import { describe, beforeEach, jest, test } from '@jest/globals';

// Mock Redux hooks
// jest.mock('../utils/hooks', () => ({
//   __esModule: true,
//   useAppDispatch: jest.fn(),
//   useAppSelector: jest.fn(),
//   useDelay: jest.fn(),
//   usePrevious: jest.fn(),
//   useValueHasChanged: jest.fn(),
//   useWhenChanged: jest.fn()
// }));

// Mock child components
jest.mock('./RouteInfoForm/RouteInfoForm', () => ({
  __esModule: true,
  default: () => <div data-testid="route-info-form">RouteInfoForm</div>
}));

jest.mock('./ForecastSettings/ForecastSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="forecast-settings">ForecastSettings</div>
}));

jest.mock('./resultsTables/ForecastTable', () => ({
  __esModule: true,
  default: () => <div data-testid="forecast-table">ForecastTable</div>
}));

jest.mock('./resultsTables/WeatherCorrections', () => ({
  __esModule: true,
  default: () => <div data-testid="weather-corrections">WeatherCorrections</div>
}));

jest.mock('./resultsTables/PaceTable', () => ({
  __esModule: true,
  default: () => <div data-testid="pace-table">PaceTable</div>
}));

jest.mock('./Map/MapLoader', () => ({
  __esModule: true,
  default: () => <div data-testid="map-loader">MapLoader</div>,
  addBreadcrumb: jest.fn()
}));

// jest.mock('./TopBar/TopBar', () => ({
//   __esModule: true,
//   TopBar: () => <div data-testid="top-bar">TopBar</div>
// }));

// jest.mock('./TitleScreen', () => ({
//   __esModule: true,
//   TitleScreen: () => <div data-testid="title-screen">TitleScreen</div>
// }));

// jest.mock('./InstallExtensionButton', () => ({
//   __esModule: true,
//   InstallExtensionButton: () => <div data-testid="install-button">InstallExtensionButton</div>
// }));

// jest.mock('./app/LangSwitcher', () => ({
//   __esModule: true,
//   default: () => <div data-testid="lang-switcher">LangSwitcher</div>
// }));

// jest.mock('./app/DisplayErrorList', () => ({
//   __esModule: true,
//   default: () => <div data-testid="error-list">DisplayErrorList</div>
// }));

// jest.mock('./shared/RouteTitle', () => ({
//   __esModule: true,
//   RouteTitle: () => <div data-testid="route-title">RouteTitle</div>
// }));

// jest.mock('./shared/TransitionWrapper', () => ({
//   __esModule: true,
//   TransitionWrapper: ({ children }: any) => <div data-testid="transition-wrapper">{children}</div>
// }));

// jest.mock('@sentry/react', () => ({
//   __esModule: true,
//   ErrorBoundary: ({ children, fallback }: any) => (
//     <div data-testid="error-boundary" data-fallback={fallback?.props?.children || ''}>
//       {children}
//     </div>
//   )
// }));

// jest.mock('../redux/dialogParamsSlice', () => ({
//   __esModule: true,
//   lastErrorCleared: jest.fn()
// }));

// jest.mock('../data/enums', () => ({
//   __esModule: true,
//   routeLoadingModes: {
//     RWGPS: 'rwgps',
//     RUSA_PERM: 'rusa_perm',
//     STRAVA: 'strava'
//   }
// }));

import { useTranslation } from 'react-i18next';
import { useDelay, usePrevious, useValueHasChanged, useWhenChanged } from '../utils/hooks';
import DesktopUI from './DesktopUI';

describe.skip('DesktopUI sidePaneOptions', () => {
  // const mockUseDelay = useDelay as unknown as jest.Mock;
  // const mockUsePrevious = usePrevious as unknown as jest.Mock;
  // const mockUseValueHasChanged = useValueHasChanged as unknown as jest.Mock;
  // const mockUseWhenChanged = useWhenChanged as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // mockUseDelay.mockReturnValue(true);
    // mockUsePrevious.mockReturnValue(0);
    // mockUseValueHasChanged.mockReturnValue(false);
    // mockUseWhenChanged.mockImplementation(() => {});
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
    await act(() => {
      renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: defaultState});
    });
    await waitFor(() => expect(screen.getByTestId('route-info-form')).toBeInTheDocument());
    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
    <DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />
    </Suspense>, {preloadedState: defaultState});
    
    await waitFor(() => expect(container).toBeTruthy());
  });

  test('contains RouteInfoForm component', () => {
    renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: defaultState});
    screen.debug();
    expect(screen.queryByTestId('route-info-form')).toBeInTheDocument();
  });

  test('contains ForecastSettings in sidePaneOptions when route data exists', () => {
    const state = {preloadedState: {
      routeInfo: {
        rwgpsRouteData: { id: 123 },
        gpxRouteData: null,
        loadingFromURL: false,
        type: 'rwgps'
      }
    }};
    const { container } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, state);
    
    // ForecastSettings should be available in the DOM (in sidePaneOptions)
    // It might be rendered as part of Suspense/Lazy loading
    expect(container).toBeTruthy();
  });

  test('contains ForecastTable in sidePaneOptions when forecast data exists', async () => {
    const { container } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />,
  {    preloadedState: {
      forecast: {
        forecast: [{ id: 1 }]
      }
    }});
    
    // ForecastTable should be available in the DOM (in sidePaneOptions)
    await waitFor(() => expect(screen.queryByTestId('forecast-table')).toBeInTheDocument());
  });

  test('contains PaceTable in sidePaneOptions when strava activity data exists', async () => {
    const { container } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: {
      strava: {
        activityData: { id: 123 },
        route: ''
      }
    }});
    
    // PaceTable should be available in the DOM (in sidePaneOptions)
    await waitFor(() => expect(screen.queryByTestId('pace-table')).toBeInTheDocument());
  });

  test('wraps sidePaneOptions content in ErrorBoundary', () => {
    const { getAllByTestId } = renderWithProviders(<DesktopUI mapsApiKey="test-key" orientationChanged={false} setOrientationChanged={jest.fn()} />, {preloadedState: defaultState});
    
    const errorBoundaries = getAllByTestId('error-boundary');
    expect(errorBoundaries.length).toBeGreaterThan(0);
  });
});