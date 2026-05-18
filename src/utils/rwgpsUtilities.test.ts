import { loadRwgpsRoute } from './rwgpsUtilities';
import type { RwgpsRoute, RwgpsTrip } from '../redux/routeInfoSlice';

describe('rwgpsUtilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadRwgpsRoute', () => {
    it('should successfully load a route', async () => {
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Test Route',
          track_points: [
            { x: 40.7128, y: -74.006, d: 0, e: 10 },
            { x: 40.7138, y: -74.005, d: 100, e: 12 },
          ],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const result = await loadRwgpsRoute('12345', false);

      expect(result).toEqual(mockRoute);
      expect(global.fetch).toHaveBeenCalledWith('/rwgps_route?route=12345&trip=false');
    });

    it('should successfully load a trip', async () => {
      const mockTrip: RwgpsTrip = {
        type: 'trip',
        trip: {
          country_code: 'US',
          distance: 150,
          name: 'Test Trip',
          track_points: [
            { x: 40.7128, y: -74.006, d: 0, e: 10 },
            { x: 40.7138, y: -74.005, d: 75, e: 12 },
            { x: 40.7148, y: -74.004, d: 150, e: 11 },
          ],
          course_points: [],
          points_of_interest: [],
          id: 67890,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockTrip),
      });

      const result = await loadRwgpsRoute('67890', true);

      expect(result).toEqual(mockTrip);
      expect(global.fetch).toHaveBeenCalledWith('/rwgps_route?route=67890&trip=true');
    });

    it('should include token in URL when provided', async () => {
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Private Route',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 11111,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const token = 'secret-token-12345';
      const result = await loadRwgpsRoute('11111', false, token);

      expect(result).toEqual(mockRoute);
      expect(global.fetch).toHaveBeenCalledWith(
        `/rwgps_route?route=11111&trip=false&token=${token}`
      );
    });

    it('should reject with appropriate error for private or non-existent route', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(undefined),
      });

      await expect(loadRwgpsRoute('99999', false)).rejects.toThrow(
        'Private or non-existent Ride with GPS route'
      );
    });

    it('should reject when route info is unavailable', async () => {
      const mockResponse = {
        trip: undefined,
        route: undefined,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await expect(loadRwgpsRoute('12345', false)).rejects.toThrow(
        'RWGPS route info unavailable'
      );
    });

    it('should reject with error message when trip is undefined but route exists', async () => {
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Test Route',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const result = await loadRwgpsRoute('12345', false);

      expect(result).toEqual(mockRoute);
    });

    it('should handle non-200 status codes gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        json: jest.fn(),
      });

      await expect(loadRwgpsRoute('12345', false)).rejects.toThrow(
        'Private or non-existent Ride with GPS route'
      );
    });

    it('should reject on network error', async () => {
      const networkError = new Error('Network request failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      await expect(loadRwgpsRoute('12345', false)).rejects.toBe(
        'Network request failed'
      );
    });

    it('should handle empty token parameter', async () => {
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Test Route',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const result = await loadRwgpsRoute('12345', false, null);

      expect(result).toEqual(mockRoute);
      expect(global.fetch).toHaveBeenCalledWith('/rwgps_route?route=12345&trip=false');
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('token=')
      );
    });

    it('should handle route with course points and POIs', async () => {
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Complex Route',
          track_points: [
            { x: 40.7128, y: -74.006, d: 0, e: 10 },
          ],
          course_points: [
            { d: 10, t: 'turn', n: 'CP1', x: 40.7138, y: -74.005, i: 0 },
          ],
          points_of_interest: [
            { lat: 40.7148, lng: -74.004, n: 'POI1', t: 1, d: 'Point of Interest' },
          ],
          id: 12345,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const result = await loadRwgpsRoute('12345', false);

      expect(result).toEqual(mockRoute);
      expect(result.route!.course_points).toHaveLength(1);
      expect(result.route!.points_of_interest).toHaveLength(1);
    });

    it('should handle different country codes', async () => {
      const countryCode = 'DE';
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: countryCode,
          distance: 100,
          name: 'German Route',
          track_points: [
            { x: 52.52, y: 13.405, d: 0, e: 34 },
          ],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const result = await loadRwgpsRoute('12345', false);

      expect(result.route!.country_code).toBe(countryCode);
    });

    it('should handle different distance values', async () => {
      const distances = [0, 50, 100, 200, 1000];

      for (const distance of distances) {
        const mockRoute: RwgpsRoute = {
          type: 'route',
          route: {
            country_code: 'US',
            distance,
            name: `Route ${distance}km`,
            track_points: [],
            course_points: [],
            points_of_interest: [],
            id: 12345,
          },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          status: 200,
          json: jest.fn().mockResolvedValueOnce(mockRoute),
        });

        const result = await loadRwgpsRoute('12345', false);

        expect(result.route!.distance).toBe(distance);
      }
    });

    it('should handle trip data with metadata', async () => {
      const mockTrip: RwgpsTrip & { [index: string]: any } = {
        type: 'trip',
        trip: {
          country_code: 'US',
          distance: 150,
          name: 'Test Trip',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 67890,
        },
        metadata: {
          created_at: '2024-05-17T10:00:00Z',
          updated_at: '2024-05-17T12:00:00Z',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockTrip),
      });

      const result = await loadRwgpsRoute('67890', true);

      expect(result.trip).toBeDefined();
      expect(result.type).toBe('trip');
      expect((result as any).metadata).toBeDefined();
    });

    it('should handle fetch rejection correctly', async () => {
      const fetchError = new Error('Fetch failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(fetchError);

      await expect(loadRwgpsRoute('12345', false)).rejects.toBe('Fetch failed');
    });

    it('should correctly determine route vs trip based on response content', async () => {
      const mockResponse = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Detected Route',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
        trip: undefined,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await loadRwgpsRoute('12345', false);

      expect(result.route!).toBeDefined();
      expect((result as any).trip).toBeUndefined();
    });

    it('should handle route IDs with special characters in URL', async () => {
      const mockRoute: RwgpsRoute = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Test Route',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const routeId = 'special-route-id-123';
      await loadRwgpsRoute(routeId, false);

      expect(global.fetch).toHaveBeenCalledWith(
        `/rwgps_route?route=${routeId}&trip=false`
      );
    });

    it('should maintain all properties in returned object', async () => {
      const mockRoute: RwgpsRoute & { [index: string]: any } = {
        type: 'route',
        route: {
          country_code: 'US',
          distance: 100,
          name: 'Complete Route',
          track_points: [],
          course_points: [],
          points_of_interest: [],
          id: 12345,
        },
        additionalProp: 'additionalValue',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockRoute),
      });

      const result = await loadRwgpsRoute('12345', false);

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('route');
      expect(result).toHaveProperty('additionalProp');
      expect((result as any).additionalProp).toBe('additionalValue');
    });
  });
});
