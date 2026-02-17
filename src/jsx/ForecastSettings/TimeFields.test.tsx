// src/jsx/ForecastSettings/TimeFields.test.tsx
import { renderWithProviders, screen } from 'test-utils';
import { describe, beforeEach, jest, test, expect } from '@jest/globals';
import { TimeFields, finishTimeFormat } from './TimeFields';
import { DateTime } from 'luxon';

jest.mock('../../utils/hooks', () => ({
  useActualFinishTime: jest.fn()
}));
jest.mock('../../utils/forecastValuesHook', () => ({
  useForecastDependentValues: jest.fn()
}));

import { useActualFinishTime } from '../../utils/hooks';
import { useForecastDependentValues } from '../../utils/forecastValuesHook';

describe('TimeFields component', () => {
  const mockedUseActualFinishTime = useActualFinishTime as unknown as jest.Mock;
  const mockedUseForecastDependentValues = useForecastDependentValues as unknown as jest.Mock;
  const mockedDateTime = DateTime as unknown as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseActualFinishTime.mockReturnValue(null);
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: null });
  });

  test('renders DateSelect component', () => {
    renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', 
            maxDaysInFuture: 5, canForecastPast: true } }}});
    expect(screen.getByText('February 12, 2026 7:00am')).toBeTruthy();
  });

  test('displays projected finish time label', () => {
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: 'Mon, Jan 15 2024 2:30pm' });
    mockedDateTime.fromFormat = jest.fn(() => ({
      toFormat: jest.fn(() => 'January 15, 2024 2:30 PM')
    }));
    renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    expect(screen.getByText('labels.projectedFinish')).toBeTruthy();
  });

  test('displays placeholder when predictedFinishTime is null', () => {
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: null });
    renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    expect(screen.getByText('data.noForecastPlaceholder')).toBeTruthy();
  });

  test('formats and displays predicted finish time correctly', () => {
    const mockFormattedTime = 'January 15, 2024 2:30 PM';
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: 'Mon, Jan 15 2024 2:30pm' });
    mockedDateTime.fromFormat = jest.fn(() => ({
      toFormat: jest.fn(() => mockFormattedTime)
    }));
    renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    expect(screen.getByText(mockFormattedTime)).toBeTruthy();
    expect(mockedDateTime.fromFormat).toHaveBeenCalledWith('Mon, Jan 15 2024 2:30pm', finishTimeFormat);
  });

  test('applies blue background and white text when finish time exists', () => {
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: 'Mon, Jan 15 2024 2:30pm' });
    mockedDateTime.fromFormat = jest.fn(() => ({
      toFormat: jest.fn(() => 'January 15, 2024 2:30 PM')
    }));
    const { container } = renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    const finishTimeDiv = container.querySelector('div[style*="rgb(19, 124, 189)"]');
    expect(finishTimeDiv).toBeTruthy();
    expect(finishTimeDiv?.getAttribute('style')).toContain('color: white');
  });

  test('applies gray background and oblique text when finish time is null', () => {
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: null });
    const { container } = renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    const finishTimeDiv = container.querySelector('div[style*="rgba(0, 0, 0, 0.05)"]');
    expect(finishTimeDiv).toBeTruthy();
    expect(finishTimeDiv?.getAttribute('style')).toContain('font-style: oblique');
    expect(finishTimeDiv?.getAttribute('style')).toContain('rgba(0, 0, 0, 0.5)');
  });

  test('renders actual finish time section when actualFinishTime is not null', () => {
    mockedUseActualFinishTime.mockReturnValue('January 15, 2024 3:45 PM');
    renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    expect(screen.getByText('Actual finish time')).toBeTruthy();
    expect(screen.getByText('January 15, 2024 3:45 PM')).toBeTruthy();
  });

  test('does not render actual finish time section when actualFinishTime is null', () => {
    mockedUseActualFinishTime.mockReturnValue(null);
    renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    expect(screen.queryByText('Actual finish time')).toBeNull();
  });

  test('applies orange background styling to actual finish time', () => {
    mockedUseActualFinishTime.mockReturnValue('January 15, 2024 3:45 PM');
    const { container } = renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    const actualTimeDiv = container.querySelector('div[style*="rgba(234, 89, 41, 0.8)"]');
    expect(actualTimeDiv).toBeTruthy();
    expect(actualTimeDiv?.getAttribute('style')).toContain('color: white');
  });

  test('renders both time fields with correct layout structure', () => {
    mockedUseForecastDependentValues.mockReturnValue({ finishTime: 'Mon, Jan 15 2024 2:30pm' });
    mockedUseActualFinishTime.mockReturnValue('January 15, 2024 3:45 PM');
    mockedDateTime.fromFormat = jest.fn(() => ({
      toFormat: jest.fn(() => 'January 15, 2024 2:30 PM')
    }));
    const { container } = renderWithProviders(<TimeFields />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}});
    const flexContainers = container.querySelectorAll('div[style*="display: flex"]');
    expect(flexContainers.length).toBeGreaterThanOrEqual(2);
  });
});