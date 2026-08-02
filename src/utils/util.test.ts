import { DateTime } from 'luxon';
import type { UserControl } from '../redux/controlsSlice';
import type { Point } from './gpxParser';
import type { Bounds } from './util';
import {
    controlsMeaningfullyDifferent,
    formatControlsForUrl,
    getRouteNumberFromValue,
    inputPaceToSpeed,
    metricPaceToSpeed,
    milesToMeters,
    parseControls,
    paceToSpeed,
    preflightDaysOfForecast,
    setMinMaxCoords,
    stringIsOnlyDecimal,
    stringIsOnlyNumeric,
} from './util';

describe('util', () => {
    test('formatControlsForUrl filters invalid points and encodes names', () => {
        const controls = [
            { name: 'Start:Line', distance: 1, duration: 2 } as UserControl,
            { name: '', distance: 3, duration: 4 } as UserControl,
            { name: 'Stop', distance: Number.NaN, duration: 5 } as UserControl,
            { name: 'Finish', distance: 6, duration: 7 } as UserControl,
        ];

        expect(formatControlsForUrl(controls, true)).toBe(':Start$Line,1,2:Finish,6,7');
    });

    test('parseControls decodes encoded names and skips invalid entries', () => {
        const parsed = parseControls('Start$Line,10,20::Finish~Name,30,40:bad,NaN,50', true);

        expect(parsed).toEqual([
            { name: 'Start:Line', distance: 10, duration: 20, id: 0 },
            { name: 'Finish,Name', distance: 30, duration: 40, id: 1 },
        ]);
    });

    test('setMinMaxCoords updates bounds for each point', () => {
        const point = { lat: 12.5, lon: -3.5 } as Point;
        const bounds: Bounds = {
            min_latitude: 20,
            min_longitude: -10,
            max_latitude: 30,
            max_longitude: 10,
        };

        expect(setMinMaxCoords(point, bounds)).toEqual({
            min_latitude: 12.5,
            min_longitude: -10,
            max_latitude: 30,
            max_longitude: 10,
        });
    });

    test('controlsMeaningfullyDifferent detects length and value changes', () => {
        const controls1 = [
            { name: 'A', distance: 1, duration: 2 } as UserControl,
            { name: 'B', distance: 3, duration: 4 } as UserControl,
        ];
        const controls2 = [
            { name: 'A', distance: 1, duration: 2 } as UserControl,
            { name: 'B', distance: 3, duration: 4 } as UserControl,
        ];
        const controls3 = [
            { name: 'A', distance: 1, duration: 2 } as UserControl,
        ];
        const controls4 = [
            { name: 'A', distance: 1, duration: 5 } as UserControl,
            { name: 'B', distance: 3, duration: 4 } as UserControl,
        ];

        expect(controlsMeaningfullyDifferent(controls1, controls2)).toBe(false);
        expect(controlsMeaningfullyDifferent(controls1, controls3)).toBe(true);
        expect(controlsMeaningfullyDifferent(controls1, controls4)).toBe(true);
    });

    test('string helpers only accept numeric or decimal strings', () => {
        expect(stringIsOnlyNumeric('12345')).toBe(true);
        expect(stringIsOnlyNumeric('12a5')).toBe(false);
        expect(stringIsOnlyDecimal('12.34')).toBe(true);
        expect(stringIsOnlyDecimal('1.2.3')).toBe(false);
    });

    test('getRouteNumberFromValue strips slashes and trailing question marks', () => {
        expect(getRouteNumberFromValue('https://example.com/routes/123?foo=bar')).toBe('123');
        expect(getRouteNumberFromValue('/routes/456')).toBe('456');
        expect(getRouteNumberFromValue('plain-route')).toBe('plain-route');
        expect(getRouteNumberFromValue('')).toBe('');
        expect(getRouteNumberFromValue(null as unknown as string)).toBeNull();
    });

    test('pace and distance constants expose expected values', () => {
        expect(milesToMeters).toBe(1609.34);
        expect(paceToSpeed.Q).toBe(3);
        expect(inputPaceToSpeed['C+']).toBe(15);
        expect(metricPaceToSpeed['F+']).toBe(34);
    });

    test('preflightDaysOfForecast flags dates outside provider limits', () => {
        expect(preflightDaysOfForecast('nws', DateTime.now().plus({ days: 8 }))).toBe(true);
        expect(preflightDaysOfForecast('nws', DateTime.now())).toBe(false);
        expect(preflightDaysOfForecast('nws', DateTime.now().minus({ days: 1 }))).toBe(true);
    });
});
