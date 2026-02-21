import { newton, getPowerOrVelocity } from './windUtils';

describe('windUtils', () => {
    test('newton returns 0 if it cannot converge on zero power case', () => {
        // with zero power the formula should either immediately hit tolerance or return 0.0
        const v = newton(0.5, 0, 0, 0.95, 0);
        expect(v).toBe(0);
    });

    test('getPowerOrVelocity computes a positive mph value when given a power', () => {
        const mph = getPowerOrVelocity(0, 0, 0, 0, 100, 0);
        expect(typeof mph).toBe('number');
        expect(mph).toBeGreaterThan(0);
    });

    test('getPowerOrVelocity round-trip between power and speed remains consistent', () => {
        const power = 200;
        const speed = getPowerOrVelocity(0, 0, 0, 0, power, 0);
        expect(speed).toBeGreaterThan(0);
        const recovered = getPowerOrVelocity(0, 0, 0, 0, undefined, speed);
        // allow some tolerance due to rounding and solver imprecision
        expect(recovered).toBeCloseTo(power, 0); // within 1 watt
    });

    test('getPowerOrVelocity returns nonzero power for reasonable speed', () => {
        const p = getPowerOrVelocity(0, 0, 0, 0, undefined, 10); // 10 mph
        expect(p).toBeGreaterThan(0);
    });
});
