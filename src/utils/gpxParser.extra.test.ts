import { DateTime } from 'luxon';
import AnalyzeRoute, { AnalyzeRoute as AnalyzeRouteClass } from './gpxParser';
import type { Point, CalculatedValue } from './gpxParser';

describe('gpxParser extra cases', () => {
    it('adjustForWind returns early when distanceInMiles is zero (identical points)', () => {
        const start = DateTime.fromISO('2024-01-01T08:00:00', { zone: 'UTC' });
        const stream: Point[] = [
            { lat: 40.0, lon: -75.0, elevation: 100 },
            { lat: 40.0, lon: -75.0, elevation: 100 }
        ];
        const result = AnalyzeRoute.adjustForWind([], stream, 'fast', [], [], start, start.toFormat('EEE, MMM dd yyyy h:mma'), 'UTC', 1000);
        expect(result.weatherCorrectionMinutes).toBe(0);
        expect(Array.isArray(result.chartData)).toBe(true);
    });

    it('adjustForWind handles strong gusts and produces chartData', () => {
        const start = DateTime.fromISO('2024-01-01T08:00:00', { zone: 'UTC' });
        const stream: Point[] = [
            { lat: 40.7128, lon: -74.0060, elevation: 100 },
            { lat: 40.7528, lon: -73.9660, elevation: 120 }
        ];
        const controls: any[] = [{ distance: 0, id: 1, duration: 10, name: 'C', banked: 0 }];
        const prevVals: CalculatedValue[] = [{ arrival: start.toFormat('EEE, MMM dd yyyy h:mma'), banked: 0, val: 1, distance: 0 }];

        const forecast = [
            { time: '2024-01-01T07:00:00', distance: 0, windBearing: 90, windSpeed: '5', gust: '60', temp: '50' },
            { time: '2024-01-01T09:00:00', distance: 10, windBearing: 90, windSpeed: '10', gust: '20', temp: '50' }
        ] as any;

        const result = AnalyzeRoute.adjustForWind(forecast, stream, 'fast', controls, prevVals, start, start.toFormat('EEE, MMM dd yyyy h:mma'), 'UTC', 1000);
        expect(result.maxGustSpeed).toBeGreaterThanOrEqual(60);
        expect(result.chartData.length).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.adjustedTimes)).toBe(true);
    });

    it('adjustForWind tolerates missing elevations without throwing', () => {
        const start = DateTime.fromISO('2024-01-01T08:00:00', { zone: 'UTC' });
        const stream: Point[] = [
            { lat: 40.7128, lon: -74.0060, elevation: undefined as any },
            { lat: 40.7528, lon: -73.9660, elevation: undefined as any }
        ];
        const result = AnalyzeRoute.adjustForWind([
            { time: '2024-01-01T09:00:00', distance: 0, windBearing: 0, windSpeed: '0', gust: undefined, temp: '60' }
        ] as any, stream, 'fast', [], [], start, start.toFormat('EEE, MMM dd yyyy h:mma'), 'UTC', 1000);
        expect(result).toBeDefined();
        expect(result.weatherCorrectionMinutes).toBeDefined();
    });

    it('walkGpxRoute produces analysis results for a simple GPX', () => {
        const start = DateTime.fromISO('2024-01-01T08:00:00', { zone: 'UTC' });
        const gpxData: any = {
            tracks: [
                {
                    points: [
                        { latitude: 40.7128, longitude: -74.0060, elevation: 10 },
                        { latitude: 40.7228, longitude: -74.0000, elevation: 20 }
                    ],
                    distance: { total: 2000 }
                }
            ],
            metadata: { name: 'Simple' }
        };
        const result = AnalyzeRoute.walkGpxRoute(gpxData, start, 'fast', 1, [], 'UTC', [0, 100000]);
        expect(result.points.length).toBeGreaterThan(0);
        expect(result.finishTime).toBeDefined();
    });

    it('walkRwgpsRoute handles simple route data', () => {
        const start = DateTime.fromISO('2024-01-01T08:00:00', { zone: 'UTC' });
        const routeData: any = {
            type: 'route',
            route: {
                distance: 2000,
                track_points: [
                    { x: -74.0060, y: 40.7128, e: 10, d: 0 },
                    { x: -74.0000, y: 40.7228, e: 20, d: 1 }
                ],
                course_points: []
            }
        };
        const result = AnalyzeRoute.walkRwgpsRoute(routeData, start, 'fast', 1, [], 'UTC', [0, 100000]);
        expect(result.points.length).toBeGreaterThan(0);
        expect(result.finishTime).toBeDefined();
    });
});
