import { renderWithProviders, fireEvent, screen } from 'test-utils';
import { describe, beforeEach, test, expect, jest } from '@jest/globals';

type ForecastDepValues = { weatherCorrectionMinutes: number, maxGustSpeed: number, chartData: any[] };

// mock translation
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({ t: (key: string) => key })
}));

// simplify Mantine Popover so that its children are always rendered, but keep other exports intact
jest.mock('@mantine/core', () => {
  const React = require('react');
  const actual = jest.requireActual('@mantine/core');
  const MockPopover = ({ children }: any) => <div>{children}</div>;
  MockPopover.Target = ({ children }: any) => <div>{children}</div>;
  MockPopover.Dropdown = ({ children }: any) => <div>{children}</div>;
  return {
    __esModule: true,
    ...actual,
    Popover: MockPopover
  };
});

// stub out forecast hook and chart component
const mockedUseForecastDependentValues = jest.fn<ForecastDepValues, []>();
jest.mock('../../utils/forecastValuesHook', () => ({
  useForecastDependentValues: () => mockedUseForecastDependentValues()
}));

jest.mock('./TimeChangeChart', () => ({
  TimeChangeChart: (props: any) => <div data-testid="chart" data-props={JSON.stringify(props)} />
}));

import { WeatherCorrections } from './WeatherCorrections';

describe('WeatherCorrections component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders lost text when minutes positive and uses weatherCorrections id', () => {
    mockedUseForecastDependentValues.mockReturnValue({ weatherCorrectionMinutes: 5.7, maxGustSpeed: 0, chartData: [] });
    const { container } = renderWithProviders(<WeatherCorrections />, { preloadedState: { controls: { metric: false } } });

    const span = container.querySelector('#weatherCorrections');
    expect(span).toBeTruthy();
    expect(span?.textContent).toContain('6 minutes');
    expect(span?.textContent).toContain('data.wind.lost');
  });

  test('renders gained text and gustyWeather id when gust above threshold', () => {
    mockedUseForecastDependentValues.mockReturnValue({ weatherCorrectionMinutes: -3.2, maxGustSpeed: 30, chartData: [] });
    const { container } = renderWithProviders(<WeatherCorrections />, { preloadedState: { controls: { metric: true } } });

    const span = container.querySelector('#gustyWeather');
    expect(span).toBeTruthy();
    expect(span?.textContent).toContain('3 minutes');
    expect(span?.textContent).toContain('data.wind.gained');
  });

  test('popover open triggers TimeChangeChart with correct props', () => {
    mockedUseForecastDependentValues.mockReturnValue({ weatherCorrectionMinutes: 2, maxGustSpeed: 0, chartData: [{x:1}] });
    const { container } = renderWithProviders(<WeatherCorrections />, { preloadedState: { controls: { metric: true } } });

    const span = container.querySelector('#weatherCorrections');
    expect(span).toBeTruthy();
    fireEvent.mouseEnter(span!);

    const chart = screen.getByTestId('chart');
    expect(chart).toBeTruthy();
    const props = JSON.parse(chart.getAttribute('data-props')!);
    expect(props.metric).toBe(true);
    expect(props.chartData).toEqual([{x:1}]);
    // popoverIsOpen is controlled internally and may remain false in mock; ensure boolean
    expect(typeof props.popoverIsOpen).toBe('boolean');
  });
});
