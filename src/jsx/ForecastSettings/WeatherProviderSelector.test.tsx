// src/jsx/ForecastSettings/WeatherProviderSelector.test.tsx
import { render, fireEvent } from 'test-utils';
import { describe, beforeEach, jest, test, expect } from '@jest/globals';
import Cookies from 'universal-cookie';

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
// Mock actions to avoid importing ESM-heavy modules
jest.mock('../../redux/actions', () => ({
  __esModule: true,
  setWeatherProvider: jest.fn()
}));

// Mocks
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: jest.fn()
}));

// DesktopTooltip test wrapper
jest.mock('../shared/DesktopTooltip', () => ({
  __esModule: true,
  DesktopTooltip: ({ children, label }: any) => (
    <div data-testid="desktop-tooltip" data-label={label}>{children}</div>
  )
}));

jest.mock('../../utils/useForecastRequestData', () => ({
  __esModule: true,
  useForecastRequestData: jest.fn()
}));

jest.mock('../../utils/hooks', () => ({
  __esModule: true,
  useAppSelector: jest.fn()
}));

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: { event: jest.fn() }
}));


import { useTranslation } from 'react-i18next';
import { useForecastRequestData } from '../../utils/useForecastRequestData';
import { useAppSelector } from '../../utils/hooks';
import ReactGA from 'react-ga4';
import { providerValues } from '../../redux/providerValues';
import { WeatherProviderSelector } from './WeatherProviderSelector';

describe('WeatherProviderSelector', () => {
  const mockedUseTranslation = useTranslation as unknown as jest.Mock;
  const mockedUseForecast = useForecastRequestData as unknown as jest.Mock;
  const mockedUseAppSelector = useAppSelector as unknown as jest.Mock;
  const mockedGA = ReactGA as unknown as { event: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTranslation.mockReturnValue({ t: (k: any) => k });
    // default: allow most providers
    mockedUseForecast.mockReturnValue({ length: 10, daysInFuture: 2 });
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { country: 'US' } }));
  });

  test('renders selected provider name and tooltip label', () => {
    const mockSet = jest.fn();
    const { container, getByTestId } = render(
      <WeatherProviderSelector weatherProvider={'oneCall'} setWeatherProvider={mockSet} />
    );

    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe(providerValues['oneCall'].name);

    const tooltip = getByTestId('desktop-tooltip');
    expect(tooltip.getAttribute('data-label')).toBe('tooltips.provider');
  });

  test('clicking option triggers GA event, saves cookie, and calls setWeatherProvider', () => {
    const mockSet = jest.fn();
    const { container, getByText } = render(
      <WeatherProviderSelector weatherProvider={'oneCall'} setWeatherProvider={mockSet} />
    );

    // open dropdown
    const btn = container.querySelector('button')!;
    fireEvent.click(btn);

    const targetName = providerValues['openMeteo'].name;
    const option = getByText(targetName);
    fireEvent.click(option);

    expect(mockedGA.event).toHaveBeenCalledWith('unlock_achievement', { achievement_id: 'openMeteo' });
    expect(mCookie.set).toHaveBeenCalledWith('provider', 'openMeteo', { path: '/' });
    expect(mockSet).toHaveBeenCalledWith('openMeteo');
  });

  test('filters out US-only provider when country is not US and corrects weatherProvider prop', () => {
    // country not US
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { country: 'CA' } }));
    // forecast that allows providers based on days
    mockedUseForecast.mockReturnValue({ length: 10, daysInFuture: 2 });

    const mockSet = jest.fn();
    render(<WeatherProviderSelector weatherProvider={'nws'} setWeatherProvider={mockSet} />);

    // ensure setWeatherProvider called during render to correct to first allowed provider (not 'nws')
    expect(mockSet).toHaveBeenCalled();
    const country: string = 'CA';
    const firstAllowed = Object.entries(providerValues)
      .filter((entry) => entry[1].maxCallsPerHour === undefined || entry[1].maxCallsPerHour > 10)
      .filter((entry) => entry[1].max_days >= 2)
      .filter((entry) => !entry[1].usOnly || country === 'US')
      .map(e => e[0])[0];

    // when country is CA, usOnly providers are filtered, so firstAllowed would be 'openMeteo'
    expect(firstAllowed).toBe('openMeteo');
    // setWeatherProvider should have been called with that key
    expect(mockSet).toHaveBeenCalledWith('openMeteo');
  });

  test('when all providers are filtered out, setWeatherProvider called with defaultProvider', () => {
    mockedUseForecast.mockReturnValue({ length: 9999, daysInFuture: 9999 });
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { country: 'US' } }));
    const mockSet = jest.fn();
    render(<WeatherProviderSelector weatherProvider={'nws'} setWeatherProvider={mockSet} />);

    expect(mockSet).toHaveBeenCalledWith(require('../../redux/providerValues').defaultProvider);
  });
});
