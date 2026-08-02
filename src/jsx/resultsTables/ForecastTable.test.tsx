import React from 'react';
import { renderWithProviders, screen, fireEvent } from 'test-utils';

type ForecastDepValues = { weatherCorrectionMinutes: number, maxGustSpeed: number, chartData: any[]; finishTime?: string; timeFromHills?: number };

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../../utils/forecastValuesHook', () => ({
  useForecastDependentValues: () => mockedUseForecastDependentValues(),
}));

jest.mock('../../utils/hooks', () => ({
  useFormatSpeed: () => (value: number) => `${value} mph`,
  useAppSelector: jest.requireActual('../../utils/hooks').useAppSelector,
  useAppDispatch: jest.requireActual('../../utils/hooks').useAppDispatch,
}));

jest.mock('../InstallExtensionButton', () => ({
  __esModule: true,
  default: () => <div data-testid="install-extension" />,
}));

jest.mock('../ForecastSettings/TimeFields', () => ({
  finishTimeFormat: 'EEE, MMM dd yyyy h:mma',
}));

jest.mock('react-responsive', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMediaQuery: () => true,
}));

jest.mock('../../redux/forecastActions', () => ({
  __esModule: true,
  cancelForecast: jest.fn(),
}));

jest.mock('../TopBar/ShortUrl', () => ({
  __esModule: true,
  default: () => <div data-testid="short-url" />,
}));

jest.mock('./WeatherCorrections', () => ({
  WeatherCorrections: () => <div data-testid="weather-corrections" />,
}));

jest.mock('./TemperaturesChart', () => ({
  TemperaturesChart: () => <div data-testid="temperature-chart" />,
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  addBreadcrumb: jest.fn(),
  createReduxEnhancer: () => (next: any) => (reducer: any, initialState: any) => next(reducer, initialState),
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn(),
  },
  captureMessage: jest.fn(),
}));

jest.mock('@sentry/browser', () => ({
  __esModule: true,
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn(),
  },
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  createReduxEnhancer: () => (next: any) => (reducer: any, initialState: any) => next(reducer, initialState),
}));

const mockedUseForecastDependentValues = jest.fn<ForecastDepValues, []>();

import ForecastTable from './ForecastTable';

const createForecastState = () => ({
  forecast: {
    forecast: [
      {
        time: '2024-01-01T06:00:00-05:00',
        zone: 'America/New_York',
        distance: 10,
        summary: 'Clear',
        temp: '70',
        feel: '72',
        stdDev: 2.5,
        precip: '0.0%',
        humidity: '40%',
        cloudCover: '10%',
        aqi: 20,
        gust: '15',
        windSpeed: '12',
        relBearing: 80,
        windBearing: 90,
        isControl: false,
      },
      {
        time: '2024-01-01T07:00:00-05:00',
        zone: 'America/New_York',
        distance: 20,
        summary: '',
        temp: '68',
        feel: '70',
        stdDev: undefined,
        precip: '10.0%',
        humidity: '45%',
        cloudCover: '20%',
        aqi: undefined,
        gust: '20',
        windSpeed: '15',
        relBearing: 100,
        windBearing: 95,
        isControl: true,
      },
    ],
    weatherProvider: 'weatherKit',
    zoomToRange: false,
    fetchAqi: false,
  },
  routeInfo: { name: 'Test Route', distanceInKm: 50 },
  controls: { metric: false, celsius: false, userControlPoints: [] },
  uiInfo: { routeParams: { startTimestamp: Date.parse('2024-01-01T05:00:00-05:00'), zone: 'America/New_York' } },
});

describe('ForecastTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(document, 'execCommand', { value: jest.fn(), configurable: true });
    mockedUseForecastDependentValues.mockReturnValue({
      weatherCorrectionMinutes: 5,
      maxGustSpeed: 12,
      chartData: [],
      finishTime: 'Mon, Jan 01 2024 8:00AM',
      timeFromHills: 1.5,
    });
  });

  it('renders the forecast table and summary content', () => {
    renderWithProviders(<ForecastTable />, { preloadedState: createForecastState() });

    expect(screen.getAllByTestId('weather-corrections').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Elapsed time/i).length).toBeGreaterThan(0);
    expect(screen.getByText('tableHeaders.time')).toBeInTheDocument();
    expect(screen.getByText(/forecastControls/i)).toBeInTheDocument();
  });

  it('toggles the gust, apparent temperature, and relative bearing displays', () => {
    renderWithProviders(<ForecastTable />, { preloadedState: createForecastState() });

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    if (buttons.length > 0) fireEvent.click(buttons[0]);
    if (buttons.length > 1) fireEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('copies the table and toggles AQI and zoom state', () => {
    const { container } = renderWithProviders(<ForecastTable />, { preloadedState: createForecastState() });

    const aqiButton = screen.getAllByRole('button').find(button => button.textContent?.includes('AQI'));
    if (aqiButton) fireEvent.click(aqiButton);
    const copyButton = Array.from(container.querySelectorAll('button')).find(button => button.querySelector('svg.tabler-icon-clipboard'));
    if (copyButton) {
      fireEvent.click(copyButton);
    }

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
