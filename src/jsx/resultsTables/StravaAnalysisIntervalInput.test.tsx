import React from 'react';
import { fireEvent, renderWithProviders, screen } from 'test-utils';
import StravaAnalysisIntervalInput from './StravaAnalysisIntervalInput';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  createReduxEnhancer: jest.fn(() => (createStore: any) => createStore)
}));

jest.mock('@mantine/core', () => {
  const actual = jest.requireActual('@mantine/core');
  const OptionContext = React.createContext<(value: string) => void>(() => {});
  const Combobox = ({ children, onOptionSubmit }: any) => (
    <OptionContext.Provider value={onOptionSubmit}>
      <div>{children}</div>
    </OptionContext.Provider>
  );
  Combobox.Target = ({ children }: any) => <div>{children}</div>;
  Combobox.Dropdown = ({ children }: any) => <div>{children}</div>;
  Combobox.Options = ({ children }: any) => <div>{children}</div>;
  Combobox.Option = ({ children, value }: any) => {
    const onOptionSubmit = React.useContext(OptionContext);
    return <button type="button" onClick={() => onOptionSubmit(value)}>{children}</button>;
  };
  Combobox.Chevron = () => null;
  return {
    ...actual,
    Combobox,
    useCombobox: () => ({
      toggleDropdown: jest.fn(),
      closeDropdown: jest.fn()
    })
  };
});

describe('StravaAnalysisIntervalInput', () => {
  it('renders the current interval and updates it when an option is selected', () => {
    const { store } = renderWithProviders(<StravaAnalysisIntervalInput />, {
      preloadedState: {
        strava: {
          analysisInterval: 1,
          activity: '',
          route: '',
          access_token: null,
          refresh_token: null,
          expires_at: null,
          fetching: false,
          activityData: null,
          activityStream: null,
          subrange: []
        }
      }
    });

    expect(screen.getByText('Analysis Interval')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '1 analysis.interval' })[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2 analysis.intervals' }));

    expect(store.getState().strava.analysisInterval).toBe(2);
    expect(screen.getByRole('button', { name: '2 analysis.interval' })).toBeInTheDocument();
  });
});
