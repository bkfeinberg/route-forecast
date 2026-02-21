import { controlsReducer,
    metricSet,
    metricToggled,
    celsiusToggled,
    bankedDisplayToggled,
    controlAdded,
    controlRemoved,
    userControlsUpdated,
    clearOpenBusinesses,
    addOpenBusinesses,
    displayControlTableUiSet
} from './controlsSlice';
import { rwgpsRouteSet, reset as routeParamsReset } from './routeParamsSlice';

describe('controlsSlice reducer', () => {
    const initial = controlsReducer(undefined, { type: 'unknown' });

    test('initial state is correct', () => {
        expect(initial).toEqual({
            metric: false,
            celsius: false,
            displayBanked: false,
            userControlPoints: [],
            controlOpenStatus: [],
            displayControlTableUI: false
        });
    });

    test('metricSet only updates when payload defined', () => {
        const defined = controlsReducer(initial, metricSet(true));
        expect(defined.metric).toBe(true);
        const undefinedState = controlsReducer(initial, metricSet(undefined as any));
        expect(undefinedState.metric).toBe(initial.metric);
    });

    test('metricToggled flips metric', () => {
        const t1 = controlsReducer(initial, metricToggled());
        expect(t1.metric).toBe(true);
        const t2 = controlsReducer(t1, metricToggled());
        expect(t2.metric).toBe(false);
    });

    test('celsiusToggled and bankedDisplayToggled flip flags', () => {
        expect(controlsReducer(initial, celsiusToggled()).celsius).toBe(true);
        expect(controlsReducer(initial, bankedDisplayToggled()).displayBanked).toBe(true);
    });

    test('controlAdded pushes a blank control', () => {
        const state = controlsReducer(initial, controlAdded());
        expect(state.userControlPoints.length).toBe(1);
        expect(state.userControlPoints[0]).toMatchObject({ name: '', distance: 0, duration: 0 });
    });

    test('controlRemoved removes by index', () => {
        const pre = { ...initial, userControlPoints: [{ name: 'a', distance: 1, duration: 2 }, { name: 'b', distance: 3, duration: 4 }] } as any;
        const state = controlsReducer(pre, controlRemoved(0));
        expect(state.userControlPoints).toEqual([{ name: 'b', distance: 3, duration: 4 }]);
    });

    test('userControlsUpdated replaces array', () => {
        const arr = [{ name: 'x', distance: 5, duration: 6 }];
        const state = controlsReducer(initial, userControlsUpdated(arr));
        expect(state.userControlPoints).toBe(arr);
    });

    test('clearOpenBusinesses resets to initial', () => {
        const modified = { ...initial, controlOpenStatus: [{ isOpen: true, distance: 1, id: '1' }] } as any;
        const state = controlsReducer(modified, clearOpenBusinesses());
        expect(state.controlOpenStatus).toEqual(initial.controlOpenStatus);
    });

    test('addOpenBusinesses stores provided list', () => {
        const businesses = [{ isOpen: false, distance: 10, id: 'foo' }];
        const state = controlsReducer(initial, addOpenBusinesses(businesses));
        expect(state.controlOpenStatus).toBe(businesses);
    });

    test('displayControlTableUiSet sets boolean', () => {
        const state = controlsReducer(initial, displayControlTableUiSet(true));
        expect(state.displayControlTableUI).toBe(true);
    });

    describe('extra reducers', () => {
        test('rwgpsRouteSet clears userControlPoints', () => {
            const modified = { ...initial, userControlPoints: [{ name: 'x', distance: 0, duration: 0 }] } as any;
            const state = controlsReducer(modified, rwgpsRouteSet('123'));
            expect(state.userControlPoints).toEqual([]);
        });

        test('routeParams/reset returns to initial state', () => {
            const modified = { ...initial, metric: true, userControlPoints: [{ name: 'a', distance: 1, duration: 1 }] } as any;
            const state = controlsReducer(modified, routeParamsReset());
            expect(state).toEqual(initial);
        });
    });
});
