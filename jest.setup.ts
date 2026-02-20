import '@testing-library/jest-dom'

jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      t: (i18nKey: string) => i18nKey,
      // or with TypeScript:
      //t: (i18nKey: string) => i18nKey,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    };
  },
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  }
}));

// Mock Sentry
jest.mock('@sentry/react', () => ({
  __esModule: true,
  // ErrorBoundary is used in several components; provide a passthrough for tests
  ErrorBoundary: ({ children }: any) => children,
  createReduxEnhancer: jest.fn(() => (createStore: any) => createStore),
  metrics: {count: jest.fn()},
  startSpan: jest.fn(() => ({finish: jest.fn()})),
  addBreadcrumb: jest.fn(),
  feedbackIntegration: jest.fn(),
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn()
  }
}));

// Mock React GA
jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    event: jest.fn()
  }
}));

window.HTMLElement.prototype.scrollIntoView = () => {};
const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

interface MockPost {
  id: number;
  title: string;
}

interface MockPerm {
  rwgps: string;
}

const handlers = [
  http.get('http://localhost/forecast_one', () => {
    return HttpResponse.json<MockPost[]>([{ id: 1, title: 'Mock Post' }]);
  }),
  http.get('http://localhost/rusa_perm_id', ({ request }) => {
    const id = new URL(request.url).searchParams.get('permId');
    if (id === '123') {
      return HttpResponse.json<MockPerm[]>([{ rwgps: '123' }]);
    } else if (id === '300') {
      return HttpResponse.json<MockPerm[]>([{ rwgps: '12345' }]);
    } else if (id === '999') {
      return HttpResponse.json<MockPerm[]>([]);
    } else {
      return HttpResponse.json<MockPerm[]>([]);
    }
  }),
];

const server = setupServer(...handlers);

beforeAll(() => {server.listen()});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
