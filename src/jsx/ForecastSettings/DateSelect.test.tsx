import { screen } from '@testing-library/react';
import {renderWithProviders} from '../../utils/test-utils';
import DateSelect from './DateSelect';
import userEvent from '@testing-library/user-event';
import { DateTime } from 'luxon';

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

window.ResizeObserver = ResizeObserver;

beforeEach(() => {
  
});

describe('DateSelect', () => {
  test('renders DateSelect component', () => {
    const { container } = renderWithProviders(
          <DateSelect />
    );
    
    expect(container.querySelector('.mantine-DateTimePicker-root')).toBeInTheDocument();
  });

  test('updates date on change', async () => {
    const { store } = renderWithProviders(
          <DateSelect />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}}
    );
    const user = userEvent.setup();
    const dateButton = screen.getByText('February 12, 2026 7:00am');
    await user.type(dateButton, 'February 15, 2026 10:00am{enter}');
    await user.tab();
    expect(store.getState().uiInfo.routeParams.startTimestamp).not.toBe(1770908400265);  
  });

  test('disables past dates if canForecastPast is false', async () => {

    const user = userEvent.setup();
    const futureTime = DateTime.now().plus({ days: 4 }).set({hour:7, minute:0});
    const futureTimestamp = futureTime.toMillis();
    renderWithProviders(
      <DateSelect />,
      {
        preloadedState: {
          uiInfo: {
            routeParams: {
              startTimestamp: futureTimestamp,
              zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: false
            }
          }
        }
      }
    );

    const dateButton = screen.getByText(new RegExp(futureTime.toFormat('MMMM d, yyyy'), 'i'));
    await user.click(dateButton);
    const pastDate = DateTime.now().minus({ days: 1 }).toFormat('d MMMM yyyy');
    const pastButton = screen.getByRole('button', {
      name: new RegExp(pastDate, 'i')
    });
    expect(pastButton).toBeDisabled();
    const presentDate = futureTime.toFormat('d MMMM yyyy');
    const presentButton = screen.getByRole('button', {
      name: new RegExp(presentDate, 'i')
    });
    expect(presentButton).not.toBeDisabled();
  });

  test('allows past dates if canForecastPast is true', async () => {

    const user = userEvent.setup();
    renderWithProviders(
          <DateSelect />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}}
    );

    const dateButton = screen.getByText('February 12, 2026 7:00am');
    await user.click(dateButton);
    const pastButton = screen.getByRole('button', {
      name: /11 february 2026/i
    });
    expect(pastButton).not.toBeDisabled();
    const presentButton = screen.getByRole('button', {
      name: /14 february 2026/i
    });
    expect(presentButton).not.toBeDisabled();
  });
});