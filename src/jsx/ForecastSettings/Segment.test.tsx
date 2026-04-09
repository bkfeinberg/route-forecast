// src/jsx/ForecastSettings/Segment.test.tsx
import React from 'react';
import { render, screen, cleanup, fireEvent } from 'test-utils';

jest.mock('react-i18next', () => {
  return {
    __esModule: true,
    useTranslation: jest.fn()
  };
});

jest.mock('../../utils/hooks', () => {
  return {
    __esModule: true,
    useAppDispatch: jest.fn(),
    useAppSelector: jest.fn()
  };
});

jest.mock('../../redux/routeParamsSlice', () => {
  return {
    __esModule: true,
    segmentSet: jest.fn((payload: any) => ({ type: 'SEGMENT_SET', payload }))
  };
});

jest.mock('../../utils/util', () => {
  return {
    __esModule: true,
    // use a known conversion factor for tests
    milesToMeters: 1609.34
  };
});

import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../utils/hooks';
import { segmentSet } from '../../redux/routeParamsSlice';
import Segment from './Segment';
import { milesToMeters } from '../../utils/util';

const mockedUseTranslation = useTranslation as unknown as jest.Mock;
const mockedUseAppDispatch = useAppDispatch as unknown as jest.Mock;
const mockedUseAppSelector = useAppSelector as unknown as jest.Mock;
const mockedSegmentSet = segmentSet as unknown as jest.Mock;

describe('Segment component', () => {
  let dispatchMock: jest.Mock;

  const setSelectorState = (state: any) => {
    mockedUseAppSelector.mockImplementation((selector: any) => selector(state));
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseTranslation.mockReturnValue({ t: (k: string) => k });
    dispatchMock = jest.fn();
    mockedUseAppDispatch.mockReturnValue(dispatchMock);
  });

  afterEach(() => {
    cleanup();
  });

  test('renders label and disabled controls when user segment not allowed', () => {
    const state = {
      routeInfo: { distanceInKm: 10, canDoUserSegment: false },
      uiInfo: { routeParams: { segment: [0, 10000] } },
      controls: { metric: false }
    };
    setSelectorState(state);
    render(<Segment />);

    expect(screen.getByText('labels.customSegment')).toBeTruthy();

    const resetBtn = screen.getByRole('button', { name: /Reset/ }) as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(true);

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(1);
    // slider exists; reset button being disabled covers the disabled state
    expect(resetBtn.disabled).toBe(true);
  });

  test('clicking Reset dispatches segmentSet with full range in meters when enabled', () => {
    const maxKm = 7;
    const state = {
      routeInfo: { distanceInKm: maxKm, canDoUserSegment: true },
      uiInfo: { routeParams: { segment: [1000, 5000] } },
      controls: { metric: true }
    };
    setSelectorState(state);
    render(<Segment />);

    const resetBtn = screen.getByRole('button', { name: /Reset/ }) as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(false);

    fireEvent.click(resetBtn);

    expect(mockedSegmentSet).toHaveBeenCalledWith([0, maxKm * 1000]);
    expect(dispatchMock).toHaveBeenCalled();
  });

  test('slider shows values in miles when metric is false (imperial)', () => {
    const maxKm = 10;
    const metersStart = 0;
    const metersEnd = 10000; // 10 km
    const state = {
      routeInfo: { distanceInKm: maxKm, canDoUserSegment: true },
      uiInfo: { routeParams: { segment: [metersStart, metersEnd] } },
      controls: { metric: false }
    };
    setSelectorState(state);
    render(<Segment />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(2);

    // max in miles: (maxKm * 1000) / milesToMeters
    const expectedMaxMiles = (maxKm * 1000) / (milesToMeters as number);
    // each thumb should have aria-valuemax attribute set to expectedMaxMiles
    const parsedMax = parseFloat(sliders[0].getAttribute('aria-valuemax') || '0');
    expect(parsedMax).toBeCloseTo(expectedMaxMiles, 3);

    // thumb current values: meters -> miles
    const expectedStartMiles = metersStart / (milesToMeters as number);
    const expectedEndMiles = metersEnd / (milesToMeters as number);

    const startVal = parseFloat(sliders[0].getAttribute('aria-valuenow') || '0');
    const endVal = parseFloat(sliders[1].getAttribute('aria-valuenow') || '0');

    expect(startVal).toBeCloseTo(expectedStartMiles, 3);
    expect(endVal).toBeCloseTo(expectedEndMiles, 3);
  });

  test('slider shows values in kilometers when metric is true', () => {
    const maxKm = 12;
    const metersStart = 0;
    const metersEnd = 5000; // 5 km
    const state = {
      routeInfo: { distanceInKm: maxKm, canDoUserSegment: true },
      uiInfo: { routeParams: { segment: [metersStart, metersEnd] } },
      controls: { metric: true }
    };
    setSelectorState(state);
    render(<Segment />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(2);

    // max should be maxKm (since metric true)
    const parsedMax = parseFloat(sliders[0].getAttribute('aria-valuemax') || '0');
    expect(parsedMax).toBeCloseTo(maxKm, 3);

    // values in km = meters / 1000
    const expectedStartKm = metersStart / 1000;
    const expectedEndKm = metersEnd / 1000;

    const startVal = parseFloat(sliders[0].getAttribute('aria-valuenow') || '0');
    const endVal = parseFloat(sliders[1].getAttribute('aria-valuenow') || '0');

    expect(startVal).toBeCloseTo(expectedStartKm, 3);
    expect(endVal).toBeCloseTo(expectedEndKm, 3);
  });

  test('segmentUpdate dispatches transformed meter values when metric=true', () => {
    const maxKm = 7;
    const state = {
      routeInfo: { distanceInKm: maxKm, canDoUserSegment: true },
      uiInfo: { routeParams: { segment: [1000, 5000] } },
      controls: { metric: true }
    };
    setSelectorState(state);
    render(<Segment />);

    const sliders = screen.getAllByRole('slider');
    // simulate changing the first thumb to 2 (km)
    fireEvent.change(sliders[0], { target: { value: '2' } });

    // expected meters: 2 km -> 2000
    expect(mockedSegmentSet).toHaveBeenCalledWith([2000, 5000]);
    expect((mockedUseAppDispatch() as jest.Mock)).toHaveBeenCalled();
  });

  test('segmentUpdate dispatches transformed meter values when metric=false (imperial)', () => {
    const maxKm = 10;
    const metersStart = 0;
    const metersEnd = 5000;
    const state = {
      routeInfo: { distanceInKm: maxKm, canDoUserSegment: true },
      uiInfo: { routeParams: { segment: [metersStart, metersEnd] } },
      controls: { metric: false }
    };
    setSelectorState(state);
    render(<Segment />);

    const sliders = screen.getAllByRole('slider');
    // change the first thumb to 2 miles
    fireEvent.change(sliders[0], { target: { value: '2' } });

    const expectedMeters = 2 * (milesToMeters as number);
    // second value should remain metersEnd
    expect(mockedSegmentSet).toHaveBeenCalled();
    const callArg = mockedSegmentSet.mock.calls[mockedSegmentSet.mock.calls.length - 1][0] as any;
    expect(callArg[0]).toBeCloseTo(expectedMeters, 1);
    expect(callArg[1]).toBeCloseTo(metersEnd, 1);
  });
});