import { renderWithProviders, screen, fireEvent } from '../../utils/test-utils';
import { ControlTableContainer } from './ControlTableContainer';

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

// mock Sentry used in the component tree
jest.mock('@sentry/react', () => ({
  __esModule: true,
  // avoid JSX inside jest.mock factory — return children directly
  ErrorBoundary: ({ children }: any) => children,
  createReduxEnhancer: () => (enhancer: any) => enhancer,
  logger: { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn(), fmt: jest.fn() },
  metrics: { count: jest.fn() }
}));

describe('ControlTableContainer', () => {
  test('renders add control button and banked toggle', () => {
    renderWithProviders(<ControlTableContainer />, {
      preloadedState: {
        controls: { displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: true }
      }
    });

    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Display banked time')).toBeInTheDocument();
  });

  test('clicking add control dispatches controlAdded', () => {
    const { store } = renderWithProviders(<ControlTableContainer />, {
      preloadedState: {
        controls: { displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: true }
      }
    });

    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);

    expect(store.getState().controls.userControlPoints).toEqual([{ name: '', distance: 0, duration: 0 }]);
  });

  test('toggling banked updates state', () => {
    const { store } = renderWithProviders(<ControlTableContainer />, {
      preloadedState: {
        controls: { displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: true }
      }
    });

    const bankedBtn = screen.getByText('Display banked time');
    fireEvent.click(bankedBtn);

    expect(store.getState().controls.displayBanked).toBe(true);
  });

  test('focus helper focuses add button', () => {
    const { container } = renderWithProviders(<ControlTableContainer />, {
      preloadedState: {
        controls: { displayBanked: false, userControlPoints: [], controlOpenStatus: [], displayControlTableUI: true }
      }
    });

    const focusDiv = container.querySelector('div[tabindex="98"]') as HTMLElement | null;
    const addButton = container.querySelector('#addButton') as HTMLElement | null;
    expect(focusDiv).not.toBeNull();
    expect(addButton).not.toBeNull();

    // focusing the helper div should move focus to the add button
    fireEvent.focus(focusDiv!);
    expect(document.activeElement).toBe(addButton);
  });
});
