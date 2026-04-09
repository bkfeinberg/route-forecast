// src/jsx/Map/RouteForecastMap.test.tsx
import { findMarkerInfo } from './mapUtils';
import { milesToMeters } from '../../utils/util';


describe('findMarkerInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty array for null, undefined or empty forecast', () => {
    expect(findMarkerInfo(null as any, [0, 100])).toEqual([]);
    expect(findMarkerInfo(undefined as any, [0, 100])).toEqual([]);
    expect(findMarkerInfo([], [0, 100])).toEqual([]);
  });

  test('returns empty array for invalid subrange inputs', () => {
    const sample = [{ distance: 5 }];
    expect(findMarkerInfo(sample as any, null as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, undefined as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, [] as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, [100] as any)).toEqual([]);
    expect(findMarkerInfo(sample as any, [1,2,3] as any)).toEqual([]);
  });

  test('filters out points with non-number distance', () => {
    const forecast = [
      { distance: 5 },
      { distance: 'nope' },
      { distance: null },
      { distance: 10 }
    ] as any;
    const res = findMarkerInfo(forecast, [0, 100000]);
    expect(res.length).toBe(2);
    expect(res.map((p:any) => p.distance)).toEqual([5,10]);
  });

  test('includes points at subrange boundaries (start and end)', () => {
    const a = { distance: 3 } as any;
    const b = { distance: 7 } as any;
    const start = Math.round(a.distance * (milesToMeters as number));
    const end = Math.round(b.distance * (milesToMeters as number));
    const resStart = findMarkerInfo([a], [start, start]);
    expect(resStart.length).toBe(1);
    expect(resStart[0].distance).toBe(3);
    const resEnd = findMarkerInfo([b], [end, end]);
    expect(resEnd.length).toBe(1);
    expect(resEnd[0].distance).toBe(7);
  });

  test('includes points whose distance in meters falls inside subrange', () => {
    const forecast = [
      { distance: 2 },
      { distance: 4 },
      { distance: 6 }
    ] as any;
    const subrange: [number, number] = [
      Math.round(3 * (milesToMeters as number)),
      Math.round(5 * (milesToMeters as number))
    ];
    const res = findMarkerInfo(forecast, subrange);
    expect(res.length).toBe(1);
    expect(res[0].distance).toBe(4);
  });

  test('excludes points below and above subrange', () => {
    const below = { distance: 1 } as any;
    const above = { distance: 20 } as any;
    const subrange: [number, number] = [
      Math.round(3 * (milesToMeters as number)),
      Math.round(10 * (milesToMeters as number))
    ];
    const res = findMarkerInfo([below, above], subrange);
    expect(res.length).toBe(0);
  });

  test('handles floating point and zero distances correctly', () => {
    const forecast = [
      { distance: 0 },
      { distance: 3.5 },
      { distance: 7.8 }
    ] as any;
    const subrange: [number, number] = [
      Math.round(0 * (milesToMeters as number)),
      Math.round(8 * (milesToMeters as number))
    ];
    const res = findMarkerInfo(forecast, subrange);
    expect(res.length).toBe(3);
    expect(res[0].distance).toBe(0);
    expect(res[1].distance).toBe(3.5);
    expect(res[2].distance).toBe(7.8);
  });

  test('preserves order and properties of matched points', () => {
    const forecast = [
      { distance: 7, lat: 1, lon: 1, temp: 70 },
      { distance: 3, lat: 2, lon: 2, temp: 72 },
      { distance: 5, lat: 3, lon: 3, temp: 68 }
    ] as any;
    const res = findMarkerInfo(forecast, [0, 1000000]);
    expect(res.length).toBe(3);
    expect(res[0].distance).toBe(7);
    expect(res[0].lat).toBe(1);
    expect(res[1].distance).toBe(3);
    expect(res[2].distance).toBe(5);
  });

  test('handles very large distance values', () => {
    const forecast = [
      { distance: 1000 },
      { distance: 5000 }
    ] as any;
    const subrange: [number, number] = [
      Math.round(500 * (milesToMeters as number)),
      Math.round(6000 * (milesToMeters as number))
    ];
    const res = findMarkerInfo(forecast, subrange);
    expect(res.length).toBe(2);
  });
});