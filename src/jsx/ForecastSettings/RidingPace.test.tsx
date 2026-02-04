// src/jsx/ForecastSettings/RidingPace.test.tsx
import { render, fireEvent } from 'test-utils';
import { describe, beforeEach, jest, test, expect } from '@jest/globals';
import Cookies from 'universal-cookie';
// Mocks
const mCookie = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
};

jest.mock('universal-cookie', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mCookie)
  }; 
});

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: jest.fn()
}));
jest.mock('react-responsive', () => ({
  __esModule: true,
  useMediaQuery: jest.fn()
}));

jest.mock('../../utils/hooks', () => ({
  __esModule: true,
  useActualPace: jest.fn(),
  useFormatSpeed: jest.fn()
}));

// Simple wrapper for DesktopTooltip to expose label & className for assertions
jest.mock('../shared/DesktopTooltip', () => ({
  __esModule: true,
  DesktopTooltip: ({ children, label, className }: any) => (
    <div data-testid="desktop-tooltip" data-label={label} data-classname={className}>
      {children}
    </div>
  )
}));

// Mock actions to avoid pulling in Redux modules that import ESM-only dependencies
jest.mock('../../redux/actions', () => ({
  __esModule: true,
  setPace: jest.fn()
}));

import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { useActualPace, useFormatSpeed } from '../../utils/hooks';
import { RidingPace } from './RidingPace';

describe('RidingPace', () => {
  const mockedUseTranslation = useTranslation as unknown as jest.Mock;
  const mockedUseMedia = useMediaQuery as unknown as jest.Mock;
  const mockedUseActualPace = useActualPace as unknown as jest.Mock;
  const mockedUseFormatSpeed = useFormatSpeed as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTranslation.mockReturnValue({ t: (k: any) => k });
    mockedUseMedia.mockReturnValue(false);
    mockedUseActualPace.mockReturnValue(null);
    mockedUseFormatSpeed.mockReturnValue((v: any) => `${v}`);
  });

  test('renders button with numeric speed and mph label and default tooltip', () => {
    const mockSetPace = jest.fn();
    const { container, getByTestId } = render(
      <RidingPace pace={'B'} setPace={mockSetPace} metric={false} />
    );

    // button shows selected speed and unit
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('12 mph');

    // label exists
    expect(container.querySelector('label')!.textContent).toContain('labels.ridingPace');

    // DesktopTooltip should show default tooltip text when no actual pace
    const tooltip = getByTestId('desktop-tooltip');
    expect(tooltip.getAttribute('data-label')).toBe('tooltips.ridingPace');
    expect(tooltip.getAttribute('data-classname')).toBe('pace_tooltip');
  });

  test('when actual pace is present, tooltip shows actual pace and class reflects comparison', () => {
    const mockSetPace = jest.fn();
    // actual pace less than selected speed (10 < 12) => red-tooltip
    mockedUseActualPace.mockReturnValue(10);
    mockedUseFormatSpeed.mockReturnValue((v: any) => `${v}x`);

    const { getByTestId } = render(
      <RidingPace pace={'B'} setPace={mockSetPace} metric={false} />
    );

    const tooltip = getByTestId('desktop-tooltip');
    // expect 'tooltips.actualPace A (10x)'
    expect(tooltip.getAttribute('data-label')).toBe('tooltips.actualPace A (10x)');
    expect(tooltip.getAttribute('data-classname')).toBe('red-tooltip');
  });

  test('selecting an option saves cookie and calls setPace', async () => {
    const mockSetPace = jest.fn();
    const { container, getByText } = render(
      <RidingPace pace={'B'} setPace={mockSetPace} metric={false} />
    );

    // open dropdown by clicking button
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);

    // click an option (e.g., 'C' is 14 mph)
    const option = getByText('14 mph');
    fireEvent.click(option);

    // expect cookie saved and setPace called with value 'C'
    expect(mCookie.set).toHaveBeenCalledWith('pace', 'C');
    expect(mockSetPace).toHaveBeenCalledWith('C');
  });

  test('renders metric button and kph label', () => {
    const mockSetPace = jest.fn();
    const { container } = render(
      <RidingPace pace={'B'} setPace={mockSetPace} metric={true} />
    );

    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    // metric B -> 19 kph
    expect(btn!.textContent).toBe('19 kph');
  });

  test('actual pace >= selected shows green-tooltip and correct label', () => {
    const mockSetPace = jest.fn();
    mockedUseActualPace.mockReturnValue(12);
    mockedUseFormatSpeed.mockReturnValue((v: any) => `${v}x`);

    const { getByTestId } = render(
      <RidingPace pace={'B'} setPace={mockSetPace} metric={false} />
    );

    const tooltip = getByTestId('desktop-tooltip');
    expect(tooltip.getAttribute('data-classname')).toBe('green-tooltip');
    // expect actual pace label to include matching alpha and formatted speed
    expect(tooltip.getAttribute('data-label')).toBe('tooltips.actualPace B (12x)');
  });

  test('invalid initial pace is corrected to A and setPace called', () => {
    const mockSetPace = jest.fn();
    const { container } = render(
      <RidingPace pace={'ZZ'} setPace={mockSetPace} metric={false} />
    );

    // correctPaceValue should have been called during render
    expect(mockSetPace).toHaveBeenCalledWith('A');

    // button should reflect the corrected pace (A -> 10 mph)
    const btn = container.querySelector('button');
    expect(btn!.textContent).toBe('10 mph');
  });

  test('metric dropdown selection saves cookie and calls setPace', async () => {
    const mockSetPace = jest.fn();
    const { container, getByText } = render(
      <RidingPace pace={'B'} setPace={mockSetPace} metric={true} />
    );

    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);

    // 'C' in metric table corresponds to 22 kph
    const option = getByText('22 kph');
    fireEvent.click(option);

    expect(mCookie.set).toHaveBeenCalledWith('pace', 'C');
    expect(mockSetPace).toHaveBeenCalledWith('C');
  });
});
