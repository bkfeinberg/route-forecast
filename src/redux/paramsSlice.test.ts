import { paramsReducer, actionUrlAdded, apiKeysSet, querySet, queryCleared } from './paramsSlice';
import { reset } from './routeParamsSlice';

describe('paramsSlice reducer', () => {
    const initial = paramsReducer(undefined, { type: 'unknown' });

    test('initial state', () => {
        expect(initial).toEqual({
            action: '',
            maps_api_key: '',
            timezone_api_key: '',
            bitly_token: '',
            queryString: null,
            searchString: null
        });
    });

    test('actionUrlAdded sets action', () => {
        const state = paramsReducer(initial, actionUrlAdded('http://foo'));
        expect(state.action).toBe('http://foo');
    });

    test('apiKeysSet sets all keys', () => {
        const keys = { maps_api_key: 'm', timezone_api_key: 't', bitly_token: 'b' };
        const state = paramsReducer(initial, apiKeysSet(keys));
        expect(state.maps_api_key).toBe('m');
        expect(state.timezone_api_key).toBe('t');
        expect(state.bitly_token).toBe('b');
    });

    test('querySet stores url and search', () => {
        const state = paramsReducer(initial, querySet({ url: 'u', search: 's' }));
        expect(state.queryString).toBe('u');
        expect(state.searchString).toBe('s');
    });

    test('queryCleared clears queryString', () => {
        const modified = { ...initial, queryString: 'abc' };
        const state = paramsReducer(modified, queryCleared());
        expect(state.queryString).toBeNull();
    });

    test('reset clears query and search strings', () => {
        const modified = { ...initial, queryString: 'x', searchString: 'y' };
        const state = paramsReducer(modified, reset());
        expect(state.queryString).toBeNull();
        expect(state.searchString).toBeNull();
    });
});
