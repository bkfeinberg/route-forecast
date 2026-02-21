import { dialogParamsReducer,
    routeLoadingBegun,
    viewingControls,
    forecastFetchBegun,
    forecastFetchFailed,
    forecastFetchCanceled,
    rwgpsRouteLoadingFailed,
    gpxRouteLoadingFailed,
    errorDetailsSet,
    errorMessageListSet,
    errorMessageListAppend,
    lastErrorCleared,
    shortUrlSet,
    stravaErrorSet
} from './dialogParamsSlice';

// actions imported for extras
import { pinnedRoutesSet } from './rideWithGpsSlice';
import { stravaFetched, stravaFetchFailed } from './stravaSlice';
import { rwgpsRouteLoaded, gpxRouteLoaded } from './routeInfoSlice';
import { rwgpsRouteSetAsNumber, rwgpsRouteSet } from './routeParamsSlice';
import { forecastInvalidated } from './forecastSlice';

// mock sentry
jest.mock('@sentry/react', () => ({
    __esModule: true,
    metrics: { count: jest.fn() }
}));
const sentry = require('@sentry/react');

describe('dialogParamsSlice reducer', () => {
    let initial: any;
    beforeEach(() => {
        jest.clearAllMocks();
        initial = dialogParamsReducer(undefined, { type: 'unknown' });
    });

    test('initial state has defaults', () => {
        expect(initial).toMatchObject({
            errorDetails: null,
            errorMessageList: [],
            succeeded: true,
            shortUrl: 'click here to get a short URL',
            loadingSource: null,
            fetchingForecast: false,
            fetchingRoute: false,
            viewControls: false
        });
    });

    test('routeLoadingBegun sets loadingSource and flag', () => {
        const state = dialogParamsReducer(initial, routeLoadingBegun('foo'));
        expect(state.loadingSource).toBe('foo');
        expect(state.fetchingRoute).toBe(true);
    });

    test('viewingControls sets viewControls', () => {
        const state = dialogParamsReducer(initial, viewingControls(true));
        expect(state.viewControls).toBe(true);
    });

    test('forecastFetchBegun toggles fetchingForecast', () => {
        const state = dialogParamsReducer(initial, forecastFetchBegun());
        expect(state.fetchingForecast).toBe(true);
    });

    test('forecastFetchFailed records errorDetails via helper', () => {
        const state1 = dialogParamsReducer(initial, forecastFetchFailed('oops'));
        expect(state1.errorDetails).toBe('oops');
        const state2 = dialogParamsReducer(initial, forecastFetchFailed({ data: { details: 'd' } } as any));
        expect(state2.errorDetails).toBe('d');
        const state3 = dialogParamsReducer(initial, forecastFetchFailed({} as any));
        expect(state3.errorDetails).toBe('[object Object]');
    });

    test('forecastFetchCanceled resets flag', () => {
        const modified = { ...initial, fetchingForecast: true };
        const state = dialogParamsReducer(modified, forecastFetchCanceled());
        expect(state.fetchingForecast).toBe(false);
    });

    test('rwgpsRouteLoadingFailed and gpxRouteLoadingFailed set details and succeeded', () => {
        const rstate = dialogParamsReducer(initial, rwgpsRouteLoadingFailed('bad')); 
        expect(rstate.errorDetails).toBe('bad');
        expect(rstate.succeeded).toBe(false);
        const gstate = dialogParamsReducer(initial, gpxRouteLoadingFailed({ message: 'err' }));
        expect(gstate.errorDetails).toBe('err');
        expect(gstate.succeeded).toBe(false);
    });

    describe('errorDetailsSet branches', () => {
        test('string payload triggers sentry', () => {
            const state = dialogParamsReducer(initial, errorDetailsSet('msg'));
            expect(state.errorDetails).toBe('msg');
            expect(sentry.metrics.count).toHaveBeenCalled();
        });
        test('Error instance', () => {
            const err = new Error('e');
            const state = dialogParamsReducer(initial, errorDetailsSet(err));
            expect(state.errorDetails).toBe(err.toString());
            expect(sentry.metrics.count).toHaveBeenCalled();
        });
        test('object with data', () => {
            const obj = { data: { details: 'd' } };
            const state = dialogParamsReducer(initial, errorDetailsSet(obj as any));
            expect(state.errorDetails).toBe('d');
            expect(sentry.metrics.count).toHaveBeenCalled();
        });
        test('null payload', () => {
            const state = dialogParamsReducer(initial, errorDetailsSet(null));
            expect(state.errorDetails).toBeNull();
        });
    });

    test('errorMessageListSet replaces list and stops forecast flag', () => {
        const modified = { ...initial, fetchingForecast: true };
        const state = dialogParamsReducer(modified, errorMessageListSet(['a']));
        expect(state.errorMessageList).toEqual(['a']);
        expect(state.fetchingForecast).toBe(false);
    });

    test('errorMessageListAppend does not mutate due to bug', () => {
        const modified = { ...initial, errorMessageList: ['x'], fetchingForecast: true };
        const state = dialogParamsReducer(modified, errorMessageListAppend(['y']));
        expect(state.errorMessageList).toEqual(['x']);
        expect(state.fetchingForecast).toBe(false);
    });

    test('lastErrorCleared pops first element', () => {
        const modified = { ...initial, errorMessageList: ['a', 'b'] };
        const state = dialogParamsReducer(modified, lastErrorCleared());
        expect(state.errorMessageList).toEqual(['b']);
    });

    test('shortUrlSet updates', () => {
        const state = dialogParamsReducer(initial, shortUrlSet('u'));
        expect(state.shortUrl).toBe('u');
    });

    test('stravaErrorSet sets formatted message when non-empty', () => {
        const state = dialogParamsReducer(initial, stravaErrorSet('err'));
        expect(state.errorDetails).toContain('Error loading route from Strava: err');
    });

    describe('extra reducers', () => {
        test('pinnedRoutesSet clears errorDetails', () => {
            const modified = { ...initial, errorDetails: 'e' };
            const state = dialogParamsReducer(modified, pinnedRoutesSet([]));
            expect(state.errorDetails).toBeNull();
        });
        test('stravaFetched clears errorDetails', () => {
            const modified = { ...initial, errorDetails: 'e' };
            const state = dialogParamsReducer(modified, stravaFetched({activity: {} as any, stream: {} as any}));
            expect(state.errorDetails).toBeNull();
        });
        test('stravaFetchFailed sets formatted message', () => {
            const state = dialogParamsReducer(initial, stravaFetchFailed({message:'bleh'}));
            expect(state.errorDetails).toContain('Error loading activity from Strava:');
        });
        test('rwgpsRouteLoaded/gpxRouteLoaded stop fetching and clear errors', () => {
            const mod = { ...initial, fetchingRoute: true, errorDetails: 'e', succeeded: false };
            const rstate = dialogParamsReducer(mod, rwgpsRouteLoaded({} as any));
            expect(rstate.fetchingRoute).toBe(false);
            expect(rstate.errorDetails).toBeNull();
            expect(rstate.succeeded).toBe(true);
            const gstate = dialogParamsReducer(mod, gpxRouteLoaded({} as any));
            expect(gstate.fetchingRoute).toBe(false);
            expect(gstate.errorDetails).toBeNull();
            expect(gstate.succeeded).toBe(true);
        });
        test('forecast/forecastFetched clears fetchingForecast and errors', () => {
            const mod = { ...initial, fetchingForecast: true, errorDetails: 'e' };
            const state = dialogParamsReducer(mod, { type: 'forecast/forecastFetched' });
            expect(state.fetchingForecast).toBe(false);
            expect(state.errorDetails).toBeNull();
        });
        test('rwgpsRouteSetAsNumber and rwgpsRouteSet clear loadingSource', () => {
            const mod = { ...initial, loadingSource: 'x' };
            const s1 = dialogParamsReducer(mod, rwgpsRouteSetAsNumber(1));
            expect(s1.loadingSource).toBeNull();
            const s2 = dialogParamsReducer(mod, rwgpsRouteSet('1'));
            expect(s2.loadingSource).toBeNull();
        });
        test('forecastInvalidated resets shortUrl', () => {
            const mod = { ...initial, shortUrl: 'changed' };
            const state = dialogParamsReducer(mod, forecastInvalidated());
            expect(state.shortUrl).toBe(initial.shortUrl);
        });
    });
});
