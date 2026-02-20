import { renderWithProviders, fireEvent, screen } from 'test-utils';
import { describe, beforeEach, test, expect } from '@jest/globals';
import StravaActivityIdInput from './StravaActivityIdInput';
import userEvent from '@testing-library/user-event';

describe('StravaActivityIdInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders input field with correct id and attributes', () => {
    const { container } = renderWithProviders(<StravaActivityIdInput />, { preloadedState: {
      strava: { activity: '123', access_token: 'token' }
    }});

    const input = container.querySelector('#stravaActivity') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input?.type).toBe('text');
  });

  test('renders label with correct text', () => {
    const { container } = renderWithProviders(<StravaActivityIdInput />, { preloadedState: { strava: { activity: '', access_token: null } } });

    const label = container.querySelector('label[for="stravaActivity"]');
    expect(label).toBeTruthy();
    expect(label?.textContent).toContain('Strava Activity Id');
  });

  test('input value reflects store state', () => {
    const { container } = renderWithProviders(<StravaActivityIdInput />, { preloadedState: { strava: { activity: 'abc', access_token: 'token' } } });
    const input = container.querySelector('#stravaActivity') as HTMLInputElement;
    expect(input.value).toBe('abc');
  });

  test('updates store on change', async () => {
    const user = userEvent.setup();
    const { store, container } = renderWithProviders(<StravaActivityIdInput />, { preloadedState: { strava: { activity: '', access_token: 'token' } } });

    const input = container.querySelector('#stravaActivity') as HTMLInputElement;
    await user.type(input, '456');

    expect(store.getState().strava.activity).toBe('456');
  });

  test('input is autoFocus and has correct tabIndex', () => {
    const { container } = renderWithProviders(<StravaActivityIdInput />, { preloadedState: { strava: { activity: '', access_token: null } } });
    const input = container.querySelector('#stravaActivity') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input?.tabIndex).toBe(0);
  });
});
