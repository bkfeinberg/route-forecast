import { fireEvent, screen } from '@testing-library/react';
import {renderWithProviders} from '../../utils/test-utils';
import { DateTime } from 'luxon';

jest.mock('@mantine/dates', () => ({
  DateTimePicker: ({value, minDate, onChange}: any) => (
    <div className="mantine-DateTimePicker-root" {...(minDate ? {"data-min-date": minDate.toISOString()} : {})}>
      <input role="textbox" value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}));

import DateSelect from './DateSelect';

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
    const dateInput = screen.getByRole('textbox');
    fireEvent.change(dateInput, {target: {value: '2026-02-15 10:00:00'}});
    fireEvent.blur(dateInput);
    expect(store.getState().uiInfo.routeParams.startTimestamp).not.toBe(1770908400265);  
  });

  test('disables past dates if canForecastPast is false', async () => {

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
    expect(screen.getByRole('textbox').parentElement).toHaveAttribute('data-min-date');
  });

  test('allows past dates if canForecastPast is true', async () => {

    renderWithProviders(
          <DateSelect />, {preloadedState: {uiInfo: { routeParams: { 
            startTimestamp: 1770908400265, zone: 'America/Los_Angeles', maxDaysInFuture: 5, canForecastPast: true } }}}
    );

    expect(screen.getByRole('textbox').parentElement).not.toHaveAttribute('data-min-date');
  });
});