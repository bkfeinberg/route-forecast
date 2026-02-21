import { renderWithProviders, fireEvent } from 'test-utils';
import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import StravaRouteIdInput from './StravaRouteIdInput';
import userEvent from '@testing-library/user-event';

describe('StravaRouteIdInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders input and label correctly', () => {
    const { container } = renderWithProviders(<StravaRouteIdInput />, { preloadedState: { strava: { route: 'foo' } } });
    const input = container.querySelector('#stravaRoute') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('text');

    const label = container.querySelector('label[for="stravaRoute"]');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('Strava Route Id');
  });

  test('value reflects store state and updates on change', async () => {
    const { store, container } = renderWithProviders(<StravaRouteIdInput />, { preloadedState: { strava: { route: 'initial' } } });
    const input = container.querySelector('#stravaRoute') as HTMLInputElement;
    expect(input.value).toBe('initial');

    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, 'newroute');
    expect(store.getState().strava.route).toBe('newroute');
  });

  test('onDrop with string item dispatches action', () => {
    const { store, container } = renderWithProviders(<StravaRouteIdInput />, { preloadedState: { strava: { route: '' } } });
    const input = container.querySelector('#stravaRoute') as HTMLInputElement;

    // create fake DataTransfer
    const items = [
      {
        kind: 'string',
        getAsString: (cb: (value: string) => void) => cb('droppedValue')
      }
    ];
    const dt: any = { items };

    fireEvent.drop(input, { dataTransfer: dt });
    expect(store.getState().strava.route).toBe('droppedValue');
  });
});
