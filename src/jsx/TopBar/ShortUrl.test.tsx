import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ShortUrl from './ShortUrl';
import { renderWithProviders } from 'test-utils';
import { shortenUrl } from '../../redux/actions';
import { notifications } from '@mantine/notifications';
import ReactGA from 'react-ga4';

jest.mock('../../redux/actions', () => ({
  shortenUrl: jest.fn(() => () => ({ type: 'shortenUrl' }))
}));

jest.mock('@mantine/notifications', () => ({
  notifications: { show: jest.fn() }
}));

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: { event: jest.fn() }
}));

describe('ShortUrl', () => {
  const mockShortenUrl = shortenUrl as jest.MockedFunction<typeof shortenUrl>;
  const mockShow = (notifications as any).show as jest.Mock;
  const mockReactGaEvent = (ReactGA as any).event as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
  });

  test('shows copy button and tooltip when a valid short URL is provided', () => {
    renderWithProviders(<ShortUrl />, {
      preloadedState: {
        uiInfo: { dialogParams: { shortUrl: 'https://example.com', errorDetails: null } },
        params: { queryString: 'https://public-url.example.com', searchString: 'search' },
        routeInfo: { name: 'My Route', distanceInKm: 10 }
      }
    });

    expect(screen.getByRole('textbox')).toHaveValue('https://example.com');
    expect(screen.getByRole('button')).toBeTruthy();
    expect(mockShow).toHaveBeenCalledWith(expect.objectContaining({ message: 'Click clipboard icon to copy short URL' }));
  });

  test('dispatches shortenUrl when the shortUrl input is clicked and publicUrl exists', async () => {
    renderWithProviders(<ShortUrl />, {
      preloadedState: {
        uiInfo: { dialogParams: { shortUrl: 'https://example.com', errorDetails: null } },
        params: { queryString: 'https://public-url.example.com', searchString: '' },
        routeInfo: { name: 'My Route', distanceInKm: 0 }
      }
    });

    fireEvent.click(screen.getByRole('textbox'));

    await waitFor(() => {
      expect(mockShortenUrl).toHaveBeenCalledWith('https://public-url.example.com', 'My Route');
    });
  });

  test('copies the short URL to the clipboard when the copy button is clicked', async () => {
    renderWithProviders(<ShortUrl />, {
      preloadedState: {
        uiInfo: { dialogParams: { shortUrl: 'https://example.com', errorDetails: null } },
        params: { queryString: 'https://public-url.example.com', searchString: 'search' },
        routeInfo: { name: 'My Route', distanceInKm: 10 }
      }
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]).toBe('https://example.com');
      expect(mockShow).toHaveBeenCalledWith(expect.objectContaining({ message: 'Short URL copied' }));
      expect(mockReactGaEvent).toHaveBeenCalledWith('share', { item_id: 'https://example.com' });
    });
  });

  test('renders an error notification when searchString, distance, and errorDetails are present', () => {
    renderWithProviders(<ShortUrl />, {
      preloadedState: {
        uiInfo: { dialogParams: { shortUrl: 'https://example.com', errorDetails: 'Strava error' } },
        params: { queryString: 'https://public-url.example.com', searchString: 'has search' },
        routeInfo: { name: 'My Route', distanceInKm: 5 }
      }
    });

    expect(screen.getByText('Strava error')).toBeInTheDocument();
  });
});
