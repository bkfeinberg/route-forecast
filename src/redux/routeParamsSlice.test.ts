import { routeParamsReducer,
    stopAfterLoadSet,
    rwgpsRouteSetAsNumber,
    rwgpsRouteSet,
    rusaPermRouteIdSet,
    startTimeSet,
    initialStartTimeSet,
    startTimestampSet,
    timeZoneSet,
    paceSet,
    intervalSet,
    segmentSet,
    routeIsTripSet,
    routeLoadingModeSet,
    reset
} from './routeParamsSlice';
import { weatherProviderSet } from './forecastSlice';
import { providerValues } from './providerValues';
import { routeLoadingModes } from '../data/enums';
import { rwgpsRouteLoaded, gpxRouteLoaded } from './routeInfoSlice';
import { usePinnedRoutesSet } from './rideWithGpsSlice';

// we'll need luxon for constructing dates
import { DateTime } from 'luxon';

describe('routeParamsSlice reducer', () => {
    let initialState: any;

    beforeEach(() => {
        initialState = routeParamsReducer(undefined, { type: 'unknown' });
    });

    test('should return initial state for unknown action', () => {
        expect(initialState).toMatchObject({
            interval: expect.any(Number),
            min_interval: expect.any(Number),
            canForecastPast: expect.any(Boolean),
            pace: expect.any(String),
            rwgpsRoute: '',
            rwgpsRouteIsTrip: false,
            startTimestamp: expect.any(Number),
            zone: expect.any(String),
            routeLoadingMode: expect.any(Number),
            maxDaysInFuture: expect.any(Number),
            stopAfterLoad: false,
            rusaPermRouteId: '',
            succeeded: null,
            segment: [0, 0]
        });
    });

    test('stopAfterLoadSet toggles flag', () => {
        const on = routeParamsReducer(initialState, stopAfterLoadSet(true));
        expect(on.stopAfterLoad).toBe(true);
        const off = routeParamsReducer(on, stopAfterLoadSet(false));
        expect(off.stopAfterLoad).toBe(false);
    });

    test('rwgpsRouteSetAsNumber sets string and resets fields', () => {
        const state = routeParamsReducer(initialState, rwgpsRouteSetAsNumber(123));
        expect(state.rwgpsRoute).toBe('123');
        expect(state.succeeded).toBeNull();
        expect(state.segment).toEqual(initialState.segment);
    });

    test('rwgpsRouteSet handles string and empty payload', () => {
        const state1 = routeParamsReducer(initialState, rwgpsRouteSet(' 0456 '));
        // getRouteNumberFromValue does not trim whitespace, so value carries spaces
        expect(state1.rwgpsRoute).toBe(' 0456 ');
        expect(state1.succeeded).toBeNull();
        expect(state1.segment).toEqual(initialState.segment);

        const state2 = routeParamsReducer(state1, rwgpsRouteSet(''));
        expect(state2.rwgpsRoute).toBe(initialState.rwgpsRoute);
        expect(state2.rwgpsRouteIsTrip).toBe(initialState.rwgpsRouteIsTrip);
    });

    test('rusaPermRouteIdSet changes id and mode', () => {
        const state = routeParamsReducer(initialState, rusaPermRouteIdSet('perm123'));
        expect(state.rusaPermRouteId).toBe('perm123');
        expect(state.routeLoadingMode).toBe(routeLoadingModes.RUSA_PERM);
        expect(state.rwgpsRouteIsTrip).toBe(initialState.rwgpsRouteIsTrip);
    });

    test('timeZoneSet updates zone', () => {
        const state = routeParamsReducer(initialState, timeZoneSet('Europe/London'));
        expect(state.zone).toBe('Europe/London');
    });

    test('paceSet updates pace and resets stopAfterLoad', () => {
        const modified = { ...initialState, stopAfterLoad: true };
        const state = routeParamsReducer(modified, paceSet('M'));
        expect(state.pace).toBe('M');
        expect(state.stopAfterLoad).toBe(false);
    });

    test('intervalSet enforces bounds and resets segment', () => {
        const good = routeParamsReducer(initialState, intervalSet(1.5));
        expect(good.interval).toBe(1.5);
        expect(good.segment).toEqual(initialState.segment);

        const bad = routeParamsReducer(initialState, intervalSet(0.1));
        expect(bad.interval).toBe(initialState.interval);

        const garbage = routeParamsReducer(initialState, intervalSet('not-a-number' as any));
        expect(garbage.interval).toBe(initialState.interval);
    });

    test('segmentSet and routeIsTripSet update values', () => {
        const s = routeParamsReducer(initialState, segmentSet([10, 20]));
        expect(s.segment).toEqual([10, 20]);
        const r = routeParamsReducer(initialState, routeIsTripSet(true));
        expect(r.rwgpsRouteIsTrip).toBe(true);
    });

    test('routeLoadingModeSet only accepts valid modes', () => {
        const valid = routeParamsReducer(initialState, routeLoadingModeSet(routeLoadingModes.STRAVA));
        expect(valid.routeLoadingMode).toBe(routeLoadingModes.STRAVA);
        const invalid = routeParamsReducer(initialState, routeLoadingModeSet(999));
        expect(invalid.routeLoadingMode).toBe(initialState.routeLoadingMode);
    });

    test('reset brings state back to initial values', () => {
        const modified = routeParamsReducer(initialState, stopAfterLoadSet(true));
        expect(modified.stopAfterLoad).toBe(true);
        const resetState = routeParamsReducer(modified, reset());
        expect(resetState).toEqual(initialState);
    });

    describe('extra reducer behavior', () => {
        test('weatherProviderSet adjusts provider-dependent fields', () => {
            const provider = Object.keys(providerValues)[0];
            const state = routeParamsReducer(initialState, weatherProviderSet(provider));
            expect(state.min_interval).toBe(providerValues[provider].min_interval);
            expect(state.maxDaysInFuture).toBe(providerValues[provider].max_days);
            expect(state.canForecastPast).toBe(providerValues[provider].canForecastPast);
        });

        test('rwgpsRouteLoaded and gpxRouteLoaded update segment', () => {
            const rwState = routeParamsReducer(initialState,
                rwgpsRouteLoaded({
                    type: 'route',
                    route: { distance: 123, country_code: '', name: '', track_points: [], course_points: [], points_of_interest: [], id: 1 }
                } as any)
            );
            expect(rwState.segment[1]).toBe(123);

            const gpxState = routeParamsReducer(initialState,
                gpxRouteLoaded({ name: '', tracks: [{ distance: { total: 5 }, points: [], name: '', link: '' }], type: 'gpx' })
            );
            expect(gpxState.segment[1]).toBe(5000);
        });

        test('routeInfo/routeDataCleared resets segment', () => {
            const changed = { ...initialState, segment: [0, 999] };
            const state = routeParamsReducer(changed, { type: 'routeInfo/routeDataCleared' });
            expect(state.segment).toEqual(initialState.segment);
        });

        test('stravaRouteSet clears rwgpsRoute when payload nonempty', () => {
            const modified = routeParamsReducer({ ...initialState, rwgpsRoute: '1234' }, { type: 'strava/stravaRouteSet', payload: 'foo' });
            expect(modified.rwgpsRoute).toBe(initialState.rwgpsRoute);
        });

        test('usePinnedRoutesSet false resets rwgpsRouteIsTrip', () => {
            const modified = routeParamsReducer({ ...initialState, rwgpsRouteIsTrip: true }, usePinnedRoutesSet(false));
            expect(modified.rwgpsRouteIsTrip).toBe(initialState.rwgpsRouteIsTrip);
        });
    });
});
