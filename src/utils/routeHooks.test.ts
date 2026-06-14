import { calculateWindResult, ExpandedWindResult, usePointsAndBounds } from './routeHooks';
import type { ControlsState } from '../redux/controlsSlice';
import type { RouteInfoState } from '../redux/routeInfoSlice';
import type { WindAdjustResults, Point } from './gpxParser';
import { DateTime } from 'luxon';
import { useAppSelector } from './hooks';
import { routeLoadingModes } from '../data/enums';

// Mock the gpxParser module
jest.mock('./gpxParser', () => ({
  __esModule: true,
  default: {
    adjustForWind: jest.fn(),
    computePointsAndBounds: jest.fn(),
    parseGpxRouteStream: jest.fn(),
    parseRwgpsRouteStream: jest.fn(),
    walkRwgpsRoute: jest.fn(),
  }
}));

// Mock the stravaRouteParser module
jest.mock('./stravaRouteParser', () => ({
  __esModule: true,
  default: {
    computePointsAndBounds: jest.fn(),
  }
}));

// Mock the routeUtils module
jest.mock('./routeUtils');

// Mock the hooks module to avoid Redux dependency
jest.mock('./hooks', () => ({
  useAppSelector: jest.fn(),
}));

describe('routeHooks', () => {
  describe('calculateWindResult', () => {
    let mockGpxParser: any;
    let mockRouteUtils: any;

    beforeEach(() => {
      jest.clearAllMocks();
      // Get the mocked modules
      mockGpxParser = require('./gpxParser').default;
      mockRouteUtils = require('./routeUtils');
    });

    it('should return cached result when dependencies have not changed', () => {
      const mockControls: ControlsState = {
        userControlPoints: [],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: null,
        routeUUID: null,
      } as unknown as RouteInfoState;

      const expectedResult: ExpandedWindResult = {
        weatherCorrectionMinutes: 0,
        calculatedControlPointValues: [],
        maxGustSpeed: 0,
        finishTime: null,
        adjustedTimes: [],
        chartData: [],
        timeFromHills: 0,
      };

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [],
        segment: null,
      };

      // First call
      const result1 = calculateWindResult(inputs);
      expect(result1).toEqual(expectedResult);

      // Second call with same inputs should return the cached result
      const result2 = calculateWindResult(inputs);
      expect(result2).toBe(result1); // Should be the exact same object reference
    });

    it('should recalculate when dependencies change', () => {
      const mockControls: ControlsState = {
        userControlPoints: [],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: null,
        routeUUID: null,
      } as unknown as RouteInfoState;

      const mockWindAdjustResult: WindAdjustResults = {
        weatherCorrectionMinutes: 5,
        calculatedControlPointValues: [{
            distance: 10, adjustedTime: '2h',
            arrival: '',
            banked: 0,
            val: 0
        }],
        maxGustSpeed: 15,
        finishTime: '3h',
        adjustedTimes: [
          { time: DateTime.now(), index: 0 },
          { time: DateTime.now().plus({ hours: 1 }), index: 1 },
          { time: DateTime.now().plus({ hours: 2 }), index: 2 }
        ],
        chartData: [],
      };

      // Mock getRouteInfo
      mockRouteUtils.getRouteInfo.mockReturnValue({
        points: [
          { lat: 40.7128, lon: -74.0060 },
          { lat: 40.7138, lon: -74.0050 },
        ],
        values: [],
        finishTime: '2h',
        totalDistMeters: 10000,
      });

      // Mock adjustForWind
      mockGpxParser.adjustForWind.mockReturnValue(mockWindAdjustResult);

      const mockRouteData = {
        type: 'route',
        track_points: [],
      } as any;

      const mockRouteInfoWithData: RouteInfoState = {
        ...mockRouteInfo,
        gpxRouteData: mockRouteData,
      };

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfoWithData,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [{
          temp: '20',
          feel: 18,
          humidity: 65,
          zone: 'UTC',
          distance: 0,
          cloudCover: '50%',
          windSpeed: '10 mph',
          gust: '15 mph',
          relBearing: 45,
          windBearing: 180,
          time: '2026-05-22T00:00:00Z',
          isControl: false,
          precip: '0',
          lat: 40.7128,
          lon: -74.0060,
          rainy: false,
        }],
        segment: null,
      };

      const result = calculateWindResult(inputs);

      expect(mockRouteUtils.getRouteInfo).toHaveBeenCalled();
      expect(mockGpxParser.adjustForWind).toHaveBeenCalled();
      expect(result.weatherCorrectionMinutes).toBe(5);
      expect(result.maxGustSpeed).toBe(15);
    });

    it('should return default result when routeInfo is null', () => {
      const mockControls: ControlsState = {
        userControlPoints: [],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: null,
        routeUUID: null,
      } as unknown as RouteInfoState;

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [],
        segment: null,
      };

      const result = calculateWindResult(inputs);

      expect(result.weatherCorrectionMinutes).toBe(0);
      expect(result.calculatedControlPointValues).toEqual([]);
      expect(result.maxGustSpeed).toBe(0);
      expect(result.finishTime).toBe(null);
      expect(result.adjustedTimes).toEqual([]);
      expect(result.chartData).toEqual([]);
    });

    it('should sort control points and values by distance', () => {
      const mockControls: ControlsState = {
        userControlPoints: [
          { distance: 30 } as any,
          { distance: 10 } as any,
          { distance: 20 } as any,
        ],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: {
          type: 'route',
          route: { track_points: [] },
        } as any,
        routeUUID: 'test-uuid',
      } as unknown as RouteInfoState;

      mockRouteUtils.getRouteInfo.mockReturnValue({
        points: [],
        values: [
          { distance: 25 } as any,
          { distance: 5 } as any,
          { distance: 15 } as any,
        ],
        finishTime: '2h',
        totalDistMeters: 10000,
      });

      mockGpxParser.adjustForWind.mockReturnValue({
        weatherCorrectionMinutes: 0,
        calculatedControlPointValues: [],
        maxGustSpeed: 0,
        finishTime: '2h',
        adjustedTimes: [],
        chartData: [],
      });

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [{
          temp: '20',
          feel: 18,
          humidity: 65,
          zone: 'UTC',
          distance: 0,
          cloudCover: '50%',
          windSpeed: '10 mph',
          gust: '15 mph',
          relBearing: 45,
          windBearing: 180,
          time: '2026-05-22T00:00:00Z',
          isControl: false,
          precip: '0',
          lat: 40.7128,
          lon: -74.0060,
          rainy: false,
        }],
        segment: null,
      };

      calculateWindResult(inputs);

      // Verify that adjustForWind was called with sorted values
      const adjustForWindCall = mockGpxParser.adjustForWind.mock.calls[0];
      const sortedValues = adjustForWindCall[4];

      expect(sortedValues[0].distance).toBeLessThanOrEqual(sortedValues[1].distance);
      expect(sortedValues[1].distance).toBeLessThanOrEqual(sortedValues[2].distance);
    });

    it('should handle rwgpsRouteData when gpxRouteData is null', () => {
      const mockControls: ControlsState = {
        userControlPoints: [{ distance: 10 } as any],
      } as unknown as ControlsState;

      const mockRouteData = {
        type: 'route',
        route: { track_points: [] },
      } as any;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: mockRouteData,
        routeUUID: 'rwgps-uuid',
      } as unknown as RouteInfoState;

      mockRouteUtils.getRouteInfo.mockReturnValue({
        points: [{ lat: 40.7128, lon: -74.0060 }],
        values: [{ distance: 10, arrival: '1h', banked: 0, val: 0 } as any],
        finishTime: '1h',
        totalDistMeters: 10000,
      });

      mockGpxParser.adjustForWind.mockReturnValue({
        weatherCorrectionMinutes: 2,
        calculatedControlPointValues: [{ distance: 10, adjustedTime: '1h 2m', arrival: '1h', banked: 0, val: 0 }],
        maxGustSpeed: 10,
        finishTime: '1h 2m',
        adjustedTimes: [{ time: DateTime.now(), index: 0 }],
        chartData: [],
      });

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 1000, zone: 'America/New_York', pace: '9:00', interval: 2 },
        timeZoneId: 'America/New_York',
        forecast: [{
          temp: '22',
          feel: 20,
          humidity: 60,
          zone: 'America/New_York',
          distance: 0,
          cloudCover: '40%',
          windSpeed: '12 mph',
          gust: '18 mph',
          relBearing: 90,
          windBearing: 200,
          time: '2026-05-15T12:00:00Z',
          isControl: false,
          precip: '0',
          lat: 40.7128,
          lon: -74.0060,
          rainy: false,
        }],
        segment: null,
      };

      const result = calculateWindResult(inputs);

      expect(mockRouteUtils.getRouteInfo).toHaveBeenCalledWith(
        mockRouteData,
        1000,
        'America/New_York',
        '9:00',
        2,
        mockControls.userControlPoints,
        null,
        'rwgps-uuid'
      );
      expect(result.weatherCorrectionMinutes).toBe(2);
      expect(result.maxGustSpeed).toBe(10);
    });

    it('should cache results until dependency changes', () => {
      const mockControls: ControlsState = {
        userControlPoints: [],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: null,
        routeUUID: 'cache-test',
      } as unknown as RouteInfoState;

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [],
        segment: null,
      };

      // Call 1
      const result1 = calculateWindResult(inputs);

      // Call 2 with same inputs
      const result2 = calculateWindResult(inputs);
      expect(result1).toBe(result2); // Same reference

      // Call 3 with different pace
      const inputsWithNewPace = {
        ...inputs,
        routeParams: { ...inputs.routeParams, pace: '11:00' },
      };
      const result3 = calculateWindResult(inputsWithNewPace);
      expect(result3).not.toBe(result1); // Different object
    });

    it('should invalidate cache when timeZoneId changes', () => {
      const mockControls: ControlsState = {
        userControlPoints: [],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: null,
        routeUUID: 'tz-test',
      } as unknown as RouteInfoState;

      const inputs1 = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [],
        segment: null,
      };

      calculateWindResult(inputs1);

      const inputs2 = {
        ...inputs1,
        timeZoneId: 'America/New_York',
      };

      const result2 = calculateWindResult(inputs2);

      // Verify the result is recalculated (we're just checking it returns a valid result)
      expect(result2).toBeDefined();
      expect(result2.finishTime).toBe(null);
    });

    it('should pass correct parameters to adjustForWind', () => {
      const mockControls: ControlsState = {
        userControlPoints: [
          { distance: 5000, name: 'CP1' } as any,
          { distance: 15000, name: 'CP2' } as any,
        ],
      } as unknown as ControlsState;

      const mockRouteData = {
        type: 'gpx',
        track_points: [],
      } as any;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: mockRouteData,
        rwgpsRouteData: null,
        routeUUID: 'param-test',
      } as unknown as RouteInfoState;

      const mockPoints = [
        { lat: 40.7128, lon: -74.0060 },
        { lat: 40.7138, lon: -74.0050 },
      ];

      const mockValues = [
        { distance: 0, arrival: '12:00', banked: 0, val: 0 } as any,
        { distance: 5000, arrival: '12:30', banked: 0, val: 0 } as any,
        { distance: 15000, arrival: '13:30', banked: 0, val: 0 } as any,
      ];

      mockRouteUtils.getRouteInfo.mockReturnValue({
        points: mockPoints,
        values: mockValues,
        finishTime: '1h 30m',
        totalDistMeters: 20000,
      });

      mockGpxParser.adjustForWind.mockReturnValue({
        weatherCorrectionMinutes: 0,
        calculatedControlPointValues: [],
        maxGustSpeed: 0,
        finishTime: '1h 30m',
        adjustedTimes: [],
        chartData: [],
      });

      const mockForecast = [{
        temp: '20',
        feel: 18,
        humidity: 50,
        zone: 'UTC',
        distance: 0,
        cloudCover: '50%',
        windSpeed: '10 mph',
        gust: '15 mph',
        relBearing: 45,
        windBearing: 180,
        time: '2026-05-22T00:00:00Z',
        isControl: false,
        precip: '0',
        lat: 40.7128,
        lon: -74.0060,
        rainy: false,
      }];
      const startTimestamp = Date.now();
      const zone = 'UTC';
      const pace = '10:00';

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp, zone, pace, interval: 1 },
        timeZoneId: zone,
        forecast: mockForecast,
        segment: null,
      };

      calculateWindResult(inputs);

      // Verify adjustForWind was called with correct parameters
      expect(mockGpxParser.adjustForWind).toHaveBeenCalled();
      const callArgs = mockGpxParser.adjustForWind.mock.calls[0];
      
      expect(callArgs[0]).toEqual(mockForecast); // forecast
      expect(callArgs[1]).toEqual(mockPoints); // points
      expect(callArgs[2]).toBe(pace); // pace
      // callArgs[3] should be sorted controls
      expect(callArgs[3][0].distance).toBe(5000);
      expect(callArgs[3][1].distance).toBe(15000);
      // callArgs[4] should be sorted values
      expect(callArgs[4][0].distance).toBe(0);
      expect(callArgs[4][1].distance).toBe(5000);
      expect(callArgs[4][2].distance).toBe(15000);
    });

    it('should handle empty forecast gracefully', () => {
      const mockControls: ControlsState = {
        userControlPoints: [],
      } as unknown as ControlsState;

      const mockRouteInfo: RouteInfoState = {
        gpxRouteData: null,
        rwgpsRouteData: null,
        routeUUID: 'empty-forecast',
      } as unknown as RouteInfoState;

      const inputs = {
        controls: mockControls,
        routeInfo: mockRouteInfo,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [],
        segment: null,
      };

      const result = calculateWindResult(inputs);

      expect(result).toBeDefined();
      expect(result.finishTime).toBe(null);
      expect(result.weatherCorrectionMinutes).toBe(0);
    });

    it('should return valid result with minimal data', () => {
      const inputs = {
        controls: { userControlPoints: [] } as unknown as ControlsState,
        routeInfo: {
          gpxRouteData: null,
          rwgpsRouteData: null,
          routeUUID: 'minimal',
        } as unknown as RouteInfoState,
        routeParams: { startTimestamp: 0, zone: 'UTC', pace: '10:00', interval: 1 },
        timeZoneId: 'UTC',
        forecast: [],
        segment: null,
      };

      const result = calculateWindResult(inputs);

      // Verify the result has all required properties
      expect(result).toHaveProperty('weatherCorrectionMinutes');
      expect(result).toHaveProperty('calculatedControlPointValues');
      expect(result).toHaveProperty('maxGustSpeed');
      expect(result).toHaveProperty('finishTime');
      expect(result).toHaveProperty('adjustedTimes');
      expect(result).toHaveProperty('chartData');
      expect(Array.isArray(result.adjustedTimes)).toBe(true);
      expect(Array.isArray(result.chartData)).toBe(true);
    });
  });

  describe('usePointsAndBounds', () => {
    let mockGpxParser: any;
    let mockStravaParser: any;
    let mockUseAppSelector: jest.MockedFunction<typeof useAppSelector>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockGpxParser = require('./gpxParser').default;
      mockStravaParser = require('./stravaRouteParser').default;
      mockUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;
    });

    it('should return default empty bounds when no route data is available', () => {
      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: null, gpxRouteData: null },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.RWGPS, rwgpsRoute: '' } },
          strava: { route: '', activityStream: null },
        };
        return selector(state);
      });

      const result = usePointsAndBounds();

      expect(result.pointList).toEqual([]);
      expect(result.points).toBeUndefined();
      expect(result.bounds).toEqual({
        min_latitude: 90,
        min_longitude: 180,
        max_latitude: -90,
        max_longitude: -180,
      });
    });

    it('should process STRAVA mode with activityStream', () => {
      const mockPoints: Point[] = [
        { lat: 40.7128, lon: -74.0060, dist: 0, elevation: 10 },
        { lat: 40.7138, lon: -74.0050, dist: 100, elevation: 12 },
      ];
      const mockBounds = {
        min_latitude: 40.7128,
        min_longitude: -74.0060,
        max_latitude: 40.7138,
        max_longitude: -74.0050,
      };
      const mockActivityStream = { latlng: [[40.7128, -74.0060], [40.7138, -74.0050]] };

      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: null, gpxRouteData: null },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.STRAVA, rwgpsRoute: '' } },
          strava: { route: 'strava-route-123', activityStream: mockActivityStream },
        };
        return selector(state);
      });

      mockStravaParser.computePointsAndBounds.mockReturnValue({
        pointList: mockPoints,
        bounds: mockBounds,
      });

      const result = usePointsAndBounds();

      expect(mockStravaParser.computePointsAndBounds).toHaveBeenCalledWith(mockActivityStream);
      expect(result.pointList).toEqual(mockPoints);
      expect(result.bounds).toEqual(mockBounds);
      expect(result.points).toEqual([
        { lat: 40.7128, lng: -74.0060, dist: 0 },
        { lat: 40.7138, lng: -74.0050, dist: 100 },
      ]);
    });

    it('should process STRAVA mode with stravaRoute and gpxRouteData when activityStream is null', () => {
      const mockGpxData = 'mock-gpx-string';
      const mockPoints: Point[] = [
        { lat: 40.7128, lon: -74.0060, dist: 0, elevation: 10 },
        { lat: 40.7138, lon: -74.0050, dist: 100, elevation: 12 },
      ];
      const mockBounds = {
        min_latitude: 40.7128,
        min_longitude: -74.0060,
        max_latitude: 40.7138,
        max_longitude: -74.0050,
      };

      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: null, gpxRouteData: mockGpxData },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.STRAVA, rwgpsRoute: '' } },
          strava: { route: 'strava-route-456', activityStream: null },
        };
        return selector(state);
      });

      mockGpxParser.parseGpxRouteStream.mockReturnValue(mockPoints);
      mockGpxParser.computePointsAndBounds.mockReturnValue({
        pointList: mockPoints,
        bounds: mockBounds,
      });

      const result = usePointsAndBounds();

      expect(mockGpxParser.parseGpxRouteStream).toHaveBeenCalledWith(mockGpxData);
      expect(mockGpxParser.computePointsAndBounds).toHaveBeenCalledWith(mockPoints);
      expect(result.pointList).toEqual(mockPoints);
      expect(result.bounds).toEqual(mockBounds);
    });

    it('should process RWGPS mode with rwgpsRouteData', () => {
      const mockRwgpsData = {
        type: 'route',
        route: { track_points: [{ lat: 40.7128, lon: -74.0060 }] },
      };
      const mockPoints: Point[] = [
        { lat: 40.7128, lon: -74.0060, dist: 0, elevation: 10 },
        { lat: 40.7138, lon: -74.0050, dist: 100, elevation: 12 },
      ];
      const mockBounds = {
        min_latitude: 40.7128,
        min_longitude: -74.0060,
        max_latitude: 40.7138,
        max_longitude: -74.0050,
      };

      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: mockRwgpsData, gpxRouteData: null },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.RWGPS, rwgpsRoute: 'rwgps-123' } },
          strava: { route: '', activityStream: null },
        };
        return selector(state);
      });

      mockGpxParser.parseRwgpsRouteStream.mockReturnValue(mockPoints);
      mockGpxParser.computePointsAndBounds.mockReturnValue({
        pointList: mockPoints,
        bounds: mockBounds,
      });

      const result = usePointsAndBounds();

      expect(mockGpxParser.parseRwgpsRouteStream).toHaveBeenCalledWith(mockRwgpsData);
      expect(mockGpxParser.computePointsAndBounds).toHaveBeenCalledWith(mockPoints);
      expect(result.pointList).toEqual(mockPoints);
      expect(result.bounds).toEqual(mockBounds);
    });

    it('should process GPX mode when rwgpsRouteData is null', () => {
      const mockGpxData = 'mock-gpx-string';
      const mockPoints: Point[] = [
        { lat: 40.7128, lon: -74.0060, dist: 0, elevation: 10 },
        { lat: 40.7138, lon: -74.0050, dist: 100, elevation: 12 },
      ];
      const mockBounds = {
        min_latitude: 40.7128,
        min_longitude: -74.0060,
        max_latitude: 40.7138,
        max_longitude: -74.0050,
      };

      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: null, gpxRouteData: mockGpxData },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.RWGPS, rwgpsRoute: '' } },
          strava: { route: '', activityStream: null },
        };
        return selector(state);
      });

      mockGpxParser.parseGpxRouteStream.mockReturnValue(mockPoints);
      mockGpxParser.computePointsAndBounds.mockReturnValue({
        pointList: mockPoints,
        bounds: mockBounds,
      });

      const result = usePointsAndBounds();

      expect(mockGpxParser.parseGpxRouteStream).toHaveBeenCalledWith(mockGpxData);
      expect(mockGpxParser.computePointsAndBounds).toHaveBeenCalledWith(mockPoints);
      expect(result.pointList).toEqual(mockPoints);
      expect(result.bounds).toEqual(mockBounds);
    });

    it('should map pointList to points with correct property names', () => {
      const mockPoints: Point[] = [
        { lat: 40.7128, lon: -74.0060, dist: 0, elevation: 10 },
        { lat: 40.7138, lon: -74.0050, dist: 100, elevation: 12 },
        { lat: 40.7148, lon: -74.0040, dist: 200, elevation: 11 },
      ];
      const mockBounds = {
        min_latitude: 40.7128,
        min_longitude: -74.0060,
        max_latitude: 40.7148,
        max_longitude: -74.0040,
      };

      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: null, gpxRouteData: 'gpx-data' },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.RWGPS, rwgpsRoute: '' } },
          strava: { route: '', activityStream: null },
        };
        return selector(state);
      });

      mockGpxParser.parseGpxRouteStream.mockReturnValue(mockPoints);
      mockGpxParser.computePointsAndBounds.mockReturnValue({
        pointList: mockPoints,
        bounds: mockBounds,
      });

      const result = usePointsAndBounds();

      expect(result.points).toHaveLength(3);
      expect(result.points?.[0]).toEqual({ lat: 40.7128, lng: -74.0060, dist: 0 });
      expect(result.points?.[1]).toEqual({ lat: 40.7138, lng: -74.0050, dist: 100 });
      expect(result.points?.[2]).toEqual({ lat: 40.7148, lng: -74.0040, dist: 200 });
    });

    it('should set points to undefined when pointList is empty', () => {
      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: null, gpxRouteData: null },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.RWGPS, rwgpsRoute: '' } },
          strava: { route: '', activityStream: null },
        };
        return selector(state);
      });

      const result = usePointsAndBounds();

      expect(result.pointList).toEqual([]);
      expect(result.points).toBeUndefined();
    });

    it('should prefer rwgpsRouteData over gpxRouteData when both are present', () => {
      const mockRwgpsData = {
        type: 'route',
        route: { track_points: [{ lat: 40.7128, lon: -74.0060 }] },
      };
      const mockGpxData = 'mock-gpx-string';
      const mockPoints: Point[] = [
        { lat: 40.7128, lon: -74.0060, dist: 0, elevation: 10 },
        { lat: 40.7138, lon: -74.0050, dist: 100, elevation: 12 },
      ];
      const mockBounds = {
        min_latitude: 40.7128,
        min_longitude: -74.0060,
        max_latitude: 40.7138,
        max_longitude: -74.0050,
      };

      mockUseAppSelector.mockImplementation((selector: any) => {
        const state = {
          routeInfo: { rwgpsRouteData: mockRwgpsData, gpxRouteData: mockGpxData },
          uiInfo: { routeParams: { routeLoadingMode: routeLoadingModes.RWGPS, rwgpsRoute: 'rwgps-123' } },
          strava: { route: '', activityStream: null },
        };
        return selector(state);
      });

      mockGpxParser.parseRwgpsRouteStream.mockReturnValue(mockPoints);
      mockGpxParser.computePointsAndBounds.mockReturnValue({
        pointList: mockPoints,
        bounds: mockBounds,
      });

      const result = usePointsAndBounds();

      expect(mockGpxParser.parseRwgpsRouteStream).toHaveBeenCalledWith(mockRwgpsData);
      expect(mockGpxParser.parseGpxRouteStream).not.toHaveBeenCalled();
      expect(result.pointList).toEqual(mockPoints);
    });
  });
});
