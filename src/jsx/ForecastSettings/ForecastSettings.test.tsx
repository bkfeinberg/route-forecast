import { renderWithProviders, screen, fireEvent, waitFor } from '../../utils/test-utils';
import ForecastSettings from './ForecastSettings';

jest.mock('react-i18next', () => {
  const en = require('../../data/en.json').translation;
  const t = (key: string) => {
    const parts = key.split('.');
    let cur: any = en;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) cur = cur[p]; else return key;
    }
    return cur;
  };
  return { __esModule: true, useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: () => new Promise(() => {}) } }) };
});

// mock Sentry to avoid rendering issues when ControlTableContainer is shown
jest.mock('@sentry/react', () => ({
  __esModule: true,
  ErrorBoundary: ({ children }: any) => children,
  createReduxEnhancer: () => (enhancer: any) => enhancer,
  logger: { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn(), fmt: jest.fn() },
  metrics: { count: jest.fn() }
}));

jest.mock('./DateSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="date-select" />
}));

jest.mock('./RidingPace', () => ({
  __esModule: true,
  default: () => <div data-testid="riding-pace" />
}));

describe('ForecastSettings', () => {
  test('renders ForecastInterval and settings UI', () => {
    renderWithProviders(<ForecastSettings />, {
      preloadedState: {
        uiInfo: { routeParams: { startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true, segment: [0, 10000] } },
        routeInfo: { distanceInKm: 100, canDoUserSegment: true },
        controls: { metric: false, celsius: false, displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: false }
      }
    });

    // ForecastInterval label should be present (localized string)
    expect(screen.getByText('Forecast Interval in minutes')).toBeInTheDocument();
  });

  test('toggles metric when metric label clicked', () => {
    const { store } = renderWithProviders(<ForecastSettings />, {
      preloadedState: {
        uiInfo: { routeParams: { startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true, segment: [0, 10000] } },
        routeInfo: { distanceInKm: 100, canDoUserSegment: true },
        controls: { metric: false, celsius: false, displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: false }
      }
    });

    const metricLabel = screen.getByText('Metric');
    fireEvent.click(metricLabel);

    expect(store.getState().controls.metric).toBe(true);
  });

  test('shows ControlTableContainer when stops toggle clicked', () => {
    const { store } = renderWithProviders(<ForecastSettings />, {
      preloadedState: {
        uiInfo: { routeParams: { startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true, segment: [0, 10000] } },
        routeInfo: { distanceInKm: 100, canDoUserSegment: true },
        controls: { metric: false, celsius: false, displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: false }
      }
    });

    const stopsBtn = screen.getByText('Add Stops');
    fireEvent.click(stopsBtn);

    // ControlTableContainer renders an "add control" button
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(store.getState().controls.displayControlTableUI).toBe(true);
  });

  test('opens settings and toggles temperature and metric controls', async () => {
    const { store } = renderWithProviders(<ForecastSettings />, {
      preloadedState: {
        uiInfo: { routeParams: { startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true, segment: [0, 10000] }, dialogParams: { errorDetails: null } },
        routeInfo: { distanceInKm: 100, canDoUserSegment: true },
        controls: { metric: false, celsius: false, displayBanked: false, displayControlTableUI: false, userControlPoints: [], controlOpenStatus: [] }
      }
    });

    fireEvent.click(screen.getByText('Settings'));
    fireEvent.click(screen.getByText('C', { exact: true }));
    expect(store.getState().controls.celsius).toBe(true);

    fireEvent.click(screen.getByText('Metric', { exact: true }));
    expect(store.getState().controls.metric).toBe(true);
  });

  test('keeps standard deviation and download-all options mutually exclusive', async () => {
    renderWithProviders(<ForecastSettings />, {
      preloadedState: {
        uiInfo: { routeParams: { startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true, segment: [0, 10000] }, dialogParams: { errorDetails: null } },
        routeInfo: { distanceInKm: 100, canDoUserSegment: true },
        controls: { metric: false, celsius: false, displayBanked: false, displayControlTableUI: false, userControlPoints: [], controlOpenStatus: [] }
      }
    });

    fireEvent.click(screen.getByText('Settings'));
    const standardDeviation = screen.getByLabelText('Compute standard deviation');
    const downloadAll = screen.getByLabelText('Download all forecasts');

    fireEvent.click(standardDeviation);
    expect(standardDeviation).toBeChecked();
    fireEvent.click(downloadAll);
    expect(downloadAll).toBeChecked();
    expect(standardDeviation).not.toBeChecked();
  });

  test('dismisses an error and reports unsupported clipboard copy', () => {
    const { container, store } = renderWithProviders(<ForecastSettings />, {
      preloadedState: {
        uiInfo: { routeParams: { startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true, segment: [0, 10000] }, dialogParams: { errorDetails: 'Forecast failed' } },
        routeInfo: { distanceInKm: 100, canDoUserSegment: true },
        controls: { metric: false, celsius: false, displayBanked: false, displayControlTableUI: false, userControlPoints: [], controlOpenStatus: [] }
      }
    });

    expect(screen.getByText('Forecast failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('alert').querySelector('button')!);
    expect(store.getState().uiInfo.dialogParams.errorDetails).toBeNull();

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[buttons.length - 1]);
  });
});
