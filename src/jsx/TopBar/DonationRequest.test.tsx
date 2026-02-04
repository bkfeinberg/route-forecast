// src/jsx/TopBar/DonationRequest.test.tsx
import { render, fireEvent, act } from 'test-utils';
import { describe, beforeEach, jest, test, expect } from '@jest/globals';
import Cookies from 'universal-cookie';

// Mocks
const mCookie = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn()
};

jest.mock('universal-cookie', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mCookie)
  }; 
});

jest.mock('react-ga4', () => {
  return {
    __esModule: true,
    default: {
      event: jest.fn()
    }
  };
});
jest.mock('react-responsive', () => {
  return {
    __esModule: true,
    useMediaQuery: jest.fn()
  };
});
jest.mock('react-i18next', () => {
  return {
    __esModule: true,
    useTranslation: jest.fn()
  };
});
// Simple wrapper for DesktopTooltip to render children
 jest.mock('../shared/DesktopTooltip', () => {
  return {
    __esModule: true,
    DesktopTooltip: ({ children }: any) => <div data-testid="desktop-tooltip">{children}</div>
  };
});

import ReactGA from 'react-ga4';
import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';
import DonationRequest from './DonationRequest';

const english_donation_image = 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif';
const french_donation_image = 'https://www.paypalobjects.com/fr_XC/i/btn/btn_donate_LG.gif';
const spanish_donation_image = 'https://www.paypalobjects.com/es_XC/i/btn/btn_donate_LG.gif';

describe('DonationRequest', () => {
  
  const mockedGA = ReactGA as unknown as { event: jest.Mock };
  const mockedUseMedia = useMediaQuery as unknown as jest.Mock;
  const mockedUseTranslation = useTranslation as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // default mocks
    mockedUseMedia.mockReturnValue(false);
    mockedUseTranslation.mockReturnValue({
      t: (k: any) => k,
      i18n: { resolvedLanguage: undefined }
    });
  });

  test('renders english donation image by default and uses small width', () => {
    const { container } = render(<DonationRequest wacky={false} />);
    const img = container.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe(english_donation_image);
    // width is set as attribute 'width'
    expect(img!.getAttribute('width')).toBe('80px');
  });

  test('renders french donation image when i18n resolvedLanguage starts with fr', () => {
    mockedUseTranslation.mockReturnValue({
      t: (k: any) => k,
      i18n: { resolvedLanguage: 'fr-CA' }
    });
    const { container } = render(<DonationRequest wacky={false} />);
    const img = container.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe(french_donation_image);
  });

  test('clicking donate saves cookie and calls ReactGA.event', () => {
    const { container } = render(<DonationRequest wacky={false} />);
    const donateEl = container.querySelector('#donate') as HTMLElement | null;
    expect(donateEl).not.toBeNull();
    fireEvent.click(donateEl!);
    expect(mCookie.set).toHaveBeenCalledWith('clickedDonate', "true", { path: '/' });
    expect(mockedGA.event).toHaveBeenCalledWith('purchase', { currency: 'dollars' });
  });

  test('wacky true animates transform and filter over time when cookie not set', () => {
    jest.useFakeTimers();
    const { container } = render(<DonationRequest wacky={true} />);
    const wrapper = container.firstChild as HTMLElement;
    // initial style values are empty
    expect(wrapper.style.transform).toBe('');
    expect(wrapper.style.filter).toBe('');
    // advance timers to trigger first interval update
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    // after timer, transform and filter should be non-empty strings
    expect(container.querySelector('div')!.style.transform).not.toBe('');
    expect(container.querySelector('div')!.style.filter).not.toBe('');
    jest.useRealTimers();
  });

  test('when donateWasClicked is true, wacky does not animate', () => {
    jest.useFakeTimers();
    const { container, getByRole } = render(<DonationRequest wacky={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.transform).toBe('');
    expect(wrapper.style.filter).toBe('');
    act(() => {
      jest.advanceTimersByTime(1500 * 3);
    });
    // still unchanged because animation should not have been started
    expect(wrapper.style.transform).toBe('');
    expect(wrapper.style.filter).toBe('');
    jest.useRealTimers();
  });

  test('renders spanish image when i18n resolvedLanguage starts with es', () => {
    mockedUseTranslation.mockReturnValue({
      t: (k: any) => k,
      i18n: { resolvedLanguage: 'es-MX' }
    });
    const { container } = render(<DonationRequest wacky={false} />);
    const img = container.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe(spanish_donation_image);
  });
});