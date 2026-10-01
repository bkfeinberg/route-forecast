// src/jsx/Map/RouteForecastMap.test.tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { findMarkerInfo } from './mapUtils';
import { milesToMeters } from '../../utils/util';
import RouteForecastMap, {
  ControlMarker,
  BoundSetter,
  MapHighlight,
  MapMarkers,
  RainIcon,
  RotatedArrow,
  TempMarker
} from './RouteForecastMap';
import { useAppSelector, useAppDispatch } from '../../utils/hooks';
import { useForecastDependentValues } from '../../utils/forecastValuesHook';
import { usePointsAndBounds } from '../../utils/routeHooks';
import { useTranslation } from 'react-i18next';

jest.mock('@sentry/react', () => ({
  __esModule: true,
  ErrorBoundary: ({ children }: any) => <>{children}</>,
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn()
  },
  captureException: jest.fn()
}));

jest.mock('@vis.gl/react-google-maps', () => {
  const React = require('react');
  const useApiIsLoadedMock = jest.fn(() => true);
  return {
    __esModule: true,
    APIProvider: jest.fn(({ children, onLoad }: any) => {
      React.useEffect(() => {
        onLoad?.();
      }, [onLoad]);
      return <div data-testid="api-provider">{children}</div>;
    }),
    Map: ({ children }: any) => <div data-testid="map">{children}</div>,
    InfoWindow: ({ children }: any) => <div data-testid="info-window">{children}</div>,
    useMap: jest.fn(() => ({})),
    useApiIsLoaded: useApiIsLoadedMock,
    useMapsLibrary: jest.fn(() => ({})),
    CollisionBehavior: {
      OPTIONAL_AND_HIDES_LOWER_PRIORITY: 'optional',
      REQUIRED_AND_HIDES_OPTIONAL: 'required'
    }
  };
});

jest.mock('../../utils/hooks', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(() => jest.fn())
}));

jest.mock('../../utils/forecastValuesHook', () => ({
  useForecastDependentValues: jest.fn(() => ({ calculatedControlPointValues: [] }))
}));

jest.mock('../../utils/routeHooks', () => ({
  usePointsAndBounds: jest.fn(() => ({ points: [], bounds: null }))
}));

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({ t: (key: string) => key, i18n: { language: 'en' } }))
}));

jest.mock('./polyline', () => ({
  Polyline: () => <div data-testid="polyline" />
}));

jest.mock('./SafeMarker', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <div data-testid="safe-marker" {...props}>{children}</div>
}));

const mockUseAppSelector = useAppSelector as jest.Mock;
const mockUseAppDispatch = useAppDispatch as jest.Mock;
const mockUseForecastDependentValues = useForecastDependentValues as jest.Mock;
const mockUsePointsAndBounds = usePointsAndBounds as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockedGoogleMaps = require('@vis.gl/react-google-maps');

class MockLatLngBounds {
  private values: any[] = [];

  extend(value: any) {
    this.values.push(value);
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

const buildState = () => ({
  controls: {
    metric: false,
    celsius: false,
    userControlPoints: []
  },
  forecast: {
    forecast: [{
      distance: 0,
      lat: 37.3,
      lon: -122.0,
      temp: 72,
      windBearing: 180,
      relBearing: 180,
      windSpeed: '5',
      time: '2024-01-01T00:00:00Z',
      zone: 'America/Los_Angeles',
      rainy: false
    }],
    range: [],
    zoomToRange: false,
    mapViewed: false
  },
  strava: {
    activityData: null,
    subrange: [],
    route: '',
    activityStream: null
  },
  uiInfo: {
    routeParams: {
      routeLoadingMode: 1,
      segment: [0, 0]
    }
  }
});

describe('findMarkerInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty array for null, undefined or empty forecast', () => {
    expect(findMarkerInfo(null as any, [0, 100])).toEqual([]);
    expect(findMarkerInfo(undefined as any, [0, 100])).toEqual([]);
    expect(findMarkerInfo([], [0, 100])).toEqual([]);
  });

  test('returns empty array for invalid subrange inputs', () => {
    const sample = [{ distance: 5 }];
    expect(findMarkerInfo(sample as any, null as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, undefined as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, [] as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, [100] as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, [1,2,3] as any)).toEqual([]);
  });

  test('filters out points with non-number distance', () => {
    const forecast = [
      { distance: 5 },
      { distance: 'nope' },
      { distance: null },
      { distance: 10 }
    ] as any;
    const res = findMarkerInfo(forecast, [0, 100000]);
    expect(res.length).toBe(2);
    expect(res.map((p:any) => p.distance)).toEqual([5,10]);
  });

  test('includes points at subrange boundaries (start and end)', () => {
    const a = { distance: 3 } as any;
    const b = { distance: 7 } as any;
    const start = Math.round(a.distance * (milesToMeters as number));
    const end = Math.round(b.distance * (milesToMeters as number));
    const resStart = findMarkerInfo([a], [start, start]);
    expect(resStart.length).toBe(1);
    expect(resStart[0].distance).toBe(3);
    const resEnd = findMarkerInfo([b], [end, end]);
    expect(resEnd.length).toBe(1);
    expect(resEnd[0].distance).toBe(7);
  });

  test('includes points whose distance in meters falls inside subrange', () => {
    const forecast = [
      { distance: 2 },
      { distance: 4 },
      { distance: 6 }
    ] as any;
    const subrange: [number, number] = [
      Math.round(3 * (milesToMeters as number)),
      Math.round(5 * (milesToMeters as number))
    ];
    const res = findMarkerInfo(forecast, subrange);
    expect(res.length).toBe(1);
    expect(res[0].distance).toBe(4);
  });

  test('excludes points below and above subrange', () => {
    const below = { distance: 1 } as any;
    const above = { distance: 20 } as any;
    const subrange: [number, number] = [
      Math.round(3 * (milesToMeters as number)),
      Math.round(10 * (milesToMeters as number))
    ];
    const res = findMarkerInfo([below, above], subrange);
    expect(res.length).toBe(0);
  });

  test('handles floating point and zero distances correctly', () => {
    const forecast = [
      { distance: 0 },
      { distance: 3.5 },
      { distance: 7.8 }
    ] as any;
    const subrange: [number, number] = [
      Math.round(0 * (milesToMeters as number)),
      Math.round(8 * (milesToMeters as number))
    ];
    const res = findMarkerInfo(forecast, subrange);
    expect(res.length).toBe(3);
    expect(res[0].distance).toBe(0);
    expect(res[1].distance).toBe(3.5);
    expect(res[2].distance).toBe(7.8);
  });

  test('preserves order and properties of matched points', () => {
    const forecast = [
      { distance: 7, lat: 1, lon: 1, temp: 70 },
      { distance: 3, lat: 2, lon: 2, temp: 72 },
      { distance: 5, lat: 3, lon: 3, temp: 68 }
    ] as any;
    const res = findMarkerInfo(forecast, [0, 1000000]);
    expect(res.length).toBe(3);
    expect(res[0].distance).toBe(7);
    expect(res[0].lat).toBe(1);
    expect(res[1].distance).toBe(3);
    expect(res[2].distance).toBe(5);
  });

  test('handles very large distance values', () => {
    const forecast = [
      { distance: 1000 },
      { distance: 5000 }
    ] as any;
    const subrange: [number, number] = [
      Math.round(500 * (milesToMeters as number)),
      Math.round(6000 * (milesToMeters as number))
    ];
    const res = findMarkerInfo(forecast, subrange);
    expect(res.length).toBe(2);
  });
});

describe('RouteForecastMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGoogleMaps.APIProvider.mockImplementation(({ children, onLoad }: any) => {
      React.useEffect(() => {
        onLoad?.();
      }, [onLoad]);
      return <div data-testid="api-provider">{children}</div>;
    });
    (globalThis as any).google = {
      maps: {
        LatLngBounds: MockLatLngBounds,
        places: { BusinessStatus: { OPERATIONAL: 'OPERATIONAL' } }
      }
    };
    mockUseAppDispatch.mockReturnValue(jest.fn());
    mockUseAppSelector.mockImplementation((selector: any) => selector(buildState()));
    mockUseForecastDependentValues.mockReturnValue({ calculatedControlPointValues: [] });
    mockUsePointsAndBounds.mockReturnValue({ points: undefined, bounds: null });
    mockUseTranslation.mockReturnValue({ t: (key: string) => key, i18n: { language: 'en' } });
    mockedGoogleMaps.useApiIsLoaded.mockReturnValue(true);
  });

  test('renders a placeholder when there are no map points', () => {
    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(screen.getByText('No map points to display')).toBeInTheDocument();
  });

  test('renders the map container when route data is available', () => {
    mockUsePointsAndBounds.mockReturnValue({
      points: [{ lat: 37.3, lng: -122.0, dist: 0 }],
      bounds: { min_latitude: 37.2, min_longitude: -122.1, max_latitude: 37.4, max_longitude: -122.0 }
    });

    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(screen.getByTestId('api-provider')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  test('renders the map UI once the API provider reports it is ready', async () => {
    mockUsePointsAndBounds.mockReturnValue({
      points: [{ lat: 37.3, lng: -122.0, dist: 0 }],
      bounds: { min_latitude: 37.2, min_longitude: -122.1, max_latitude: 37.4, max_longitude: -122.0 }
    });

    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(await screen.findByTestId('map')).toBeInTheDocument();
    expect(screen.getByTestId('polyline')).toBeInTheDocument();
  });

  test('renders an info window for matching forecast points', () => {
    mockUsePointsAndBounds.mockReturnValue({
      points: [{ lat: 37.3, lng: -122.0, dist: 0 }],
      bounds: { min_latitude: 37.2, min_longitude: -122.1, max_latitude: 37.4, max_longitude: -122.0 }
    });
    mockUseAppSelector.mockImplementation((selector: any) => {
      const state = {
        ...buildState(),
        forecast: {
          ...buildState().forecast,
          forecast: [{
            distance: 0,
            lat: 37.3,
            lon: -122.0,
            temp: 72,
            windBearing: 180,
            relBearing: 180,
            windSpeed: '5',
            time: '2024-01-01T00:00:00Z',
            zone: 'America/Los_Angeles',
            rainy: false
          }],
          range: [0, 100]
        }
      };
      return selector(state);
    });

    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(screen.getByTestId('info-window')).toBeInTheDocument();
    expect(screen.getByText(/data\.info\.temperature/i)).toBeInTheDocument();
  });

  test('renders rotated arrows with different color branches', () => {
    const { rerender } = render(<RotatedArrow rotation={45} relBearing={45} windSpeed={15} distance="5" />);
    const redPath = document.querySelector('path');
    expect(redPath).toHaveAttribute('fill', 'url(#gradualFill-5');

    rerender(<RotatedArrow rotation={180} relBearing={120} windSpeed={5} distance="7" />);
    const bluePath = document.querySelector('path');
    expect(bluePath).toHaveAttribute('fill', 'url(#gradualFill-7');
  });

  test('renders temperature, control, and rain markers from valid data', () => {
    render(<MapMarkers
      forecast={[buildState().forecast.forecast[0] as any]}
      controls={[{ lat: 37.31, lon: -122.01 } as any]}
      controlNames={['Cafe']}
      subrange={[]}
      metric={false}
    />);

    expect(screen.getAllByTestId('safe-marker')).toHaveLength(2);
    expect(screen.getByText('0')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getAllByTestId('safe-marker')[1]);
    expect(screen.getByTestId('info-window')).toHaveTextContent('Cafe');
  });

  test('skips invalid marker data and handles unloaded APIs', () => {
    mockedGoogleMaps.useApiIsLoaded.mockReturnValue(false);
    render(<>
      <MapMarkers forecast={[{} as any]} controls={[{} as any]} controlNames={[]} subrange={[]} metric={false} />
      <RainIcon latitude={1} longitude={2} value={3} title="Rain" isRainy={true} />
      <TempMarker latitude={1} longitude={2} value="3" title="Wind" bearing={20} relBearing={45} windSpeed="5" />
    </>);

    expect(screen.queryByTestId('safe-marker')).not.toBeInTheDocument();
    expect(screen.getByText('API not yet loaded, no rain icon')).toBeInTheDocument();
    expect(screen.getByText('API not yet loaded, no temperature marker')).toBeInTheDocument();
  });

  test('renders only rainy icons and handles control marker interaction', () => {
    render(<>
      <RainIcon latitude={1} longitude={2} value={3} title="Rain" isRainy={true} />
      <RainIcon latitude={1} longitude={2} value={3} title="Dry" isRainy={false} />
      <ControlMarker latitude={1} longitude={2} value="Market" />
    </>);

    const safeMarkers = screen.getAllByTestId('safe-marker');
    expect(safeMarkers).toHaveLength(2);
    fireEvent.mouseEnter(safeMarkers[1]);
    expect(screen.getByTestId('info-window')).toHaveTextContent('Market');
    fireEvent.mouseLeave(safeMarkers[1]);
    expect(screen.queryByTestId('info-window')).not.toBeInTheDocument();
  });

  test('renders both temperature marker wind branches', () => {
    const { rerender } = render(<TempMarker
      latitude={1} longitude={2} value="3" title="Wind" bearing={200}
      relBearing={45} windSpeed="5"
    />);
    expect(screen.getByTestId('safe-marker')).toBeInTheDocument();

    rerender(<TempMarker
      latitude={1} longitude={2} value="3" title="Calm" bearing={20}
      relBearing={120} windSpeed="3"
    />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('renders and skips map highlights based on subrange', () => {
    const points = [{ lat: 1, lng: 2, dist: 5 }, { lat: 2, lng: 3, dist: 15 }] as any;
    const { rerender } = render(<MapHighlight points={points} subrange={[]} />);
    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument();

    rerender(<MapHighlight points={points} subrange={[0, 10]} />);
    expect(screen.getByTestId('polyline')).toBeInTheDocument();
  });

  test('fits bounds after the Maps API is loaded', () => {
    const map = {
      fitBounds: jest.fn(),
      getZoom: jest.fn(() => 10),
      setZoom: jest.fn(),
      getDiv: jest.fn(() => document.createElement('div'))
    };
    mockedGoogleMaps.useMap.mockReturnValue(map);

    render(<BoundSetter
      points={[{ lat: 1, lng: 2, dist: 5 }] as any}
      controls={[]}
      userControlPoints={[]}
      bounds={{ min_latitude: 0, min_longitude: 0, max_latitude: 2, max_longitude: 2 }}
      subrange={[]}
    />);

    expect(map.fitBounds).toHaveBeenCalled();
    expect(map.setZoom).toHaveBeenCalledWith(9);
  });

  test('looks up business controls and records operational place status', async () => {
    const dispatch = jest.fn();
    const place = {
      id: 'place-1',
      businessStatus: 'OPERATIONAL',
      displayName: 'Cafe',
      formattedAddress: '1 Main St'
    };
    const searchByText = jest.fn().mockResolvedValue({ places: [place] });
    (globalThis as any).google.maps.places.Place = { searchByText };
    mockedGoogleMaps.useMap.mockReturnValue({
      fitBounds: jest.fn(),
      getZoom: jest.fn(() => 0),
      getDiv: jest.fn(() => document.createElement('div'))
    });
    mockedGoogleMaps.useMapsLibrary.mockReturnValue({});
    mockUseAppDispatch.mockReturnValue(dispatch);
    mockUseAppSelector.mockImplementation((selector: any) => selector({
      ...buildState(),
      controls: {
        ...buildState().controls,
        userControlPoints: [{ business: 'Cafe', lat: 1, lon: 2, distance: 5 }]
      }
    }));

    render(<BoundSetter
      points={[{ lat: 1, lng: 2, dist: 5 }] as any}
      controls={[{ distance: 5, arrival: 'Mon, Jan 01 2024 8:00AM' } as any]}
      userControlPoints={[{ business: 'Cafe', lat: 1, lon: 2, distance: 5 } as any]}
      bounds={{ min_latitude: 0, min_longitude: 0, max_latitude: 2, max_longitude: 2 }}
      subrange={[]}
    />);

    await waitFor(() => expect(searchByText).toHaveBeenCalledWith(expect.objectContaining({ textQuery: 'Cafe' })));
    expect(dispatch).toHaveBeenCalled();
  });

  test('renders the fallback when no forecast is available for a non-Strava route', () => {
    mockUseAppSelector.mockImplementation((selector: any) => selector({
      ...buildState(),
      forecast: { ...buildState().forecast, forecast: [] }
    }));
    mockUsePointsAndBounds.mockReturnValue({
      points: [{ lat: 37.3, lng: -122.0, dist: 0 }],
      bounds: { min_latitude: 37.2, min_longitude: -122.1, max_latitude: 37.4, max_longitude: -122.0 }
    });

    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(screen.getByText('titles.map')).toBeInTheDocument();
  });

  test('keeps the map available while a Strava route is loading', () => {
    mockUseAppSelector.mockImplementation((selector: any) => selector({
      ...buildState(),
      forecast: { ...buildState().forecast, forecast: [] },
      uiInfo: { routeParams: { routeLoadingMode: 2, segment: [0, 0] } }
    }));
    mockUsePointsAndBounds.mockReturnValue({
      points: [{ lat: 37.3, lng: -122.0, dist: 0 }],
      bounds: { min_latitude: 37.2, min_longitude: -122.1, max_latitude: 37.4, max_longitude: -122.0 }
    });

    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  test('shows the initializing state before the Maps API reports readiness', () => {
    const originalApiProvider = mockedGoogleMaps.APIProvider.getMockImplementation();
    mockedGoogleMaps.APIProvider.mockImplementation(({ children }: any) => (
      <div data-testid="api-provider">{children}</div>
    ));
    mockUsePointsAndBounds.mockReturnValue({
      points: [{ lat: 37.3, lng: -122.0, dist: 0 }],
      bounds: { min_latitude: 37.2, min_longitude: -122.1, max_latitude: 37.4, max_longitude: -122.0 }
    });

    render(<RouteForecastMap maps_api_key="test-key" />);

    expect(screen.getByText('Initializing map...')).toBeInTheDocument();
    mockedGoogleMaps.APIProvider.mockImplementation(originalApiProvider);
  });
});