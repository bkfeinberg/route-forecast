import { renderWithProviders, screen, fireEvent } from '../../utils/test-utils';
import ForecastInterval from './ForecastInterval';

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

describe('ForecastInterval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders slider with value from store', () => {
    renderWithProviders(<ForecastInterval />, {
      preloadedState: { uiInfo: { routeParams: { min_interval: 0.25, interval: 1.0 } } }
    });

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    const valueNow = parseFloat(slider.getAttribute('aria-valuenow') || '0');
    expect(valueNow).toBeCloseTo(1.0, 5);
  });

  test('dispatches interval change when slider changes', () => {
    const { store } = renderWithProviders(<ForecastInterval />, {
      preloadedState: { uiInfo: { routeParams: { min_interval: 0.25, interval: 1.0 } } }
    });

    const slider = screen.getByRole('slider');
    // simulate changing slider to 1.25
    fireEvent.change(slider, { target: { value: '1.25' } });

    expect(store.getState().uiInfo.routeParams.interval).toBeCloseTo(1.25, 5);
  });
});
