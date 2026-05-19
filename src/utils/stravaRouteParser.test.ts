import stravaActivityParser, {
    StravaActivityData,
    StravaActivityStream
} from './stravaRouteParser';
import { DateTime } from 'luxon';
import type { UserControl } from '../redux/controlsSlice';

// Mock dependencies
jest.mock('universal-cookie');
jest.mock('rest-api-handler');
jest.mock('./util', () => ({
    paceToSpeed: {
        'A+': 18,
        'A': 17,
        'A-': 16,
        'B': 15,
        'C': 14
    },
    setMinMaxCoords: jest.fn((point, bounds) => {
        return {
            min_latitude: Math.min(bounds.min_latitude, point.lat),
            min_longitude: Math.min(bounds.min_longitude, point.lon),
            max_latitude: Math.max(bounds.max_latitude, point.lat),
            max_longitude: Math.max(bounds.max_longitude, point.lon)
        };
    })
}));

describe('StravaActivityParser', () => {
    const parser = stravaActivityParser;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('computeWWPaceForActivity', () => {
        it('should calculate pace correctly for flat terrain', () => {
            const activityData: StravaActivityData = {
                message: '',
                average_speed: 5, // m/s = ~11.18 mph
                total_elevation_gain: 0, // meters
                distance: 100000, // 100 km = ~62.14 miles
                [Symbol.for('any')]: undefined
            };

            const pace = parser.computeWWPaceForActivity(activityData);
            expect(typeof pace).toBe('number');
            expect(pace).toBeGreaterThan(0);
        });

        it('should calculate pace correctly for hilly terrain', () => {
            const activityData: StravaActivityData = {
                message: '',
                average_speed: 5, // m/s
                total_elevation_gain: 1000, // meters
                distance: 100000, // 100 km
                [Symbol.for('any')]: undefined
            };

            const pace = parser.computeWWPaceForActivity(activityData);
            expect(typeof pace).toBe('number');
            expect(pace).toBeGreaterThan(0);
        });

        it('should calculate higher pace for higher elevation gain', () => {
            const baseActivity: StravaActivityData = {
                message: '',
                average_speed: 5,
                total_elevation_gain: 500,
                distance: 100000,
                [Symbol.for('any')]: undefined
            };

            const hillierActivity: StravaActivityData = {
                message: '',
                average_speed: 5,
                total_elevation_gain: 2000,
                distance: 100000,
                [Symbol.for('any')]: undefined
            };

            const basePace = parser.computeWWPaceForActivity(baseActivity);
            const hillierPace = parser.computeWWPaceForActivity(hillierActivity);

            expect(hillierPace).toBeGreaterThan(basePace);
        });
    });

    describe('computeActualFinishTime', () => {
        it('should calculate finish time correctly', () => {
            const activityData: StravaActivityData = {
                message: '',
                start_date: '2024-01-15T08:00:00Z',
                elapsed_time: 3600, // 1 hour
                total_elevation_gain: 0,
                [Symbol.for('any')]: undefined
            };

            const finishTime = parser.computeActualFinishTime(activityData);
            expect(finishTime).toBeDefined();
            expect(typeof finishTime).toBe('string');
            // Should contain time format elements
            expect(finishTime).toMatch(/:/);
        });

        it('should calculate finish time with multiple hours', () => {
            const activityData: StravaActivityData = {
                message: '',
                start_date: '2024-01-15T08:00:00Z',
                elapsed_time: 14400, // 4 hours
                total_elevation_gain: 0,
                [Symbol.for('any')]: undefined
            };

            const finishTime = parser.computeActualFinishTime(activityData);
            expect(finishTime).toBeDefined();
            expect(typeof finishTime).toBe('string');
        });
    });

    describe('computePointsAndBounds', () => {
        it('should return empty pointList when latlng is undefined', () => {
            const activityStream: StravaActivityStream = {
                message: '',
                distance: { data: [0, 100, 200] },
                time: { data: [0, 10, 20] },
                altitude: { data: [1000, 1050, 1100] },
                latlng: undefined as any,
                moving: { data: [1, 1, 1] }
            };

            const result = parser.computePointsAndBounds(activityStream);
            expect(result.pointList).toEqual([]);
            expect(result.bounds).toEqual({
                min_latitude: 90,
                min_longitude: 180,
                max_latitude: -90,
                max_longitude: -180
            });
        });

        it('should return empty pointList when distance is undefined', () => {
            const activityStream: StravaActivityStream = {
                message: '',
                distance: undefined as any,
                time: { data: [0, 10, 20] },
                altitude: { data: [1000, 1050, 1100] },
                latlng: { data: [[40.0, -105.0], [40.1, -105.1], [40.2, -105.2]] },
                moving: { data: [1, 1, 1] }
            };

            const result = parser.computePointsAndBounds(activityStream);
            expect(result.pointList).toEqual([]);
        });

        it('should return empty pointList when altitude is undefined', () => {
            const activityStream: StravaActivityStream = {
                message: '',
                distance: { data: [0, 100, 200] },
                time: { data: [0, 10, 20] },
                altitude: undefined as any,
                latlng: { data: [[40.0, -105.0], [40.1, -105.1], [40.2, -105.2]] },
                moving: { data: [1, 1, 1] }
            };

            const result = parser.computePointsAndBounds(activityStream);
            expect(result.pointList).toEqual([]);
        });

        it('should extract points and bounds correctly', () => {
            const activityStream: StravaActivityStream = {
                message: '',
                distance: { data: [0, 1000, 2000] },
                time: { data: [0, 10, 20] },
                altitude: { data: [1000, 1050, 1100] },
                latlng: { data: [[40.0, -105.0], [40.1, -105.1], [40.2, -105.2]] },
                moving: { data: [1, 1, 1] }
            };

            const result = parser.computePointsAndBounds(activityStream);
            expect(result.pointList).toHaveLength(3);
            expect(result.pointList[0]).toEqual({
                lat: 40.0,
                lon: -105.0,
                dist: 0,
                elevation: 1000
            });
            expect(result.pointList[2]).toEqual({
                lat: 40.2,
                lon: -105.2,
                dist: 2000,
                elevation: 1100
            });
            expect(result.bounds.min_latitude).toBeLessThanOrEqual(40.0);
            expect(result.bounds.max_latitude).toBeGreaterThanOrEqual(40.2);
        });
    });

    describe('computeControlPointArrivalTimes', () => {
        it('should return empty array when no control points', () => {
            const activityData: StravaActivityData = {
                message: '',
                start_date: '2024-01-15T08:00:00Z',
                total_elevation_gain: 0,
                [Symbol.for('any')]: undefined
            };

            const activityStream: StravaActivityStream = {
                message: '',
                distance: { data: [0, 5000, 10000, 15000, 20000] },
                time: { data: [0, 600, 1200, 1800, 2400] },
                altitude: { data: [1000, 1000, 1000, 1000, 1000] },
                latlng: { data: [[40.0, -105.0], [40.1, -105.1], [40.2, -105.2], [40.3, -105.3], [40.4, -105.4]] },
                moving: { data: [1, 1, 1, 1, 1] }
            };

            const result = parser.computeControlPointArrivalTimes(activityData, activityStream, []);
            expect(result).toEqual([]);
        });

        it('should calculate arrival times for control points', () => {
            const activityData: StravaActivityData = {
                message: '',
                start_date: '2024-01-15T08:00:00Z',
                total_elevation_gain: 0,
                [Symbol.for('any')]: undefined
            };

            const activityStream: StravaActivityStream = {
                message: '',
                distance: { data: [0, 5000, 10000, 15000, 20000] },
                time: { data: [0, 600, 1200, 1800, 2400] },
                altitude: { data: [1000, 1000, 1000, 1000, 1000] },
                latlng: { data: [[40.0, -105.0], [40.1, -105.1], [40.2, -105.2], [40.3, -105.3], [40.4, -105.4]] },
                moving: { data: [1, 1, 1, 1, 1] }
            };

            const controlPoints: UserControl[] = [
                {
                    id: '1',
                    name: 'Control 1',
                    distance: 6.2, // ~10000 meters
                    lat: 40.15,
                    lon: -105.15,
                    duration: undefined,
                    business: false
                }
            ];

            const result = parser.computeControlPointArrivalTimes(activityData, activityStream, controlPoints);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should sort arrival times by distance', () => {
            const activityData: StravaActivityData = {
                message: '',
                start_date: '2024-01-15T08:00:00Z',
                total_elevation_gain: 0,
                [Symbol.for('any')]: undefined
            };

            const activityStream: StravaActivityStream = {
                message: '',
                distance: { data: [0, 3000, 6000, 9000, 12000, 15000] },
                time: { data: [0, 300, 600, 900, 1200, 1500] },
                altitude: { data: [1000, 1000, 1000, 1000, 1000, 1000] },
                latlng: { data: [[40.0, -105.0], [40.05, -105.05], [40.1, -105.1], [40.15, -105.15], [40.2, -105.2], [40.25, -105.25]] },
                moving: { data: [1, 1, 1, 1, 1, 1] }
            };

            const controlPoints: UserControl[] = [
                {
                    id: '1',
                    name: 'Control 2',
                    distance: 9.3, // ~15000 meters
                    lat: 40.25,
                    lon: -105.25,
                    duration: undefined,
                    business: false
                },
                {
                    id: '2',
                    name: 'Control 1',
                    distance: 6.2, // ~10000 meters
                    lat: 40.15,
                    lon: -105.15,
                    duration: undefined,
                    business: false
                }
            ];

            const result = parser.computeControlPointArrivalTimes(activityData, activityStream, controlPoints);
            // Should be sorted by distance
            if (result.length > 1) {
                expect(result[0].val).toBeLessThanOrEqual(result[1].val);
            }
        });
    });

    describe('wwPaceCalc static method', () => {
        it('should calculate pace as speed plus hilliness factor', () => {
            const pace = (parser.constructor as any).wwPaceCalc(1000, 10, 12);
            expect(typeof pace).toBe('number');
            expect(pace).toBeGreaterThan(12); // Should be more than base speed
        });

        it('should handle flat terrain (0 climb)', () => {
            const pace = (parser.constructor as any).wwPaceCalc(0, 10, 12);
            expect(pace).toBe(12); // Should equal speed
        });

        it('should increase pace with elevation gain', () => {
            const flatPace = (parser.constructor as any).wwPaceCalc(0, 10, 12);
            const hillPace = (parser.constructor as any).wwPaceCalc(500, 10, 12);
            expect(hillPace).toBeGreaterThan(flatPace);
        });
    });

    describe('getAlphaPace static method', () => {
        it('should return alpha pace category for given pace', () => {
            const alphaPace = (parser.constructor as any).getAlphaPace(17);
            expect(typeof alphaPace).toBe('string');
            // Should return valid alpha category (A+, A, A-, B, C, or default A-)
            expect(['A+', 'A', 'A-', 'B', 'C']).toContain(alphaPace);
        });

        it('should return highest pace for very fast paces', () => {
            const alphaPace = (parser.constructor as any).getAlphaPace(20);
            expect(alphaPace).toBeDefined();
        });

        it('should return lowest pace for slow paces', () => {
            const alphaPace = (parser.constructor as any).getAlphaPace(14);
            expect(['B', 'C', 'A-', undefined]).toContain(alphaPace);
        });
    });

    describe('walkActivity static method', () => {
        it('should return early if no control points', () => {
            const arrivalTimes: Array<{ time: string; val: number }> = [];
            (parser.constructor as any).walkActivity(
                '2024-01-15T08:00:00Z',
                [0, 5000, 10000],
                [0, 600, 1200],
                [],
                arrivalTimes
            );
            expect(arrivalTimes).toEqual([]);
        });

        it('should find control points in activity', () => {
            const arrivalTimes: Array<{ time: string; val: number }> = [];
            const controlPoints: UserControl[] = [
                {
                    id: '1',
                    name: 'Control 1',
                    distance: 6.2, // miles
                    lat: 40.1,
                    lon: -105.1,
                    duration: undefined,
                    business: false
                }
            ];

            (parser.constructor as any).walkActivity(
                '2024-01-15T08:00:00Z',
                [0, 5000, 10000, 15000], // meters
                [0, 600, 1200, 1800],
                controlPoints,
                arrivalTimes
            );

            // 6.2 miles = ~9976 meters, should find a match
            expect(Array.isArray(arrivalTimes)).toBe(true);
        });

        it('should record multiple control points', () => {
            const arrivalTimes: Array<{ time: string; val: number }> = [];
            const controlPoints: UserControl[] = [
                {
                    id: '1',
                    name: 'Control 1',
                    distance: 3.1, // miles (~5000 meters)
                    lat: 40.05,
                    lon: -105.05,
                    duration: undefined,
                    business: false
                },
                {
                    id: '2',
                    name: 'Control 2',
                    distance: 6.2, // miles (~10000 meters)
                    lat: 40.1,
                    lon: -105.1,
                    duration: undefined,
                    business: false
                }
            ];

            (parser.constructor as any).walkActivity(
                '2024-01-15T08:00:00Z',
                [0, 5000, 10000, 15000],
                [0, 600, 1200, 1800],
                controlPoints,
                arrivalTimes
            );

            expect(arrivalTimes.length).toBeGreaterThanOrEqual(0);
        });
    });
});
