import { renderWithProviders, fireEvent, screen } from 'test-utils';
import { describe, beforeEach, test, expect } from '@jest/globals';
import RouteInfoInputStrava from './RouteInfoInputStrava';
import userEvent from '@testing-library/user-event';
import ReactGA from 'react-ga4';

describe('RouteInfoInputStrava Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows Login to Strava when access token is null', () => {
    const { container } = renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: null, activity: '' } } });
    const loginBtn = screen.getByRole('button', { name: /Login to Strava/i });
    expect(loginBtn).toBeTruthy();

    const img = container.querySelector('#stravaImage');
    expect(img).toBeTruthy();
  });

  test('renders activity input and Analyze Ride button when access token present', () => {
    const { container } = renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', activity: '' } } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Ride/i });
    expect(analyzeBtn).toBeTruthy();

    const activityInput = screen.getByLabelText(/Strava Activity Id/i);
    expect(activityInput).toBeTruthy();

    const img = container.querySelector('#stravaImage');
    expect(img).toBeTruthy();
  });

  test('Analyze Ride button is disabled when activity is empty', () => {
    renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', activity: '' } } });
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Ride/i }) as HTMLButtonElement;
    expect(analyzeBtn.disabled).toBe(true);
  });

  test('Analyze Ride button is disabled when fetching', () => {
    renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', activity: '123', fetching: true } } });
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Ride/i }) as HTMLButtonElement;
    expect(analyzeBtn.disabled).toBe(true);
  });

  test('Analyze Ride button is enabled when activity has value and not fetching', () => {
    renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', activity: '300', fetching: false } } });
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Ride/i }) as HTMLButtonElement;
    expect(analyzeBtn.disabled).toBe(false);
  });

  test('clicking Analyze Ride calls ReactGA.event with activity id', () => {
    // ensure ReactGA.event mock exists
    (ReactGA as any).event = jest.fn();

    renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', activity: '300', fetching: false } } });
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Ride/i }) as HTMLButtonElement;
    fireEvent.click(analyzeBtn);

    expect((ReactGA as any).event).toHaveBeenCalledWith('earn_virtual_currency', { virtual_currency_name: '300' });
  });

  test('Load Route button is disabled when no route id', () => {
    renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', route: '', fetching: false } } });
    const loadBtn = screen.getByRole('button', { name: /Load Route/i }) as HTMLButtonElement;
    expect(loadBtn.disabled).toBe(true);
  });

  test('Load Route button is enabled when route id present', () => {
    renderWithProviders(<RouteInfoInputStrava />, { preloadedState: { strava: { access_token: 'tok', route: 'abc', fetching: false } } });
    const loadBtn2 = screen.getByRole('button', { name: /Load Route/i }) as HTMLButtonElement;
    expect(loadBtn2.disabled).toBe(false);
  });
});
