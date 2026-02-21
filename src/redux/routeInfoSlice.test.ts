import { routeInfoReducer,
    rwgpsRouteLoaded,
    gpxRouteLoaded,
    routeDataCleared,
    loadingFromUrlSet,
    RwgpsRoute,
    GpxRouteData
} from './routeInfoSlice';

// stub uuid so we can make deterministic assertions
jest.mock('uuid', () => ({ v4: jest.fn() }));
const { v4: mockUuid } = require('uuid');

describe('routeInfoSlice reducer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('initial state is correct', () => {
        const state = routeInfoReducer(undefined, { type: 'unknown' });
        expect(state).toMatchObject({
            name: '',
            rwgpsRouteData: null,
            gpxRouteData: null,
            loadingFromURL: false,
            distanceInKm: 0,
            canDoUserSegment: false,
            type: 'none',
            routeUUID: null,
            country: 'US'
        });
    });

    test('rwgpsRouteLoaded populates fields and computes distance/country', () => {
        // prepare a minimal route object
        const route: RwgpsRoute = {
            type: 'route',
            route: {
                country_code: 'CA',
                distance: 2000,
                name: 'myroute',
                track_points: [{ lat: 0, lon: 0, d: 1 } as any],
                course_points: [],
                points_of_interest: [],
                id: 7
            }
        };
        mockUuid.mockReturnValueOnce('u1');
        const state = routeInfoReducer(undefined, rwgpsRouteLoaded(route));
        expect(state.type).toBe('rwgps');
        expect(state.rwgpsRouteData).toBe(route);
        expect(state.name).toBe('myroute');
        expect(state.distanceInKm).toBe(2); // 2000/1000
        expect(state.canDoUserSegment).toBe(true);
        expect(state.country).toBe('CA');
        expect(state.routeUUID).toBe('u1');
    });

    test('gpxRouteLoaded populates fields and computes distance', () => {
        const gpx: GpxRouteData = {
            name: 'gpx1',
            tracks: [{ distance: { total: 3000 }, points: [], name: 'gpx1', link: '' }],
            type: 'gpx'
        };
        mockUuid.mockReturnValueOnce('u2');
        const state = routeInfoReducer(undefined, gpxRouteLoaded(gpx));
        expect(state.type).toBe('gpx');
        expect(state.gpxRouteData).toEqual(gpx);
        // track name is used for route name
        expect(state.name).toBe('gpx1');
        expect(state.distanceInKm).toBe(3); // 3000/1000
        expect(state.country).toBe('US');
        expect(state.routeUUID).toBe('u2');
    });

    test('routeDataCleared resets route-specific values', () => {
        const initial = routeInfoReducer(undefined, { type: 'unknown' });
        // start with something non-initial
        mockUuid.mockReturnValue('u3');
        let state = routeInfoReducer(undefined, rwgpsRouteLoaded({
            type: 'route',
            route: { country_code: 'US', distance: 1000, name: 'foo', track_points: [{lat:0,lon:0,d:1} as any], course_points: [], points_of_interest: [], id: 1 }
        } as any));
        expect(state.type).not.toBe(initial.type);
        state = routeInfoReducer(state, routeDataCleared());
        // routeDataCleared only resets a subset of fields
        expect(state.rwgpsRouteData).toBe(initial.rwgpsRouteData);
        expect(state.gpxRouteData).toBe(initial.gpxRouteData);
        expect(state.name).toBe(initial.name);
        expect(state.type).toBe(initial.type);
        expect(state.distanceInKm).toBe(initial.distanceInKm);
        expect(state.routeUUID).toBe(initial.routeUUID);
    });

    test('loadingFromUrlSet toggles flag', () => {
        let state = routeInfoReducer(undefined, loadingFromUrlSet(true));
        expect(state.loadingFromURL).toBe(true);
        state = routeInfoReducer(state, loadingFromUrlSet(false));
        expect(state.loadingFromURL).toBe(false);
    });

    describe('extra reducers affecting routeUUID', () => {
        test('routeParams/startTimeSet triggers new uuid', () => {
            mockUuid.mockReturnValueOnce('u4');
            let state = routeInfoReducer(undefined, { type: 'routeParams/startTimeSet' });
            expect(state.routeUUID).toBe('u4');
        });

        test('timeZoneSet only updates when payload differs', () => {
            const initial = routeInfoReducer(undefined, { type: 'unknown' });
            const sameZone = initial.zoneCopy;
            // same zone should not call uuid
            mockUuid.mockReturnValue('should-not-be-used');
            let state = routeInfoReducer(initial, { type: 'routeParams/timeZoneSet', payload: sameZone });
            expect(state.routeUUID).toBe(null);

            // different zone should update
            mockUuid.mockReturnValue('u5');
            state = routeInfoReducer(state, { type: 'routeParams/timeZoneSet', payload: 'Some/Else' });
            expect(state.routeUUID).toBe('u5');
            expect(state.zoneCopy).toBe('Some/Else');
        });
    });
});
