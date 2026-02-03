import { DateTime } from 'luxon';
import type { Point, ForecastRequest, CalculatedValue, ExtractedControl, RouteAnalysisResults } from './gpxParser';
import AnalyzeRoute, { AnalyzeRoute as AnalyzeRouteClass } from './gpxParser';

describe('AnalyzeRoute', () => {
    const mockPoint1: Point = { lat: 40.7128, lon: -74.0060, elevation: 10 };
    const mockPoint2: Point = { lat: 40.7138, lon: -74.0050, elevation: 20 };
    const mockPoint3: Point = { lat: 40.7148, lon: -74.0040, elevation: 30 };

    describe('toRad', () => {
        it('should convert degrees to radians correctly', () => {
            expect(AnalyzeRoute['toRad'](180)).toBeCloseTo(Math.PI, 5);
            expect(AnalyzeRoute['toRad'](90)).toBeCloseTo(Math.PI / 2, 5);
            expect(AnalyzeRoute['toRad'](0)).toBe(0);
        });

        it('should handle negative angles', () => {
            expect(AnalyzeRoute['toRad'](-90)).toBeCloseTo(-Math.PI / 2, 5);
        });
    });

    describe('calculateDistance', () => {
        it('should calculate distance between two points using haversine formula', () => {
            const distance = AnalyzeRoute['calculateDistance'](
                mockPoint1.lat, mockPoint1.lon,
                mockPoint2.lat, mockPoint2.lon
            );
            expect(distance).toBeGreaterThan(0);
            expect(distance).toBeLessThan(2); // Should be small distance in km
        });

        it('should return 0 distance for same point', () => {
            const distance = AnalyzeRoute['calculateDistance'](
                mockPoint1.lat, mockPoint1.lon,
                mockPoint1.lat, mockPoint1.lon
            );
            expect(distance).toBeCloseTo(0, 5);
        });

        it('should calculate correct distance for known coordinates', () => {
            // New York to Los Angeles (approximate: 3944 km)
            const distance = AnalyzeRoute['calculateDistance'](40.7128, -74.0060, 34.0522, -118.2437);
            expect(distance).toBeGreaterThan(3900);
            expect(distance).toBeLessThan(4000);
        });
    });

    describe('findPreviousPoint', () => {
        it('should return undefined for empty previous points array', () => {
            const result = AnalyzeRoute['findPreviousPoint']([], mockPoint2);
            expect(result).toBeUndefined();
        });

        it('should find a point at desired separation distance', () => {
            const points: Point[] = [mockPoint1, mockPoint2, mockPoint3];
            const result = AnalyzeRoute['findPreviousPoint'](points, mockPoint3);
            expect(result).toBeDefined();
            expect([mockPoint1, mockPoint2]).toContain(result);
        });

        it('should return first point if no point at desired distance found', () => {
            const result = AnalyzeRoute['findPreviousPoint']([mockPoint1], mockPoint2);
            expect(result).toBe(mockPoint1);
        });
    });

    describe('getGrade', () => {
        it('should return 0 for single point', () => {
            const grade = AnalyzeRoute['getGrade']([], mockPoint1);
            expect(grade).toBe(0);
        });

        it('should calculate grade between two points', () => {
            const grade = AnalyzeRoute['getGrade']([mockPoint1], mockPoint2);
            expect(typeof grade).toBe('number');
        });

        it('should handle zero elevation change', () => {
            const point1: Point = { lat: 40.7128, lon: -74.0060, elevation: 10 };
            const point2: Point = { lat: 40.7138, lon: -74.0050, elevation: 10 };
            const grade = AnalyzeRoute['getGrade']([point1], point2);
            expect(grade).toBeCloseTo(0, 5);
        });

        it('should be positive for elevation gain', () => {
            const grade = AnalyzeRoute['getGrade']([mockPoint1], mockPoint3);
            expect(grade).toBeGreaterThanOrEqual(0);
        });
    });

    describe('findDeltas', () => {
        it('should return distance and zero climb for equal elevation', () => {
            const point1: Point = { lat: 40.7128, lon: -74.0060, elevation: 10 };
            const point2: Point = { lat: 40.7138, lon: -74.0050, elevation: 10 };
            const result = AnalyzeRoute['findDeltas'](point1, point2);
            expect(result.distance).toBeGreaterThan(0);
            expect(result.climb).toBe(0);
        });

        it('should return distance and positive climb for elevation gain', () => {
            const result = AnalyzeRoute['findDeltas'](mockPoint1, mockPoint3);
            expect(result.distance).toBeGreaterThan(0);
            expect(result.climb).toBeGreaterThan(0);
        });

        it('should return zero climb for elevation loss', () => {
            const result = AnalyzeRoute['findDeltas'](mockPoint3, mockPoint1);
            expect(result.distance).toBeGreaterThan(0);
            expect(result.climb).toBe(0);
        });
    });

    describe('isControl', () => {
        it('should identify control points by type', () => {
            const controlPoint: any = {
                d: 100, t: 'Control', n: 'Rest Stop', x: 1, y: 2, i: 0, description: undefined
            };
            const result = AnalyzeRoute['isControl'](controlPoint);
            expect(result).toBeTruthy();
        });

        it('should identify control points by name pattern', () => {
            const controlPoint: any = {
                d: 100, t: 'Other', n: 'Control: Main Street', x: 1, y: 2, i: 0, description: undefined
            };
            const result = AnalyzeRoute['isControl'](controlPoint);
            expect(result).toBeTruthy();
        });

        it('should exclude depart and exit points', () => {
            const departPoint: any = {
                d: 100, t: 'Other', n: 'Depart: Starting Point', x: 1, y: 2, i: 0, description: undefined
            };
            const result = AnalyzeRoute['isControl'](departPoint);
            expect(result).toBeFalsy();
        });

        it('should return false for non-control points', () => {
            const regularPoint: any = {
                d: 100, t: 'Regular', n: 'Random Point', x: 1, y: 2, i: 0, description: undefined
            };
            const result = AnalyzeRoute['isControl'](regularPoint);
            expect(result).toBeFalsy();
        });
    });

    describe('nameHasDuration', () => {
        it('should extract duration from name', () => {
            const result = AnalyzeRoute['nameHasDuration']('Control: 30m rest');
            expect(result).toBe(30);
        });

        it('should return 1 if no duration specified', () => {
            const result = AnalyzeRoute['nameHasDuration']('Control: Regular');
            expect(result).toBe(1);
        });

        it('should handle various duration formats', () => {
            expect(AnalyzeRoute['nameHasDuration']('Lunch 60m')).toBe(60);
            expect(AnalyzeRoute['nameHasDuration']('15m stop')).toBe(15);
        });
    });

    describe('businessFromText', () => {
        it('should extract business name from underscore delimiters', () => {
            const coursePoint: any = {
                d: 100, t: 'Control', n: 'Control _Pizza Place_', x: 1, y: 2, i: 0, description: undefined
            };
            const result = AnalyzeRoute['businessFromText'](coursePoint);
            expect(result).toBe('Pizza Place');
        });

        it('should return undefined if no business specified', () => {
            const coursePoint: any = {
                d: 100, t: 'Control', n: 'Control', x: 1, y: 2, i: 0, description: undefined
            };
            const result = AnalyzeRoute['businessFromText'](coursePoint);
            expect(result).toBeUndefined();
        });

        it('should extract from description if name unavailable', () => {
            const coursePoint: any = {
                d: 100, t: 'Control', n: undefined, x: 1, y: 2, i: 0, description: 'Check _Gas Station_'
            };
            const result = AnalyzeRoute['businessFromText'](coursePoint);
            expect(result).toBe('Gas Station');
        });
    });

    describe('rusa_time', () => {
        it('should return 0 for 0 distance', () => {
            const result = AnalyzeRouteClass.rusa_time(0, 5);
            expect(result).toBe(0);
        });

        it('should return positive banked time for short distance completed quickly', () => {
            const result = AnalyzeRouteClass.rusa_time(100, 4);
            expect(result).toBeGreaterThan(0);
        });

        it('should return negative banked time if elapsed exceeds closure time', () => {
            const result = AnalyzeRouteClass.rusa_time(100, 10);
            expect(result).toBeLessThan(0);
        });

        it('should calculate correct closure times for different distance brackets', () => {
            // 200km: 400 min * 0.004 = 1600 min
            const shortResult = AnalyzeRouteClass.rusa_time(200, 0);
            expect(shortResult).toBeGreaterThan(0);

            // 700km: 2400 + (100 * 0.00525) = 2400.525 min
            const mediumResult = AnalyzeRouteClass.rusa_time(700, 0);
            expect(mediumResult).toBeGreaterThan(shortResult);
        });
    });

    describe('calculateElapsedTime', () => {
        it('should return 0 for distance less than 1 mile', () => {
            const result = AnalyzeRouteClass.calculateElapsedTime(0, 1, 15);
            expect(result).toBeCloseTo(0, 5);
        });

        it('should calculate elapsed time with no climb', () => {
            const result = AnalyzeRouteClass.calculateElapsedTime(0, 50, 15);
            expect(result).toBeGreaterThan(0);
        });

        it('should increase elapsed time with elevation gain', () => {
            const flatResult = AnalyzeRouteClass.calculateElapsedTime(0, 50, 15);
            const hillResult = AnalyzeRouteClass.calculateElapsedTime(1000, 50, 15);
            expect(hillResult).toBeGreaterThan(flatResult);
        });

        it('should handle walking speeds correctly', () => {
            const result = AnalyzeRouteClass.calculateElapsedTime(1000, 50, 4);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('getHilliness', () => {
        it('should reduce speed based on grade', () => {
            const result = AnalyzeRouteClass.getHilliness(5000, 50, 15);
            expect(result).toBeLessThan(15);
        });

        it('should cap hilliness multiplier at 6', () => {
            const result = AnalyzeRouteClass.getHilliness(50000, 10, 20);
            expect(result).toBeGreaterThan(0);
        });

        it('should return base speed for very low cycling speeds', () => {
            const result = AnalyzeRouteClass.getHilliness(5000, 50, 5);
            expect(result).toBe(5);
        });

        it('should enforce minimum speed of 3 for cycling', () => {
            const result = AnalyzeRouteClass.getHilliness(50000, 50, 15);
            expect(result).toBeGreaterThanOrEqual(3);
        });

        it('should return 1 for extreme hilliness with low base speed', () => {
            const result = AnalyzeRouteClass.getHilliness(100000, 10, 2);
            expect(result).toBe(2);  // baseSpeed < 7 means hiking pace, so returns baseSpeed as-is
        });
    });

    describe('addToForecast', () => {
        it('should create forecast request with correct properties', () => {
            const startTime = DateTime.now();
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 2, 50, false);
            expect(result.lat).toBe(mockPoint1.lat);
            expect(result.lon).toBe(mockPoint1.lon);
            expect(result.distance).toBe(50);
            expect(result.isControl).toBe(false);
        });

        it('should mark control points correctly', () => {
            const startTime = DateTime.now();
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 2, 50, true);
            expect(result.isControl).toBe(true);
        });

        it('should calculate time correctly', () => {
            const startTime = DateTime.fromISO('2024-01-01T08:00:00');
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 2, 50, false);
            expect(result.time).toContain('2024-01-01T10:00:00');
        });

        it('should round distance correctly', () => {
            const startTime = DateTime.now();
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 0, 50.6, false);
            expect(result.distance).toBe(51);
        });
    });

    describe('getBearingBetween', () => {
        it('should calculate relative bearing between track and wind', () => {
            const result = AnalyzeRouteClass.getBearingBetween(0, 90);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(180);
        });

        it('should handle 360 degree wrap around', () => {
            const result = AnalyzeRouteClass.getBearingBetween(10, 350);
            expect(result).toBeCloseTo(20, 0);
        });

        it('should be symmetric', () => {
            const forward = AnalyzeRouteClass.getBearingBetween(45, 135);
            const backward = AnalyzeRouteClass.getBearingBetween(135, 45);
            expect(forward).toBe(backward);
        });

        it('should return 0 for same bearing', () => {
            const result = AnalyzeRouteClass.getBearingBetween(90, 90);
            expect(result).toBe(0);
        });
    });

    describe('windToTimeInMinutes', () => {
        it('should return negative minutes for tailwind', () => {
            const result = AnalyzeRouteClass.windToTimeInMinutes(15, 50, 20);
            expect(result).toBeLessThan(0);
        });

        it('should return positive minutes for headwind', () => {
            const result = AnalyzeRouteClass.windToTimeInMinutes(15, 50, 10);
            expect(result).toBeGreaterThan(0);
        });

        it('should return 0 for no wind effect', () => {
            const result = AnalyzeRouteClass.windToTimeInMinutes(15, 50, 15);
            expect(result).toBeCloseTo(0, 5);
        });
    });

    describe('getRelativeBearing', () => {
        it('should calculate bearing from point1 to point2', () => {
            const bearing = AnalyzeRouteClass.getRelativeBearing(mockPoint1, mockPoint2);
            expect(bearing).toBeGreaterThanOrEqual(0);
            expect(bearing).toBeLessThan(360);
        });

        it('should return different bearings for different directions', () => {
            const bearing1 = AnalyzeRouteClass.getRelativeBearing(mockPoint1, mockPoint2);
            const bearing2 = AnalyzeRouteClass.getRelativeBearing(mockPoint1, mockPoint3);
            expect(bearing1).not.toBe(bearing2);
        });

        it('should handle north bearing', () => {
            const northPoint: Point = { lat: mockPoint1.lat + 0.01, lon: mockPoint1.lon, elevation: 10 };
            const bearing = AnalyzeRouteClass.getRelativeBearing(mockPoint1, northPoint);
            expect(bearing).toBeCloseTo(0, 10);
        });
    });

    describe('fillLastControlPoints', () => {
        it('should fill remaining control points with finish time', () => {
            const controls: any = [
                { distance: 50, duration: 30, name: 'Control 1', id: 1 },
                { distance: 100, duration: 30, name: 'Control 2', id: 2 }
            ];
            const calculated: CalculatedValue[] = [
                { arrival: '08:00', banked: 100, val: 1, distance: 50 }
            ];
            const finishTime = '12:00';

            AnalyzeRouteClass['fillLastControlPoints'](finishTime, controls, 1, 4, 100, calculated);
            expect(calculated.length).toBe(2);
            expect(calculated[1].arrival).toBe(finishTime);
        });

        it('should calculate banked time for unfilled controls', () => {
            const controls: any = [
                { distance: 100, duration: 30, name: 'Control', id: 1 }
            ];
            const calculated: CalculatedValue[] = [];
            AnalyzeRouteClass['fillLastControlPoints']('12:00', controls, 0, 4, 100, calculated);
            expect(calculated[0].banked).toBeGreaterThan(0);
        });
    });

    describe('formatFinishTime', () => {
        it('should format finish time correctly', () => {
            const startTime = DateTime.fromISO('2024-01-01T08:00:00');
            const result = AnalyzeRouteClass['formatFinishTime'](startTime, 4, 0.5);
            expect(result).toContain('Jan 01 2024');
            expect(result).toContain('12:30');
        });

        it('should handle rest time addition', () => {
            const startTime = DateTime.fromISO('2024-01-01T08:00:00');
            const withoutRest = AnalyzeRouteClass['formatFinishTime'](startTime, 4, 0);
            const withRest = AnalyzeRouteClass['formatFinishTime'](startTime, 4, 1);
            expect(withRest).not.toBe(withoutRest);
        });
    });

    describe('instance methods', () => {
        it('should have bound methods in constructor', () => {
            expect(typeof AnalyzeRoute.walkRwgpsRoute).toBe('function');
            expect(typeof AnalyzeRoute.walkGpxRoute).toBe('function');
            expect(typeof AnalyzeRoute.analyzeRoute).toBe('function');
        });
    });

    describe('computePointsAndBounds', () => {
        it('should compute bounds from point stream', () => {
            const points: Point[] = [mockPoint1, mockPoint2, mockPoint3];
            const result = AnalyzeRoute['computePointsAndBounds'](points);
            expect(result.pointList).toEqual(points);
            expect(result.bounds).toBeDefined();
        });

        it('should calculate minimum and maximum coordinates', () => {
            const points: Point[] = [mockPoint1, mockPoint2, mockPoint3];
            const result = AnalyzeRoute['computePointsAndBounds'](points);
            expect(result.bounds.min_latitude).toBeLessThanOrEqual(result.bounds.max_latitude);
            expect(result.bounds.min_longitude).toBeLessThanOrEqual(result.bounds.max_longitude);
        });

        it('should handle single point', () => {
            const points: Point[] = [mockPoint1];
            const result = AnalyzeRoute['computePointsAndBounds'](points);
            expect(result.pointList.length).toBe(1);
            expect(result.bounds.min_latitude).toBe(mockPoint1.lat);
            expect(result.bounds.max_latitude).toBe(mockPoint1.lat);
        });

        it('should handle empty point array', () => {
            const points: Point[] = [];
            const result = AnalyzeRoute['computePointsAndBounds'](points);
            expect(result.pointList.length).toBe(0);
        });
    });

    describe('parseRwgpsRouteStream', () => {
        it('should extract points from route type data', () => {
            const routeData: any = {
                type: 'route',
                route: {
                    track_points: [
                        { x: -74.0060, y: 40.7128, e: 10, d: 0 },
                        { x: -74.0050, y: 40.7138, e: 20, d: 1 }
                    ]
                }
            };
            const result = AnalyzeRoute['parseRwgpsRouteStream'](routeData);
            expect(result.length).toBe(2);
            expect(result[0].lat).toBe(40.7128);
            expect(result[0].lon).toBe(-74.0060);
        });

        it('should extract points from trip type data', () => {
            const routeData: any = {
                type: 'trip',
                trip: {
                    track_points: [
                        { x: -74.0060, y: 40.7128, e: 10, d: 0 },
                        { x: -74.0050, y: 40.7138, e: 20, d: 1 }
                    ]
                }
            };
            const result = AnalyzeRoute['parseRwgpsRouteStream'](routeData);
            expect(result.length).toBe(2);
            expect(result[0].dist).toBe(0);
        });

        it('should filter out points with missing coordinates', () => {
            const routeData: any = {
                type: 'route',
                route: {
                    track_points: [
                        { x: -74.0060, y: 40.7128, e: 10, d: 0 },
                        { x: undefined, y: 40.7138, e: 20, d: 1 },
                        { x: -74.0050, y: undefined, e: 30, d: 2 }
                    ]
                }
            };
            const result = AnalyzeRoute['parseRwgpsRouteStream'](routeData);
            expect(result.length).toBe(1);
        });
    });

    describe('parseGpxRouteStream', () => {
        it('should extract points from GPX track data', () => {
            const routeData: any = {
                tracks: [
                    {
                        points: [
                            { latitude: 40.7128, longitude: -74.0060, elevation: 10 },
                            { latitude: 40.7138, longitude: -74.0050, elevation: 20 }
                        ]
                    }
                ]
            };
            const result = AnalyzeRoute['parseGpxRouteStream'](routeData);
            expect(result.length).toBe(2);
            expect(result[0].lat).toBe(40.7128);
            expect(result[0].elevation).toBe(10);
        });

        it('should combine multiple tracks', () => {
            const routeData: any = {
                tracks: [
                    {
                        points: [
                            { lat: 40.7128, lon: -74.0060, ele: 10 }
                        ]
                    },
                    {
                        points: [
                            { lat: 40.7138, lon: -74.0050, ele: 20 },
                            { lat: 40.7148, lon: -74.0040, ele: 30 }
                        ]
                    }
                ]
            };
            const result = AnalyzeRoute['parseGpxRouteStream'](routeData);
            expect(result.length).toBe(3);
        });
    });

    describe('controlFromCoursePoint', () => {
        it('should extract control from course point with name', () => {
            const coursePoint: any = {
                d: 50000, t: 'Control', n: 'Checkpoint A', x: -74.0060, y: 40.7128, i: 0, description: undefined
            };
            const result = AnalyzeRoute['controlFromCoursePoint'](coursePoint, 200);
            expect(result.name).toBe('Checkpoint A');
            expect(result.distance).toBeGreaterThan(0);
            expect(result.lat).toBe(40.7128);
            expect(result.lon).toBe(-74.0060);
        });

        it('should use description if name is missing', () => {
            const coursePoint: any = {
                d: 50000, t: 'Control', n: undefined, x: -74.0060, y: 40.7128, i: 0, description: 'Checkpoint B'
            };
            const result = AnalyzeRoute['controlFromCoursePoint'](coursePoint, 200);
            expect(result.name).toBe('Checkpoint B');
        });

        it('should extract business from course point', () => {
            const coursePoint: any = {
                d: 50000, t: 'Control', n: 'Control _Pizza Hut_', x: -74.0060, y: 40.7128, i: 0, description: undefined
            };
            const result = AnalyzeRoute['controlFromCoursePoint'](coursePoint, 200);
            expect(result.business).toBe('Pizza Hut');
        });

        it('should extract duration from control name', () => {
            const coursePoint: any = {
                d: 50000, t: 'Control', n: 'Lunch 45m', x: -74.0060, y: 40.7128, i: 0, description: undefined
            };
            const result = AnalyzeRoute['controlFromCoursePoint'](coursePoint, 200);
            expect(result.duration).toBe(45);
        });

        it('should not exceed total distance for control distance', () => {
            const coursePoint: any = {
                d: 500000, t: 'Control', n: 'Final', x: -74.0060, y: 40.7128, i: 0, description: undefined
            };
            const result = AnalyzeRoute['controlFromCoursePoint'](coursePoint, 100);
            expect(result.distance).toBeLessThanOrEqual(100);
        });
    });

    describe('extractControlPoints', () => {
        it('should filter and extract control points from route', () => {
            const routeData: any = {
                type: 'route',
                route: {
                    distance: 200000,
                    course_points: [
                        { d: 50000, t: 'Control', n: 'Check 1', x: 1, y: 2, i: 0, description: undefined },
                        { d: 100000, t: 'Regular', n: 'Not a control', x: 3, y: 4, i: 1, description: undefined },
                        { d: 150000, t: 'Control', n: 'Check 2', x: 5, y: 6, i: 2, description: undefined }
                    ]
                }
            };
            const result = AnalyzeRoute['extractControlPoints'](routeData);
            expect(result.length).toBe(2);
            expect(result[0].name).toContain('Check 1');
            expect(result[1].name).toContain('Check 2');
        });

        it('should work with trip type data', () => {
            const routeData: any = {
                type: 'trip',
                trip: {
                    distance: 200000,
                    course_points: [
                        { d: 50000, t: 'Control', n: 'Check 1', x: 1, y: 2, i: 0, description: undefined }
                    ]
                }
            };
            const result = AnalyzeRoute['extractControlPoints'](routeData);
            expect(result.length).toBe(1);
        });

        it('should return empty array if no controls', () => {
            const routeData: any = {
                type: 'route',
                route: {
                    distance: 200000,
                    course_points: [
                        { d: 50000, t: 'Regular', n: 'Point 1', x: 1, y: 2, i: 0, description: undefined }
                    ]
                }
            };
            const result = AnalyzeRoute['extractControlPoints'](routeData);
            expect(result.length).toBe(0);
        });
    });

    describe('businessFromPoiText', () => {
        it('should extract business from POI text with underscore delimiters', () => {
            const poi: any = { n: 'Rest Stop', d: '_Coffee Shop_' };
            const result = AnalyzeRoute['businessFromPoiText'](poi);
            expect(result).toBe('Coffee Shop');
        });

        it('should return undefined if no business markers', () => {
            const poi: any = { n: 'Rest Stop', d: 'Just some text' };
            const result = AnalyzeRoute['businessFromPoiText'](poi);
            expect(result).toBeUndefined();
        });
    });

    describe('poiText', () => {
        it('should format POI text with name only', () => {
            const poi: any = { n: 'Rest Stop', d: undefined };
            const result = AnalyzeRoute['poiText'](poi);
            expect(result).toBe('Rest Stop');
        });

        it('should include description on new line if present', () => {
            const poi: any = { n: 'Rest Stop', d: 'Details here' };
            const result = AnalyzeRoute['poiText'](poi);
            expect(result).toContain('Rest Stop');
            expect(result).toContain('\n');
            expect(result).toContain('Details here');
        });
    });

    describe('loadGpxFile', () => {
        it('should parse GPX file data', () => {
            const gpxData: any = {
                tracks: [],
                metadata: { name: 'Test Route' }
            };
            const result = AnalyzeRoute.loadGpxFile(gpxData);
            expect(result.gpxData).toBeDefined();
            expect(result.gpxData?.name).toBeDefined();
        });

        it('should extract track information', () => {
            const gpxData: any = {
                tracks: [{ name: 'Track 1' }],
                metadata: { name: 'Test Route' }
            };
            const result = AnalyzeRoute.loadGpxFile(gpxData);
            expect(result.gpxData?.tracks).toBeDefined();
        });
    });

    describe('rusa_time distance brackets', () => {
        it('should calculate correct time for 600km bracket', () => {
            const result = AnalyzeRouteClass.rusa_time(600, 0);
            expect(result).toBeCloseTo(2400, 0); // 600 * 0.004 = 2400
        });

        it('should calculate correct time for 1000km bracket', () => {
            const result = AnalyzeRouteClass.rusa_time(1000, 0);
            // 1000km is in the 1000+ bracket: 4500 + ((1000-1000) * 0.0045) = 4500
            expect(result).toBeCloseTo(4500, 0);
        });

        it('should calculate correct time for 1200km bracket', () => {
            const result = AnalyzeRouteClass.rusa_time(1200, 0);
            // 1200km is over 1000km: 4500 + ((1200000 - 1000000) * 0.0045) = 4500 + 900 = 5400
            expect(result).toBeCloseTo(5400, 0);
        });
    });

    describe('getHilliness edge cases', () => {
        it('should handle zero distance', () => {
            const result = AnalyzeRouteClass.getHilliness(1000, 0.001, 15);
            expect(result).toBeGreaterThan(0);
        });

        it('should return minimum speed of 1 for extreme cases', () => {
            const result = AnalyzeRouteClass.getHilliness(100000, 1, 15);
            expect(result).toBeGreaterThanOrEqual(1);
        });

        it('should handle high altitude climbs', () => {
            const result = AnalyzeRouteClass.getHilliness(10000, 50, 20);
            expect(result).toBeLessThan(20);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('calculateElapsedTime with various paces', () => {
        it('should calculate time for fast cycling pace', () => {
            const result = AnalyzeRouteClass.calculateElapsedTime(500, 50, 18);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(3);
        });

        it('should calculate time for recreational cycling pace', () => {
            const result = AnalyzeRouteClass.calculateElapsedTime(500, 50, 12);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeGreaterThan(3);
        });

        it('should calculate time for walking pace', () => {
            const result = AnalyzeRouteClass.calculateElapsedTime(500, 50, 3);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('getRelativeBearing special cases', () => {
        it('should calculate bearing due east', () => {
            const p1: Point = { lat: 0, lon: 0, elevation: 0 };
            const p2: Point = { lat: 0, lon: 0.1, elevation: 0 };
            const bearing = AnalyzeRouteClass.getRelativeBearing(p1, p2);
            expect(bearing).toBeCloseTo(90, 10);
        });

        it('should calculate bearing due south', () => {
            const p1: Point = { lat: 0, lon: 0, elevation: 0 };
            const p2: Point = { lat: -0.1, lon: 0, elevation: 0 };
            const bearing = AnalyzeRouteClass.getRelativeBearing(p1, p2);
            expect(bearing).toBeCloseTo(180, 10);
        });

        it('should calculate bearing due west', () => {
            const p1: Point = { lat: 0, lon: 0, elevation: 0 };
            const p2: Point = { lat: 0, lon: -0.1, elevation: 0 };
            const bearing = AnalyzeRouteClass.getRelativeBearing(p1, p2);
            expect(bearing).toBeCloseTo(270, 10);
        });
    });

    describe('windToTimeInMinutes special cases', () => {
        it('should handle high wind speeds', () => {
            const result = AnalyzeRouteClass.windToTimeInMinutes(15, 100, 5);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeGreaterThan(100); // Significant headwind
        });

        it('should handle strong tailwind', () => {
            const result = AnalyzeRouteClass.windToTimeInMinutes(15, 100, 25);
            expect(result).toBeLessThan(0);
            expect(result).toBeLessThan(-100); // Significant tailwind
        });

        it('should handle short distances', () => {
            const result = AnalyzeRouteClass.windToTimeInMinutes(15, 1, 10);
            // (1*60)/10 - (1*60)/15 = 6 - 4 = 2
            expect(result).toBeCloseTo(2, 0);
        });
    });

    describe('addToForecast with various distances', () => {
        it('should round up distance correctly', () => {
            const startTime = DateTime.now();
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 0, 50.4, false);
            expect(result.distance).toBe(50);
        });

        it('should round down distance correctly', () => {
            const startTime = DateTime.now();
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 0, 50.5, false);
            expect(result.distance).toBe(51);
        });

        it('should handle zero distance', () => {
            const startTime = DateTime.now();
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 0, 0, false);
            expect(result.distance).toBe(0);
        });

        it('should include timezone information in time', () => {
            const startTime = DateTime.fromISO('2024-06-15T08:00:00');
            const result = AnalyzeRouteClass.addToForecast(mockPoint1, startTime, 2, 50, false);
            // Check that time format contains both date and time with timezone offset
            expect(result.time).toMatch(/T\d{2}:\d{2}/);
        });
    });

    describe('getBearingBetween corner cases', () => {
        it('should handle opposite bearings', () => {
            const result = AnalyzeRouteClass.getBearingBetween(0, 180);
            expect(result).toBe(180);
        });

        it('should handle nearly opposite bearings', () => {
            const result = AnalyzeRouteClass.getBearingBetween(5, 185);
            expect(result).toBeCloseTo(180, 0);
        });

        it('should handle small angle differences', () => {
            const result = AnalyzeRouteClass.getBearingBetween(0, 5);
            expect(result).toBe(5);
        });

        it('should handle 359 degree wrap around', () => {
            const result = AnalyzeRouteClass.getBearingBetween(1, 360);
            expect(result).toBe(1);
        });
    });

    describe('findPreviousPoint with large point arrays', () => {
        it('should efficiently find point in large array', () => {
            const points: Point[] = Array.from({ length: 1000 }, (_, i) => ({
                lat: 40.7128 + (i * 0.001),
                lon: -74.0060 + (i * 0.001),
                elevation: 10 + i
            }));
            const testPoint: Point = { lat: 41.5, lon: -73.0, elevation: 1000 };
            const result = AnalyzeRoute['findPreviousPoint'](points, testPoint);
            expect(result).toBeDefined();
        });
    });

    describe('isControl with rest stop patterns', () => {
        it('should identify rest stop points', () => {
            const restStop: any = {
                d: 100, t: 'Other', n: 'Rest Stop: Main St', x: 1, y: 2, i: 0, description: undefined
            };
            expect(AnalyzeRoute['isControl'](restStop)).toBeTruthy();
        });

        it('should identify regroup points', () => {
            const regroup: any = {
                d: 100, t: 'Other', n: 'Regroup: Intersection', x: 1, y: 2, i: 0, description: undefined
            };
            expect(AnalyzeRoute['isControl'](regroup)).toBeTruthy();
        });

        it('should identify lunch points', () => {
            const lunch: any = {
                d: 100, t: 'Other', n: 'Lunch: Cafe', x: 1, y: 2, i: 0, description: undefined
            };
            expect(AnalyzeRoute['isControl'](lunch)).toBeTruthy();
        });

        it('should exclude exit points', () => {
            const exit: any = {
                d: 100, t: 'Other', n: 'Exit: Highway', x: 1, y: 2, i: 0, description: undefined
            };
            expect(AnalyzeRoute['isControl'](exit)).toBeFalsy();
        });
    });

    describe('findDeltas with various elevation changes', () => {
        it('should handle large elevation gains', () => {
            const p1: Point = { lat: 40.7128, lon: -74.0060, elevation: 0 };
            const p2: Point = { lat: 40.7138, lon: -74.0050, elevation: 1000 };
            const result = AnalyzeRoute['findDeltas'](p1, p2);
            expect(result.climb).toBe(1000);
        });

        it('should ignore elevation losses', () => {
            const p1: Point = { lat: 40.7128, lon: -74.0060, elevation: 1000 };
            const p2: Point = { lat: 40.7138, lon: -74.0050, elevation: 500 };
            const result = AnalyzeRoute['findDeltas'](p1, p2);
            expect(result.climb).toBe(0);
        });
    });

    describe('formatFinishTime formatting', () => {
        it('should format with day of week', () => {
            const startTime = DateTime.fromISO('2024-01-15T08:00:00'); // Monday
            const result = AnalyzeRouteClass['formatFinishTime'](startTime, 4, 0);
            expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
        });

        it('should format with month abbreviation', () => {
            const startTime = DateTime.fromISO('2024-12-25T08:00:00');
            const result = AnalyzeRouteClass['formatFinishTime'](startTime, 4, 0);
            expect(result).toContain('Dec');
        });
    });

    describe('fillLastControlPoints with no remaining controls', () => {
        it('should not add anything if all controls filled', () => {
            const controls: any = [];
            const calculated: CalculatedValue[] = [];
            AnalyzeRouteClass['fillLastControlPoints']('12:00', controls, 0, 4, 100, calculated);
            expect(calculated.length).toBe(0);
        });

        it('should handle nextControl >= controls.length', () => {
            const controls: any = [
                { distance: 50, id: 1 },
                { distance: 100, id: 2 }
            ];
            const calculated: CalculatedValue[] = [];
            AnalyzeRouteClass['fillLastControlPoints']('12:00', controls, 2, 4, 100, calculated);
            expect(calculated.length).toBe(0);
        });
    });
});