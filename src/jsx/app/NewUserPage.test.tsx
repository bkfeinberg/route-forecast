import React from 'react';
import { renderWithProviders, screen } from 'test-utils';
import NewUserPage from './NewUserPage';
import { useAppSelector } from '../../utils/hooks';
import ReactGA from 'react-ga4';

jest.mock('../../utils/hooks', () => ({
  __esModule: true,
  useAppSelector: jest.fn(),
}));

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    event: jest.fn(),
  },
}));

const mockedReactGA = jest.mocked(ReactGA);

jest.mock('../../jsx/ForecastSettings/DateSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="date-select" />,
}));

jest.mock('../../jsx/ForecastSettings/RidingPace', () => ({
  __esModule: true,
  default: () => <div data-testid="riding-pace" />,
}));

jest.mock('../../jsx/DesktopUI', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-ui" />,
}));

jest.mock('../../jsx/MobileUI', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-ui" />,
}));

const mockedUseAppSelector = jest.mocked(useAppSelector);;

describe('NewUserPage', () => {
  beforeEach(() => {
    mockedUseAppSelector.mockReset();
    mockedReactGA.event.mockReset();
  });

  test('renders the initial welcome page when no date or pace is selected', () => {
    mockedUseAppSelector
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    renderWithProviders(
      <NewUserPage
        isLandscape={true}
        isLargeEnough={true}
        mapsApiKey="test-key"
        orientationChanged={false}
        setOrientationChanged={jest.fn()}
      />
    );

    expect(screen.getByText(/Randoplan/i)).toBeInTheDocument();
    expect(screen.getByText(/When does your ride start/i)).toBeInTheDocument();
    expect(screen.getByTestId('date-select')).toBeInTheDocument();
    expect(screen.queryByTestId('riding-pace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('desktop-ui')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-ui')).not.toBeInTheDocument();
    expect(mockedReactGA.event).not.toHaveBeenCalled();
  });

  test('renders the pace picker after date is selected and before pace is selected', () => {
    mockedUseAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    renderWithProviders(
      <NewUserPage
        isLandscape={true}
        isLargeEnough={true}
        mapsApiKey="test-key"
        orientationChanged={false}
        setOrientationChanged={jest.fn()}
      />
    );

    expect(screen.getByText(/How fast do you expect to ride/i)).toBeInTheDocument();
    expect(screen.getByTestId('riding-pace')).toBeInTheDocument();
    expect(screen.queryByTestId('date-select')).not.toBeInTheDocument();
    expect(mockedReactGA.event).toHaveBeenCalledWith('new_user_date_only');
  });

  test('renders the real UI after both date and pace are selected', () => {
    mockedUseAppSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);

    renderWithProviders(
      <NewUserPage
        isLandscape={true}
        isLargeEnough={true}
        mapsApiKey="test-key"
        orientationChanged={false}
        setOrientationChanged={jest.fn()}
      />
    );
    expect(screen.getByTestId('desktop-ui')).toBeInTheDocument();
    expect(screen.queryByText(/Randoplan/i)).not.toBeInTheDocument();
    expect(mockedReactGA.event).toHaveBeenCalledWith('new_user');
  });
});
