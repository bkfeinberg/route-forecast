import { stravaReducer,
    stravaTokenSet,
    stravaRefreshTokenSet,
    stravaActivitySet,
    stravaRouteSet,
    stravaFetchBegun,
    stravaFetched,
    stravaFetchFailed,
    analysisIntervalSet,
    mapSubrangeSet,
    mapRangeToggled
} from './stravaSlice';
import { rwgpsRouteSet, reset as routeParamsReset } from './routeParamsSlice';
import { stravaErrorSet } from './dialogParamsSlice';

describe('stravaSlice reducer', () => {
    const initial = stravaReducer(undefined, { type: 'unknown' });

    test('initial state', () => {
        expect(initial).toEqual({
            analysisInterval: expect.any(Number),
            activity: '',
            route: '',
            access_token: null,
            refresh_token: null,
            expires_at: null,
            fetching: false,
            activityData: null,
            activityStream: null,
            subrange: []
        });
    });

    test('stravaTokenSet stores token and expiry when provided', () => {
        const state = stravaReducer(initial, stravaTokenSet({ token: 'tok', expires_at: 123 }));
        expect(state.access_token).toBe('tok');
        expect(state.expires_at).toBe(123);
    });

    test('stravaRefreshTokenSet stores refresh token', () => {
        const state = stravaReducer(initial, stravaRefreshTokenSet('ref'));
        expect(state.refresh_token).toBe('ref');
    });

    test('stravaActivitySet normalizes value and clears dependent data', () => {
        const mod = { ...initial, activity: 'old', activityData: {message:'begin', total_elevation_gain: 500}, 
            activityStream: {message:'stream', 
                distance:{data:[]}, time: {data:[]}, altitude: {data:[]}, 
                latlng: {data:[]}, moving: {data:[]}}, subrange: [1,2] as any };
        const state = stravaReducer(mod, stravaActivitySet('https://strava.com/activities/45'));
        expect(state.activity).toBe('45');
        expect(state.activityData).toBeNull();
        expect(state.activityStream).toBeNull();
        expect(state.subrange).toEqual([]);
    });

    test('stravaRouteSet normalizes route value', () => {
        const state = stravaReducer(initial, stravaRouteSet('/some/99'));
        expect(state.route).toBe('99');
    });

    test('stravaFetchBegun sets fetching flag', () => {
        const state = stravaReducer(initial, stravaFetchBegun());
        expect(state.fetching).toBe(true);
    });

    test('stravaFetched stores activity and computes analysis interval correctly', () => {
        const payload = { activity: { elapsed_time: 5 * 3600 } as any, stream: { } as any };
        const state = stravaReducer(initial, stravaFetched(payload));
        expect(state.fetching).toBe(false);
        expect(state.activityData).toBe(payload.activity);
        expect(state.activityStream).toBe(payload.stream);
        expect(state.analysisInterval).toBe(1);

        // check a longer duration triggers a larger interval
        const longPayload = { activity: { elapsed_time: 80 * 3600 } as any, stream: {} as any };
        const state2 = stravaReducer(initial, stravaFetched(longPayload));
        expect(state2.analysisInterval).toBe(24);
    });

    test('stravaFetchFailed clears access_token on Authorization Error', () => {
        const mod = { ...initial, access_token: 't' };
        const state = stravaReducer(mod, stravaFetchFailed({ message: 'Authorization Error' }));
        expect(state.fetching).toBe(false);
        expect(state.access_token).toBeNull();
    });

    test('analysisIntervalSet parses string and clears subrange', () => {
        const mod = { ...initial, subrange: [1,2] as any };
        const state = stravaReducer(mod, analysisIntervalSet('3.5'));
        expect(state.analysisInterval).toBe(3.5);
        expect(state.subrange).toEqual([]);
    });

    test('mapSubrangeSet stores numeric boundaries', () => {
        const state = stravaReducer(initial, mapSubrangeSet({ start: '1', finish: '2' }));
        expect(state.subrange).toEqual([1,2]);
    });

    test('mapRangeToggled toggles correctly', () => {
        let state = stravaReducer(initial, mapRangeToggled({ start: '1', finish: '2' }));
        expect(state.subrange).toEqual([1,2]);
        state = stravaReducer(state, mapRangeToggled({ start: '1', finish: '2' }));
        expect(state.subrange).toEqual([]);
    });

    describe('extra reducers', () => {
        test('rwgpsRouteSet with payload clears activity-related fields', () => {
            const mod = { ...initial, activity: 'a', route: 'r', activityData: {message:'begin', total_elevation_gain: 500}, 
            activityStream: {message:'stream', 
                distance:{data:[]}, time: {data:[]}, altitude: {data:[]}, 
                latlng: {data:[]}, moving: {data:[]}}, subrange: [1,2] as any };
            const state = stravaReducer(mod, rwgpsRouteSet('123'));
            expect(state.activity).toBe('');
            expect(state.route).toBe('');
            expect(state.activityData).toBeNull();
            expect(state.activityStream).toBeNull();
            expect(state.subrange).toEqual([]);
        });

        test('stravaErrorSet clears tokens', () => {
            const mod = { ...initial, access_token: 'a', refresh_token: 'r' };
            const state = stravaReducer(mod, stravaErrorSet('err'));
            expect(state.access_token).toBeNull();
            expect(state.refresh_token).toBeNull();
        });

        test('routeParams/reset returns initial state', () => {
            const mod = { ...initial, activity: 'x' };
            const state = stravaReducer(mod, routeParamsReset());
            expect(state).toEqual(initial);
        });
    });
});
