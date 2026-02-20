import { renderWithProviders, screen, fireEvent } from '../../utils/test-utils';
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
});
