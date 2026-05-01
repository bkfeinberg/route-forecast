import { DateTime } from 'luxon';
import * as Sentry from '@sentry/browser';
import { requestTimeZoneForRoute } from './forecastUtilities';
import type { RouteInfoState } from '../redux/routeInfoSlice';

// Mock Sentry
jest.mock('@sentry/browser', () => ({
    logger: {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        fmt: jest.fn(),
    },
    captureMessage: jest.fn(),
}));

// Mock fetch globally
const originalFetch = global.fetch;
const mockFetch = jest.fn();

// Helper to create valid RouteInfoState for testing
const createMockRwgpsRouteInfo = (overrides?: any): RouteInfoState => ({
    name: 'Test Route',
    loadingFromURL: false,
    distanceInKm: 100,
    canDoUserSegment: false,
    type: 'rwgps',
    routeUUID: 'test-uuid',
    zoneCopy: 'America/New_York',
    country: 'US',
    rwgpsRouteData: {
        type: 'route',
        route: {
            id: 123,
            country_code: 'US',
            distance: 100,
            name: 'Test Route',
            track_points: [{ x: -74.006, y: 40.7128 }],
            course_points: [],
            points_of_interest: [],
        },
    } as any,
    gpxRouteData: null,
    ...overrides,
});

const createMockGpxRouteInfo = (overrides?: any): RouteInfoState => ({
    name: 'Test GPX Route',
    loadingFromURL: false,
    distanceInKm: 100,
    canDoUserSegment: false,
    type: 'gpx',
    routeUUID: 'test-uuid',
    zoneCopy: 'Europe/London',
    country: 'GB',
    rwgpsRouteData: null,
    gpxRouteData: {
        name: 'Test GPX Route',
        type: 'gpx',
        tracks: [
            {
                distance: { total: 100 },
                points: [{ lat: 51.5074, lon: -0.1278 }],
                name: 'Track',
                link: 'http://example.com',
            },
        ],
    } as any,
    ...overrides,
});

describe('forecastUtilities', () => {
    const mockTimezoneApiKey = 'test-api-key';
    const mockDateTime = DateTime.fromISO('2024-01-15T12:00:00');
    
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = mockFetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('requestTimeZoneForRoute', () => {
        it('should successfully get timezone for RWGPS route', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    dstOffset: 0,
                    rawOffset: -18000,
                    timeZoneId: 'America/New_York',
                }),
            });

            const routeInfo = createMockRwgpsRouteInfo({
                rwgpsRouteData: {
                    type: 'route',
                    route: {
                        id: 123,
                        country_code: 'US',
                        distance: 100,
                        name: 'Test Route',
                        track_points: [{ x: -74.006, y: 40.7128 }],
                        course_points: [],
                        points_of_interest: [],
                    },
                },
            });

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result).toEqual({ result: 'America/New_York' });
        });

        it('should successfully get timezone for GPX route', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    dstOffset: 3600,
                    rawOffset: 0,
                    timeZoneId: 'Europe/London',
                }),
            });

            const routeInfo = createMockGpxRouteInfo({
                gpxRouteData: {
                    name: 'Test GPX Route',
                    type: 'gpx',
                    tracks: [
                        {
                            distance: { total: 100 },
                            points: [{ lat: 51.5074, lon: -0.1278 }],
                            name: 'Track',
                            link: 'http://example.com',
                        },
                    ],
                },
            });

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result).toEqual({ result: 'Europe/London' });
        });

        it('should handle fetch error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Unauthorized',
            });

            const routeInfo = createMockRwgpsRouteInfo();

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result.result).toBe('error');
            expect(result.error).toBeDefined();
        });

        it('should handle API error message in response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    errorMessage: 'Invalid request',
                }),
            });

            const routeInfo = createMockRwgpsRouteInfo();

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result.result).toBe('error');
        });

        it('should handle missing RWGPS route data', async () => {
            const routeInfo = createMockRwgpsRouteInfo({
                rwgpsRouteData: {
                    type: 'route',
                    route: null,
                } as any,
            });

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result.result).toBe('error');
            expect(result.error).toEqual('RWGPS route data missing');
        });

        it('should handle missing GPX tracks', async () => {
            const routeInfo = createMockGpxRouteInfo({
                gpxRouteData: {
                    name: 'Test',
                    type: 'gpx',
                    tracks: [],
                } as any,
            });

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result.result).toBe('error');
            expect(result.error).toEqual('GPX route missing tracks');
        });

        it('should handle missing route data', async () => {
            const routeInfo = createMockRwgpsRouteInfo({
                type: 'unknown' as any,
            });

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result.result).toBe('error');
            expect(result.error).toEqual('Route data missing');
        });

        it('should handle network fetch errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const routeInfo = createMockRwgpsRouteInfo();

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result.result).toBe('error');
            expect(result.error).toBeDefined();
        });

        it('should include coordinates in API call for RWGPS', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    dstOffset: 0,
                    rawOffset: -18000,
                    timeZoneId: 'America/New_York',
                }),
            });

            const routeInfo = createMockRwgpsRouteInfo();

            await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain('location=40.7128,-74.006');
        });

        it('should handle China timezone for RWGPS routes', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    dstOffset: 0,
                    rawOffset: 28800,
                    timeZoneId: 'Asia/Shanghai',
                }),
            });

            const routeInfo = createMockRwgpsRouteInfo({
                country: 'CN',
                rwgpsRouteData: {
                    type: 'route',
                    route: {
                        id: 456,
                        country_code: 'CN',
                        distance: 100,
                        name: 'Test Route',
                        track_points: [{ x: 121.4737, y: 31.2304 }],
                        course_points: [],
                        points_of_interest: [],
                    },
                },
            });

            const result = await requestTimeZoneForRoute(routeInfo, mockDateTime, mockTimezoneApiKey);

            expect(result).toEqual({ result: 'Asia/Shanghai' });
            expect(Sentry.logger.info).toHaveBeenCalled();
        });
    });
});
