import {
  getRouteInfo,
  getForecastRequest,
  removeDuplicateControl,
  extractControlsFromRoute,
} from './routeUtils';
import gpxParser from './gpxParser';
import type { ExtractedControl, RouteAnalysisResults } from './gpxParser';
import type { RwgpsRoute, RwgpsTrip } from '../redux/routeInfoSlice';
import { DateTime } from 'luxon';

// Mock the gpxParser module
jest.mock('./gpxParser', () => ({
  __esModule: true,
  default: {
    walkRwgpsRoute: jest.fn(),
    walkGpxRoute: jest.fn(),
    extractControlPoints: jest.fn(),
    extractControlsFromPois: jest.fn(),
  }
}));

describe('routeUtils', () => {
  let mockGpxParser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGpxParser = gpxParser as any;
  });

  describe('getRouteInfo', () => {
    const mockRouteData = {
      type: 'route',
      track_points: [],
    } as unknown as RwgpsRoute;

    const mockRouteAnalysisResults: RouteAnalysisResults = {
      points: [{ lat: 40.7128, lon: -74.0060, elevation: 10 }],
      forecastRequest: [{ time: DateTime.now().plus({ hours: 1 }).toFormat("yyyy-MM-dd'T'HH:mm:00ZZZ"), lat: 40.7128, lon: -74.0060, distance: 0, isControl: false }],
      values: [{ distance: 0, time: '12:00', pace: '10:00', arrival: '12:00', banked: 0, val: 0 }],
      finishTime: '2h 30m',
      timeInHours: 2.5,
      totalDistMeters: 25000, timeOnFlat: 0
    };

    it('should call walkRwgpsRoute for route/trip type data', () => {
      mockGpxParser.walkRwgpsRoute.mockReturnValue(mockRouteAnalysisResults);

      const result = getRouteInfo(
        mockRouteData,
        Date.now(),
        'UTC',
        '10:00',
        1,
        [],
        [0, 0],
        'test-uuid'
      );

      expect(mockGpxParser.walkRwgpsRoute).toHaveBeenCalled();
      expect(result).toEqual(mockRouteAnalysisResults);
    });

    it('should call walkGpxRoute for gpx type data', () => {
      const gpxRouteData = {
        type: 'gpx',
        track_points: [],
      } as unknown as any;

      mockGpxParser.walkGpxRoute.mockReturnValue(mockRouteAnalysisResults);

      const result = getRouteInfo(
        gpxRouteData,
        Date.now(),
        'UTC',
        '10:00',
        1,
        [],
        [0, 0],
        'test-uuid-gpx'
      );

      expect(mockGpxParser.walkGpxRoute).toHaveBeenCalled();
      expect(result).toEqual(mockRouteAnalysisResults);
    });

    it('should return cached result when routeUUID has not changed', () => {
      mockGpxParser.walkRwgpsRoute.mockReturnValue(mockRouteAnalysisResults);

      const startTimestamp = Date.now();
      const routeUUID = 'test-uuid-123';

      // First call
      const result1 = getRouteInfo(
        mockRouteData,
        startTimestamp,
        'UTC',
        'D',
        1,
        [],
        [0, 0],
        routeUUID
      );

      // Second call with same UUID
      const result2 = getRouteInfo(
        mockRouteData,
        startTimestamp,
        'UTC',
        'D',
        1,
        [],
        [0, 0],
        routeUUID
      );

      expect(mockGpxParser.walkRwgpsRoute).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should recalculate when routeUUID changes', () => {
      mockGpxParser.walkRwgpsRoute.mockReturnValue(mockRouteAnalysisResults);

      const startTimestamp = Date.now();

      // First call
      getRouteInfo(
        mockRouteData,
        startTimestamp,
        'UTC',
        '10:00',
        1,
        [],
        [0, 0],
        'uuid-1'
      );

      // Second call with different UUID
      getRouteInfo(
        mockRouteData,
        startTimestamp,
        'UTC',
        '10:00',
        1,
        [],
        [0, 0],
        'uuid-2'
      );

      expect(mockGpxParser.walkRwgpsRoute).toHaveBeenCalledTimes(2);
    });
  });

  describe('getForecastRequest', () => {
    const mockRouteData = {
      type: 'route',
      track_points: [],
    } as unknown as RwgpsRoute;

    const mockForecastRequest = [
      { time: '2026-05-15T12:00:00Z', lat: 40.7128, lon: -74.0060, distance: 0, isControl: false },
      { time: '2026-05-15T13:00:00Z', lat: 40.7138, lon: -74.0050, distance: 10000, isControl: false },
    ];

    it('should return forecast request from route info', () => {
      const mockRouteAnalysisResults: RouteAnalysisResults = {
        points: [],
        forecastRequest: mockForecastRequest,
        values: [{ distance: 0, time: '12:00', pace: '10:00', arrival: '12:00', banked: 0, val: 0 }],
        finishTime: '2h 30m',
        timeInHours: 2.5,
        totalDistMeters: 25000, timeOnFlat: 0
      };

      mockGpxParser.walkRwgpsRoute.mockReturnValue(mockRouteAnalysisResults);

      const result = getForecastRequest(
        mockRouteData,
        Date.now(),
        'UTC',
        '10:00',
        1,
        [],
        [0, 0],
        'test-uuid-forecast-1'
      );

      expect(result).toEqual(mockForecastRequest);
    });

    it('should return empty array if forecast request is not available', () => {
      const mockRouteAnalysisResults: RouteAnalysisResults = {
        points: [],
        forecastRequest: [],
        values: [],
        finishTime: '2h 30m',
        timeInHours: 2.5,
        totalDistMeters: 25000, timeOnFlat: 0
      };

      mockGpxParser.walkRwgpsRoute.mockReturnValue(mockRouteAnalysisResults);

      const result = getForecastRequest(
        mockRouteData,
        Date.now(),
        'UTC',
        '10:00',
        1,
        [],
        [0, 0],
        'test-uuid-forecast-2'
      );

      expect(result).toEqual([]);
    });
  });

  describe('removeDuplicateControl', () => {
    it('should remove controls with distance 0', () => {
      const controls: ExtractedControl[] = [
        { distance: 0, duration: 0, name: 'Start' } as any,
        { distance: 10, duration: 60, name: 'Control 1' } as any,
      ];

      const result = removeDuplicateControl(controls)!;

      expect(result).not.toContainEqual(controls[0]);
      expect(result).toContainEqual(controls[1]);
    });

    it('should remove duplicate distances', () => {
      const controls: ExtractedControl[] = [
        { distance: 10, duration: 60, name: 'Control 1' } as any,
        { distance: 10, duration: 60, name: 'Control 1 Duplicate' } as any,
        { distance: 20, duration: 120, name: 'Control 2' } as any,
      ];

      const result = removeDuplicateControl(controls)!;

      expect(result.length).toBe(2);
      expect(result.filter(c => c.distance === 10).length).toBe(1);
      expect(result.filter(c => c.distance === 20).length).toBe(1);
    });

    it('should preserve first occurrence of duplicate distance', () => {
      const control1 = { distance: 10, duration: 60, name: 'Control 1' } as any;
      const control2 = { distance: 10, duration: 120, name: 'Control 1 Alt' } as any;

      const controls: ExtractedControl[] = [control1, control2];

      const result = removeDuplicateControl(controls)!;

      expect(result).toContainEqual(control1);
      expect(result).not.toContainEqual(control2);
    });

    it('should handle empty array', () => {
      const result = removeDuplicateControl([]);

      expect(result).toBeUndefined();
    });

    it('should handle array with single element', () => {
      const controls: ExtractedControl[] = [
        { distance: 10, duration: 60, name: 'Control 1' } as any,
      ];

      const result = removeDuplicateControl(controls);

      // Single element array has length 1, so loop condition is (0 < 1 - 1) = (0 < 0) which is false
      // Therefore the function returns undefined
      expect(result).toBeUndefined();
    });
  });

  describe('extractControlsFromRoute', () => {
    const mockRouteData = {
      type: 'route',
      track_points: [],
    } as unknown as RwgpsRoute;

    const mockControlsPoints: ExtractedControl[] = [
      { distance: 0, duration: 0, name: 'Start' } as any,
      { distance: 10000, duration: 3600, name: 'Control 1' } as any,
    ];

    const mockPOIControls: ExtractedControl[] = [
      { distance: 5000, duration: 1800, name: 'POI 1' } as any,
      { distance: 15000, duration: 5400, name: 'POI 2' } as any,
    ];

    it('should extract control points from route without POIs', () => {
      mockGpxParser.extractControlPoints.mockReturnValue(mockControlsPoints);

      const result = extractControlsFromRoute(mockRouteData, false);

      expect(mockGpxParser.extractControlPoints).toHaveBeenCalledWith(mockRouteData);
      expect(mockGpxParser.extractControlsFromPois).not.toHaveBeenCalled();
      expect(result).toEqual(mockControlsPoints);
    });

    it('should extract control points and merge with POIs when loadPOIs is true', () => {
      mockGpxParser.extractControlPoints.mockReturnValue(mockControlsPoints);
      mockGpxParser.extractControlsFromPois.mockReturnValue(mockPOIControls);

      const result = extractControlsFromRoute(mockRouteData, true);

      expect(mockGpxParser.extractControlPoints).toHaveBeenCalledWith(mockRouteData);
      expect(mockGpxParser.extractControlsFromPois).toHaveBeenCalledWith(mockRouteData);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should remove duplicates when combining controls and POIs', () => {
      const controlsWithDuplicates: ExtractedControl[] = [
        { distance: 10000, duration: 3600, name: 'Control 1' } as any,
        { distance: 10000, duration: 3600, name: 'Control 1 Duplicate' } as any,
      ];

      mockGpxParser.extractControlPoints.mockReturnValue(controlsWithDuplicates);
      mockGpxParser.extractControlsFromPois.mockReturnValue([]);

      const result = extractControlsFromRoute(mockRouteData, true);

      expect(result.filter(c => c.distance === 10000).length).toBe(1);
    });

    it('should return empty array if no controls found', () => {
      mockGpxParser.extractControlPoints.mockReturnValue([]);
      mockGpxParser.extractControlsFromPois.mockReturnValue(undefined);

      const result = extractControlsFromRoute(mockRouteData, true);

      expect(result).toEqual([]);
    });

    it('should load POIs by default', () => {
      mockGpxParser.extractControlPoints.mockReturnValue(mockControlsPoints);
      mockGpxParser.extractControlsFromPois.mockReturnValue(mockPOIControls);

      extractControlsFromRoute(mockRouteData);

      expect(mockGpxParser.extractControlsFromPois).toHaveBeenCalled();
    });
  });
});
