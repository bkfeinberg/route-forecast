import * as Sentry from '@sentry/react';

jest.mock('../jsx/app/updateHistory', () => ({ updateHistory: jest.fn() }));

import { updateHistory } from '../jsx/app/updateHistory';
import { generateUrl } from './queryStringUtils';
import type { UserControl } from '../redux/controlsSlice';

describe('queryStringUtils', () => {
  const controls: UserControl[] = [
    { name: 'Control 1', distance: 1.1, duration: 2 },
    { name: 'Big, control', distance: 2, duration: 3 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generateUrl builds a query URL for a normal rwgps route', () => {
    const timestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
    const result = generateUrl(
      timestamp,
      '12345',
      'T',
      10,
      true,
      false,
      controls,
      '',
      '',
      'testProvider',
      'https://example.com',
      false,
      'America/New_York',
      '',
      'My Route'
    );

    expect(result.url).toContain('https://example.com/?');
    expect(result.search).toContain('rwgpsRoute=12345');
    expect(result.search).toContain('name=My+Route');
    expect(result.search).toContain('startTimestamp=1672531200');
    expect(result.search).toContain('zone=America%2FNew_York');
    expect(result.search).toContain('strava_route=');
    expect(updateHistory).not.toHaveBeenCalled();
  });

  test('generateUrl clears route number when a strava route is provided and calls updateHistory when requested', () => {
    const result = generateUrl(
      1672531200000,
      '12345',
      'R',
      5,
      false,
      true,
      controls,
      'activity',
      'route123',
      'testProvider',
      'https://example.com',
      true,
      'UTC',
      'rusa-1',
      'Strava Route'
    );

    expect(result.search).toContain('strava_route=route123');
    expect(result.search).toContain('rwgpsRoute=');
    expect(result.search).not.toContain('rwgpsRoute=12345');
    expect(updateHistory).toHaveBeenCalledWith(result.url, result.search);
  });

  test('generateUrl warns and omits startTimestamp and zone for an invalid date', () => {
    const warnSpy = jest.spyOn(Sentry.logger, 'warn').mockImplementation(() => {});

    const result = generateUrl(
      NaN,
      '12345',
      'Q',
      8,
      false,
      false,
      controls,
      '',
      '',
      'testProvider',
      'https://example.com',
      false,
      'UTC',
      '',
      'Invalid Route'
    );

    expect(warnSpy).toHaveBeenCalledWith('Invalid start date NaN for route Invalid Route');
    expect(result.search).not.toContain('startTimestamp=');
    expect(result.search).not.toContain('zone=');
  });

  test('generateUrl trims controls and drops route name when the URL exceeds the maximum length', () => {
    const longControls: UserControl[] = Array.from({ length: 300 }, (_, index) => ({
      name: `Control-${index},Extra`,
      distance: index + 1,
      duration: 1,
    }));

    const result = generateUrl(
      1672531200000,
      '12345',
      'S',
      12,
      true,
      true,
      longControls,
      '',
      '',
      'testProvider',
      'https://example.com',
      false,
      'UTC',
      '',
      'A very long route name that will be removed when control truncation is required'
    );

    expect(result.search).not.toContain('A+very+long+route');
    expect(result.search).not.toContain('Control-');
    expect(result.search).toContain('controlPoints=');
  });
});
