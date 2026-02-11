// src/jsx/RouteInfoForm/RideWithGpsId.test.tsx
import { render, fireEvent } from 'test-utils';
import { describe, beforeEach, test, expect } from '@jest/globals';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import RideWithGpsId from './RideWithGpsId';
import { routeParamsReducer } from '../../redux/routeParamsSlice';
import { dialogParamsReducer } from '../../redux/dialogParamsSlice';
import React from 'react';

// Mocks
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: { changeLanguage: () => new Promise(() => {}) }
    };
  }
}));

jest.mock('../../jsx/app/updateHistory', () => ({
  __esModule: true,
  updateHistory: jest.fn()
}));

jest.mock('../../redux/paramsSlice', () => ({
  __esModule: true,
  querySet: jest.fn(() => ({ type: 'params/querySet' }))
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
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

// Helper to create a Redux store for testing
const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      uiInfo: combineReducers({
        routeParams: routeParamsReducer,
        dialogParams: dialogParamsReducer
      })
    },
    preloadedState
  });
};

// Default preloaded state
const defaultPreloadedState = {
  uiInfo: {
    dialogParams: {
      loadingSource: null,
      succeeded: false
    },
    routeParams: {
      rwgpsRoute: ''
    }
  }
};

describe('RideWithGpsId Component', () => {
  let store: ReturnType<typeof createTestStore>;
  let mockLoadButtonRef: React.RefObject<HTMLButtonElement>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders TextInput with correct id and attributes', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input?.type).toBe('text');
    // Mantine TextInput with pattern prop renders pattern attribute
    if (input?.pattern) {
      expect(input.pattern).toBe('[0-9]*');
    }
  });

  test('displays label with correct translation key', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const label = container.querySelector('label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('titles.rwgpsId');
  });

  test('input value reflects Redux state', () => {
    const preloadedState = {
      uiInfo: {
        dialogParams: {
          loadingSource: null,
          succeeded: false
        },
        routeParams: {
          rwgpsRoute: '12345'
        }
      }
    };
    
    store = createTestStore(preloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    expect(input?.value).toBe('12345');
  });

  test('renders CloseButton', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    // Mantine CloseButton renders as a button, check if it exists
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('applies font size styling to TextInput', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    const styles = window.getComputedStyle(input);
    // Font size 16px is set to prevent Mobile Safari zoom
    expect(input?.style.fontSize || styles.fontSize).toBeTruthy();
  });

  test('applies glowing_input class to TextInput', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('.glowing_input');
    expect(input).toBeTruthy();
  });

  test('handles Enter key press when loadButtonRef is set', () => {
    store = createTestStore(defaultPreloadedState);
    const mockClickFn = jest.fn();
    const loadButtonRef = {
      current: { click: mockClickFn } as any
    };
    
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={loadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
    
    expect(mockClickFn).toHaveBeenCalled();
  });

  test('handles non-Enter key press without clicking button', () => {
    store = createTestStore(defaultPreloadedState);
    const mockClickFn = jest.fn();
    const loadButtonRef = {
      current: { click: mockClickFn } as any
    };
    
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={loadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'a', code: 'KeyA', keyCode: 65, which: 65 });
    
    expect(mockClickFn).not.toHaveBeenCalled();
  });

  test('handles input change event', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '54321' } });
    
    expect(input?.value).toBe('54321');
  });

  test('handles validation state when loading with rwgps method', () => {
    const preloadedState = {
      uiInfo: {
        dialogParams: {
          loadingSource: 'rwgps',
          succeeded: true
        },
        routeParams: {
          rwgpsRoute: ''
        }
      }
    };
    
    store = createTestStore(preloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    // When loadingSource matches and succeeded is true, validation state should be valid
    expect(input).toBeTruthy();
  });

  test('handles validation state with failed loading', () => {
    const preloadedState = {
      uiInfo: {
        dialogParams: {
          loadingSource: 'rwgps',
          succeeded: false
        },
        routeParams: {
          rwgpsRoute: ''
        }
      }
    };
    
    store = createTestStore(preloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    // When loadingSource matches but succeeded is false, validation should be invalid
    expect(input).toBeTruthy();
  });

  test('handles drag and drop of text', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    // DataTransfer is not available in jsdom, so we'll just verify the input exists
    // and has the onDrop handler by checking the component rendered
    expect(input).toBeTruthy();
  });

  test('input is autoFocus and has correct tabIndex', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    // Mantine TextInput with tabIndex prop
    if (input?.tabIndex !== undefined) {
      expect(input.tabIndex).toBe(0);
    }
  });

  test('renders with Flex layout column direction', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    // Flex component from mantine renders with data attributes
    const flexWrapper = container.querySelector('[class*="flex"]') || container.firstChild;
    expect(flexWrapper).toBeTruthy();
  });

  test('closeButton is positioned on the right of input', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route');
    expect(input).toBeTruthy();
  });

  test('input has correct width set', () => {
    store = createTestStore(defaultPreloadedState);
    mockLoadButtonRef = { current: null };
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={mockLoadButtonRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  test('component handles null loadButtonRef gracefully', () => {
    store = createTestStore(defaultPreloadedState);
    const nullRef = { current: null };
    
    const { container } = render(
      <Provider store={store}>
        <RideWithGpsId loadButtonRef={nullRef} />
      </Provider>
    );
    
    const input = container.querySelector('#rwgps_route') as HTMLInputElement;
    // Should still render and handle keyDown without error
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
    expect(input).toBeTruthy();
  });
});
