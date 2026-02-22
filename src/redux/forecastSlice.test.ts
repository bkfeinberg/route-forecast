import { forecastReducer,
    forecastFetched,
    forecastAppended,
    forecastInvalidated,
    weatherRangeSet,
    weatherRangeToggled,
    tableViewedSet,
    mapViewedSet,
    weatherProviderSet,
    zoomToRangeSet,
    zoomToRangeToggled,
    fetchAqiSet,
    fetchAqiToggled,
    ForecastInfo
} from './forecastSlice';
import { rwgpsRouteSet, reset as routeParamsReset } from './routeParamsSlice';
import { gpxRouteLoaded } from './routeInfoSlice';
import { gpxRouteLoadingFailed } from './dialogParamsSlice';

describe('forecastSlice reducer', () => {
    const initial = forecastReducer(undefined, { type: 'unknown' });

    test('initial state matches specification', () => {
        expect(initial).toMatchObject({
            forecast: [],
            timeZoneId: null,
            valid: false,
            range: [],
            tableViewed: false,
            mapViewed: false,
            weatherProvider: expect.any(String),
            zoomToRange: true,
            fetchAqi: false
        });
    });

    test('forecastFetched populates and resets flags', () => {
        const payload = { timeZoneId: 'tz', forecastInfo: { forecast: [{ temp:'0', feel:0, humidity:0, zone:'', distance:0, cloudCover:0, windSpeed:'', gust:'', relBearing:0, windBearing:0, time:'', isControl:false, precip:'', lat:0, lon:0, rainy:false, aqi:0 }] } };
        const state = forecastReducer(initial, forecastFetched(payload));
        expect(state.forecast).toEqual(payload.forecastInfo.forecast);
        expect(state.timeZoneId).toBe('tz');
        expect(state.valid).toBe(true);
        expect(state.tableViewed).toBe(false);
        expect(state.mapViewed).toBe(false);
        expect(state.range).toEqual([]);
    });

    test('forecastAppended adds element', () => {
        const item = { temp:'x', feel:0, humidity:0, zone:'', distance:0, cloudCover:0, windSpeed:'', gust:'', relBearing:0, windBearing:0, time:'', isControl:false, precip:'', lat:0, lon:0, rainy:false } as any;
        const state = forecastReducer({ ...initial, forecast: [item] }, forecastAppended(item));
        expect(state.forecast.length).toBe(2);
    });

    test('forecastInvalidated clears when valid or not', () => {
        const v = forecastReducer({ ...initial, valid: true, forecast: [{temp:'a'} as any], timeZoneId:'tz' }, forecastInvalidated());
        expect(v.valid).toBe(false);
        expect(v.forecast).toEqual([]);
        expect(v.timeZoneId).toBeNull();
        const nv = forecastReducer(v, forecastInvalidated());
        expect(nv.valid).toBe(false);
    });

    test('weatherRangeSet and toggled', () => {
        const s = forecastReducer(initial, weatherRangeSet({ start: '1', finish: '2' }));
        expect(s.range).toEqual([1,2]);
        const t = forecastReducer(s, weatherRangeToggled({ start: '1', finish: '2' }));
        expect(t.range).toEqual([]);
        const t2 = forecastReducer(t, weatherRangeToggled({ start: '3', finish: '4' }));
        expect(t2.range).toEqual([3,4]);
    });

    test('tableViewedSet and mapViewedSet flip flags', () => {
        expect(forecastReducer(initial, tableViewedSet()).tableViewed).toBe(true);
        expect(forecastReducer(initial, mapViewedSet()).mapViewed).toBe(true);
    });

    test('weatherProviderSet sets provider', () => {
        const state = forecastReducer(initial, weatherProviderSet('p'));
        expect(state.weatherProvider).toBe('p');
    });

    test('zoomToRangeSet and toggled', () => {
        const s = forecastReducer(initial, zoomToRangeSet(false));
        expect(s.zoomToRange).toBe(false);
        expect(forecastReducer(s, zoomToRangeToggled()).zoomToRange).toBe(true);
    });

    test('fetchAqiSet and toggled', () => {
        const s = forecastReducer(initial, fetchAqiSet(true));
        expect(s.fetchAqi).toBe(true);
        expect(forecastReducer(s, fetchAqiToggled()).fetchAqi).toBe(false);
    });

    describe('extra reducers', () => {
        test('rwgpsRouteSet resets many fields', () => {
            const modified : ForecastInfo = { ...initial, valid: true, tableViewed: true, mapViewed: true, range: [1,1], forecast: [{temp:'a'} as any] };
            const state = forecastReducer(modified, rwgpsRouteSet('123'));
            expect(state.valid).toBe(false);
            expect(state.tableViewed).toBe(false);
            expect(state.mapViewed).toBe(false);
            expect(state.range).toEqual([]);
            expect(state.forecast).toEqual([]);
        });
        test('gpxRouteLoaded invalidates valid', () => {
            const mod = { ...initial, valid: true };
            const state = forecastReducer(mod, gpxRouteLoaded({} as any));
            expect(state.valid).toBe(false);
        });
        test('gpxRouteLoadingFailed invalidates valid', () => {
            const mod = { ...initial, valid: true };
            const state = forecastReducer(mod, gpxRouteLoadingFailed('no valid route'));
            expect(state.valid).toBe(false);
        });
        test('routeParams/reset returns to initial state', () => {
            const modified = { ...initial, weatherProvider: 'foo', valid: true };
            const state = forecastReducer(modified, routeParamsReset());
            expect(state).toEqual(initial);
        });
    });
});
