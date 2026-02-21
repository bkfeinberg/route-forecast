import { rwgpsInfoReducer,
    rwgpsTokenSet,
    pinnedRoutesSet,
    loadingPinnedSet,
    usePinnedRoutesSet,
    Favorite } from './rideWithGpsSlice';

describe('rideWithGpsSlice reducer', () => {
    const initialState = {
        pinnedRoutes: [],
        token: null,
        usePinnedRoutes: false,
        loadingRoutes: false
    };

    test('should return the initial state when passed an undefined state', () => {
        expect(rwgpsInfoReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('rwgpsTokenSet sets token value', () => {
        const action = rwgpsTokenSet('abc123');
        const state = rwgpsInfoReducer(initialState, action);
        expect(state.token).toBe('abc123');

        const cleared = rwgpsInfoReducer(state, rwgpsTokenSet(null));
        expect(cleared.token).toBeNull();
    });

    test('pinnedRoutesSet replaces pinnedRoutes array', () => {
        const favorites: Array<Favorite> = [
            { name: 'route1', id: 1, associated_object_id: 42, associated_object_type: 'route' }
        ];
        const state = rwgpsInfoReducer(initialState, pinnedRoutesSet(favorites));
        expect(state.pinnedRoutes).toEqual(favorites);

        // ensure previous state is overwritten rather than merged
        const more: Array<Favorite> = [
            { name: 'route2', id: 2, associated_object_id: 43, associated_object_type: 'route' }
        ];
        const after = rwgpsInfoReducer(state, pinnedRoutesSet(more));
        expect(after.pinnedRoutes).toEqual(more);
    });

    test('loadingPinnedSet toggles loadingRoutes flag', () => {
        const on = rwgpsInfoReducer(initialState, loadingPinnedSet(true));
        expect(on.loadingRoutes).toBe(true);
        const off = rwgpsInfoReducer(on, loadingPinnedSet(false));
        expect(off.loadingRoutes).toBe(false);
    });

    test('usePinnedRoutesSet toggles usePinnedRoutes flag', () => {
        const on = rwgpsInfoReducer(initialState, usePinnedRoutesSet(true));
        expect(on.usePinnedRoutes).toBe(true);
        const off = rwgpsInfoReducer(on, usePinnedRoutesSet(false));
        expect(off.usePinnedRoutes).toBe(false);
    });
});
