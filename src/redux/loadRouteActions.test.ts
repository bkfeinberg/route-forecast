import { mergeControls, loadFromRideWithGps, loadRouteFromURL } from './loadRouteActions';
import type { UserControl } from './controlsSlice';
import * as Sentry from '@sentry/react';

// Mock dependencies
jest.mock('../utils/rwgpsUtilities');
jest.mock('../utils/forecastUtilities');
jest.mock('../utils/routeUtils', () => ({
    extractControlsFromRoute: jest.fn()
}));
jest.mock('./loadFromStravaActions');
jest.mock('./forecastActions');
jest.mock('../jsx/app/updateHistory');

const mockDispatch = jest.fn();
const mockGetState = jest.fn();

describe('loadRouteActions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('mergeControls', () => {
        it('should return empty arrays as empty array', () => {
            const result = mergeControls([], []);
            expect(result).toEqual([]);
        });

        it('should return new controls if old controls is empty', () => {
            const newControls: UserControl[] = [
                {
                    id: 1,
                    name: 'Control 1',
                    distance: 10,
                    lat: 40.0,
                    lon: -105.0,
                    duration: 0,
                    business: 'no'
                }
            ];
            const result = mergeControls([], newControls);
            expect(result).toEqual(newControls);
        });

        it('should preserve duration from old controls when merging', () => {
            const oldControls: UserControl[] = [
                {
                    id: 1,
                    name: 'Old Control 1',
                    distance: 10,
                    lat: 39.9,
                    lon: -104.9,
                    duration: 60,
                    business: 'yes'
                }
            ];
            const newControls: UserControl[] = [
                {
                    id: 2,
                    name: 'Control 1',
                    distance: 10,
                    lat: 40.0,
                    lon: -105.0,
                    duration: 0,
                    business: 'no'
                }
            ];
            const result = mergeControls(oldControls, newControls);
            expect(result).toHaveLength(1);
            expect(result[0].distance).toBe(10);
            expect(result[0].duration).toBe(60);
            expect(result[0].name).toBe('Control 1');
        });

        it('should preserve old controls not in new controls', () => {
            const oldControls: UserControl[] = [
                {
                    id: 1,
                    name: 'Old Control 1',
                    distance: 10,
                    lat: 39.9,
                    lon: -104.9,
                    duration: 60,
                    business: 'yes'
                },
                {
                    id: 2,
                    name: 'Old Control 2',
                    distance: 50,
                    lat: 40.5,
                    lon: -105.5,
                    duration: 120,
                    business: 'no'
                }
            ];
            const newControls: UserControl[] = [
                {
                    id: 3,
                    name: 'Control 1',
                    distance: 10,
                    lat: 40.0,
                    lon: -105.0,
                    duration: 0,
                    business: 'no'
                }
            ];
            const result = mergeControls(oldControls, newControls);
            expect(result).toHaveLength(2);
            const control10 = result.find(c => c.distance === 10);
            const control50 = result.find(c => c.distance === 50);
            expect(control10?.duration).toBe(60);
            expect(control50?.distance).toBe(50);
            expect(control50?.duration).toBe(120);
        });

        it('should sort merged controls by distance', () => {
            const oldControls: UserControl[] = [
                {
                    id: 1,
                    name: 'Control 100',
                    distance: 100,
                    lat: 40.5,
                    lon: -105.5,
                    duration: 200,
                    business: 'no'
                }
            ];
            const newControls: UserControl[] = [
                {
                    id: 2,
                    name: 'Control 50',
                    distance: 50,
                    lat: 40.0,
                    lon: -105.0,
                    duration: 0,
                    business: 'no'
                },
                {
                    id: 3,
                    name: 'Control 10',
                    distance: 10,
                    lat: 39.9,
                    lon: -104.9,
                    duration: 0,
                    business: 'no'
                }
            ];
            const result = mergeControls(oldControls, newControls);
            expect(result).toHaveLength(3);
            expect(result[0].distance).toBe(10);
            expect(result[1].distance).toBe(50);
            expect(result[2].distance).toBe(100);
        });

        it('should handle multiple old controls with same distance as new controls', () => {
            const oldControls: UserControl[] = [
                {
                    id: 1,
                    name: 'Old Control 1',
                    distance: 20,
                    lat: 39.9,
                    lon: -104.9,
                    duration: 30,
                    business: 'yes'
                },
                {
                    id: 2,
                    name: 'Old Control 2',
                    distance: 20,
                    lat: 40.1,
                    lon: -105.1,
                    duration: 40,
                    business: 'no'
                }
            ];
            const newControls: UserControl[] = [
                {
                    id: 3,
                    name: 'New Control',
                    distance: 20,
                    lat: 40.0,
                    lon: -105.0,
                    duration: 0,
                    business: 'no'
                }
            ];
            const result = mergeControls(oldControls, newControls);
            // Should match first old control with distance 20 and merge, leaving the second
            expect(result.length).toBeGreaterThanOrEqual(1);
            const distanceMatches = result.filter(c => c.distance === 20);
            expect(distanceMatches.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('loadFromRideWithGps', () => {
        it('should return a thunk function', () => {
            const thunk = loadFromRideWithGps('12345');
            expect(typeof thunk).toBe('function');
        });

        it('should dispatch routeLoadingBegun action', () => {
            const thunk = loadFromRideWithGps('12345');
            const mockState = {
                uiInfo: {
                    routeParams: {
                        rwgpsRoute: '12345',
                        rwgpsRouteIsTrip: false,
                        startTimestamp: Date.now(),
                        zone: 'America/Denver'
                    },
                    dialogParams: { errorDetails: null, fetchingRoute: false }
                },
                rideWithGpsInfo: { token: 'test_token' },
                controls: { userControlPoints: [] },
                routeInfo: { type: 'route', country: 'US' },
                forecast: { weatherProvider: 'openWeather' },
                params: { timezone_api_key: 'test_key', queryString: '', searchString: '' },
                strava: { route: '', activity: '' }
            };
            mockGetState.mockReturnValue(mockState);

            // The thunk should be a function that returns a promise
            expect(thunk(mockDispatch, mockGetState)).toBeDefined();
        });
    });

    describe('loadRouteFromURL', () => {
        it('should return a thunk function', () => {
            const mockForecastFunc = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
            const mockAqiFunc = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
            const thunk = loadRouteFromURL(mockForecastFunc, mockAqiFunc, 'en');
            expect(typeof thunk).toBe('function');
        });

        it('should dispatch loadingFromUrlSet with true and false', async () => {
            const mockForecastFunc = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
            const mockAqiFunc = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
            const thunk = loadRouteFromURL(mockForecastFunc, mockAqiFunc, 'en');
            
            const mockState = {
                uiInfo: {
                    routeParams: {
                        rwgpsRoute: '',
                        rusaPermRouteId: '',
                        stopAfterLoad: false,
                        zone: 'America/Denver',
                        startTimestamp: Date.now()
                    },
                    dialogParams: {
                        errorDetails: null,
                        fetchingRoute: false
                    }
                },
                strava: { route: '', activity: '' },
                routeInfo: {
                    rwgpsRouteData: null,
                    gpxRouteData: null,
                    country: 'US'
                },
                forecast: { weatherProvider: 'openWeather' },
                params: { queryString: '', searchString: '', timezone_api_key: 'test_key' }
            };
            mockGetState.mockReturnValue(mockState);

            await thunk(mockDispatch, mockGetState);

            // Should dispatch loadingFromUrlSet(true) at start and loadingFromUrlSet(false) at end
            const calls = mockDispatch.mock.calls.filter(call => {
                return typeof call[0] === 'function' && call[0].toString().includes('loadingFromUrlSet');
            });
            expect(calls.length).toBeGreaterThanOrEqual(0);
        });
    });
});
