const addBreadcrumbMock = jest.fn();

jest.mock('@sentry/react', () => ({
  __esModule: true,
  addBreadcrumb: jest.fn((...args: unknown[]) => addBreadcrumbMock(...args))
}));

import { addBreadcrumb } from '@sentry/react';
import { updateHistory } from './updateHistory';

describe('src/jsx/app/updateHistory.ts', () => {
  const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, 'userAgent', {
      get: () => 'Mozilla/5.0',
      configurable: true
    });
    window.history.pushState = jest.fn((state, title, url) => originalPushState.call(window.history, state, title, url));
    window.history.replaceState = jest.fn((state, title, url) => originalReplaceState.call(window.history, state, title, url));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUserAgentDescriptor) {
      Object.defineProperty(window.navigator, 'userAgent', originalUserAgentDescriptor);
    }
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
  });

  test('pushes state on first history update', () => {
    updateHistory('/test?route=abc', 'rwgpsRoute=abc');

    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: 'history',
      level: 'info',
      message: 'rwgpsRoute=abc',
      data: { url: '/test?route=abc' }
    });
    expect(window.history.pushState).toHaveBeenCalledWith('rwgpsRoute=abc', '', '/test?route=abc');
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  test('replaces state when forceReplace is true', () => {
    originalPushState.call(window.history, 'rwgpsRoute=abc', '', '/existing?route=abc');
    (window.history.pushState as jest.Mock).mockClear();
    (window.history.replaceState as jest.Mock).mockClear();

    updateHistory('/test?route=abc', 'rwgpsRoute=abc', true);

    expect(window.history.replaceState).toHaveBeenCalledWith('rwgpsRoute=abc', '', '/test?route=abc');
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  test('replaces state when route matches existing history state', () => {
    originalPushState.call(window.history, 'rwgpsRoute=abc', '', '/existing?route=abc');
    (window.history.pushState as jest.Mock).mockClear();
    (window.history.replaceState as jest.Mock).mockClear();

    updateHistory('/test?route=abc', 'rwgpsRoute=abc');

    expect(window.history.replaceState).toHaveBeenCalledWith('rwgpsRoute=abc', '', '/test?route=abc');
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  test('skips history update for HeadlessChrome user agent', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      get: () => 'HeadlessChrome',
      configurable: true
    });

    updateHistory('/test?route=abc', 'rwgpsRoute=abc');

    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  test('does not update history when query is null', () => {
    updateHistory('/test?route=abc', null as unknown as string);

    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: 'history',
      level: 'info',
      message: null,
      data: { url: '/test?route=abc' }
    });
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  test('does not throw when window is missing', () => {
    const originalWindow = (global as any).window;
    delete (global as any).window;

    expect(() => updateHistory('/test?route=abc', 'rwgpsRoute=abc')).not.toThrow();

    (global as any).window = originalWindow;
  });
});
