import { getMapBounds, cvtDistance } from './mapUtils';

// Simple mock for google.maps.LatLngBounds used by getMapBounds
class MockLatLngBounds {
  public north: number | null = null;
  public south: number | null = null;
  public east: number | null = null;
  public west: number | null = null;
  private count = 0;
  extend(point: any) {
    const lat = point.lat;
    const lng = point.lng;
    if (this.count === 0) {
      this.north = lat; this.south = lat; this.east = lng; this.west = lng;
    } else {
      this.north = Math.max(this.north!, lat);
      this.south = Math.min(this.south!, lat);
      this.east = Math.max(this.east!, lng);
      this.west = Math.min(this.west!, lng);
    }
    this.count++;
  }
  isEmpty() {
    return this.count === 0;
  }
}

describe('mapUtils.getMapBounds & cvtDistance', () => {
  const originalGoogle = (global as any).google;

  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).google = { maps: { LatLngBounds: MockLatLngBounds } };
  });

  afterEach(() => {
    (global as any).google = originalGoogle;
  });

  test('returns default bounds when preferDefault and subrange invalid', () => {
    const bounds = { min_latitude: 1, min_longitude: 2, max_latitude: 3, max_longitude: 4 };
    const res = getMapBounds([], bounds, true, [], [1,1]); // preferDefault true and subrange not length 2
    expect(res).toEqual({ north: 3, south: 1, east: 4, west: 2 });
  });

  test('returns userBounds when not zoomToRange', () => {
    const bounds = { min_latitude: 0, min_longitude: 0, max_latitude: 10, max_longitude: 10 };
    const points = [ { lat: 1, lng: 2, dist: 0 }, { lat: 3, lng: 4, dist: 0 } ];
    const res: any = getMapBounds(points, bounds, false, [], [0,1]);
    expect(res.north).toBe(3);
    expect(res.south).toBe(1);
    expect(res.east).toBe(4);
    expect(res.west).toBe(2);
  });

  test('when zoomToRange and segmentBounds empty returns userBounds (preferDefault false)', () => {
    const bounds = { min_latitude: 0, min_longitude: 0, max_latitude: 10, max_longitude: 10 };
    const points = [ { lat: 1, lng: 2, dist: 100 } ];
    // subrange filters out point (range [0,0])
    const res: any = getMapBounds(points, bounds, true, [0,0], [0,1]);
    // userBounds is empty because the userSubrange filter removed the point; expect returned bounds to be empty LatLngBounds
    expect(res.isEmpty()).toBe(true);
  });

  test('when zoomToRange and segmentBounds non-empty returns segmentBounds', () => {
    const bounds = { min_latitude: 0, min_longitude: 0, max_latitude: 10, max_longitude: 10 };
    const points = [ { lat: 1, lng: 2, dist: 5 }, { lat: 6, lng: 7, dist: 5 } ];
    const res: any = getMapBounds(points, bounds, true, [0,10], [0,1]);
    expect(res.north).toBe(6);
    expect(res.south).toBe(1);
    expect(res.east).toBe(7);
    expect(res.west).toBe(2);
  });

  test('preferDefault true with zoomToRange true and empty segmentBounds returns defaultBounds', () => {
    const bounds = { min_latitude: 0, min_longitude: 0, max_latitude: 10, max_longitude: 10 };
    const points = [ { lat: 1, lng: 2, dist: 100 } ];
    // userSubrange has identical start and end -> preferDefault true
    const res: any = getMapBounds(points, bounds, true, [0,0], [5,5]);
    expect(res).toEqual({ north: 10, south: 0, east: 10, west: 0 });
  });

  test('preferDefault true with zoomToRange false returns defaultBounds even if userBounds non-empty', () => {
    const bounds = { min_latitude: 0, min_longitude: 0, max_latitude: 10, max_longitude: 10 };
    const points = [ { lat: 2, lng: 3, dist: 50 } ];
    const res: any = getMapBounds(points, bounds, false, [0,0], [5,5]);
    expect(res).toEqual({ north: 10, south: 0, east: 10, west: 0 });
  });

  test('matchesSegment includes points with undefined dist when computing segmentBounds', () => {
    const bounds = { min_latitude: 0, min_longitude: 0, max_latitude: 20, max_longitude: 20 };
    const points = [ { lat: 4, lng: 5, dist: undefined }, { lat: 15, lng: 16, dist: 100 } ];
    // subrange filters out second point but the undefined-dist point should be included
    const res: any = getMapBounds(points, bounds, true, [0,10], [0,1]);
    expect(res.north).toBe(4);
    expect(res.south).toBe(4);
  });

  test('cvtDistance returns original when metric=false and converted string when metric=true', () => {
    expect(cvtDistance('5', false)).toBe('5');
    // using standard milesToMeters (1609.34) this should round: 5 * 1609.34 / 1000 = 8.0467 -> toFixed(0) => '8'
    expect(cvtDistance('5', true)).toBe('8');
  });

  test('cvtDistance handles fractional strings by parseInt behavior', () => {
    expect(cvtDistance('5.9', true)).toBe('8'); // parseInt('5.9') == 5
  });
});
