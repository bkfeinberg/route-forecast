// src/jsx/TopBar/TopBar.test.tsx
import React from 'react';
import { render, screen, cleanup } from 'test-utils';
import VersionContext from '../versionContext';

jest.mock('react-responsive', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => children,
    useMediaQuery: jest.fn()
  };
});

jest.mock('react-i18next', () => {
  return {
    __esModule: true,
    useTranslation: jest.fn()
  };
});

jest.mock('../../utils/forecastValuesHook', () => {
  return {
    __esModule: true,
    useForecastDependentValues: jest.fn()
  };
});

jest.mock('../DesktopUI', () => {
  return {
    __esModule: true,
    useLoadingFromURLStatus: jest.fn()
  };
});

jest.mock('../../utils/hooks', () => {
  return {
    __esModule: true,
    usePreviousPersistent: jest.fn(),
    useReusableDelay: jest.fn(),
    useValueHasChanged: jest.fn()
  };
});

// Stub child components used by TopBar
jest.mock('../shared/RouteTitle', () => {
  return {
    __esModule: true,
    RouteTitle: (props: any) => <div data-testid="route-title" {...props}>RouteTitle</div>
  };
});
jest.mock('./BugReportButton', () => {
  return {
    __esModule: true,
    __esDefault: true,
    default: () => <div data-testid="bug-report">BugReport</div>
  };
});
jest.mock('./DonationRequest', () => {
  return {
    __esModule: true,
    __esDefault: true,
    default: (props: any) => <div data-testid="donation-request">{props.wacky ? 'DonationWacky' : 'Donation'}</div>
  };
});
jest.mock('./ShortUrl', () => {
  return {
    __esModule: true,
    __esDefault: true,
    default: () => <div data-testid="short-url">ShortUrl</div>
  };
});
jest.mock('./FaqButton', () => {
  return {
    __esModule: true,
    __esDefault: true,
    default: () => <div data-testid="faq-button">Faq</div>
  };
});

import { useMediaQuery } from 'react-responsive';
import { useTranslation } from 'react-i18next';
import { useForecastDependentValues } from '../../utils/forecastValuesHook';
import { useLoadingFromURLStatus } from '../DesktopUI';
import { usePreviousPersistent, useReusableDelay, useValueHasChanged } from '../../utils/hooks';
import {TopBar} from './TopBar';

describe('TopBar component', () => {
  const mockedUseMediaQuery = useMediaQuery as unknown as jest.Mock;
  const mockedUseTranslation = useTranslation as unknown as jest.Mock;
  const mockedForecast = useForecastDependentValues as unknown as jest.Mock;
  const mockedLoadingStatus = useLoadingFromURLStatus as unknown as jest.Mock;
  const mockedPrev = usePreviousPersistent as unknown as jest.Mock;
  const mockedDelay = useReusableDelay as unknown as jest.Mock;
  const mockedChanged = useValueHasChanged as unknown as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    // Default translation returns key
    mockedUseTranslation.mockReturnValue({ t: (k: string) => k });
    // Default forecast finish time
    mockedForecast.mockReturnValue({ finishTime: 'Predicted 12:34' });
    // Default: loading started, not finished, display content true
    mockedLoadingStatus.mockReturnValue([true, false, true]);
    // Default hooks for TopBarItem: not previously visible, valueHasChanged false, reusable delay not finished
    mockedPrev.mockReturnValue(false);
    mockedChanged.mockReturnValue(false);
    mockedDelay.mockReturnValue([false]);
    // Default media queries: all false
    mockedUseMediaQuery.mockImplementation((opts: any) => false);
  });

  afterEach(() => {
    cleanup();
  });

  test('renders NonexistentLogo with version from VersionContext', () => {
    render(
      <VersionContext.Provider value={"1.2.3"}>
        <TopBar sidePaneOptions={['A','B']} activeSidePane={0} setActiveSidePane={() => {}} sidebarWidth={200} panesVisible={new Set(['A','B'])} />
      </VersionContext.Provider>
    );
    expect(screen.getByText(/Randoplan v1.2.3/)).toBeTruthy();
  });

  test('renders translated data.summary text', () => {
    mockedUseTranslation.mockReturnValue({ t: (k: string) => (k === 'data.summary' ? 'SummaryLabel' : k) });
    render(
      <VersionContext.Provider value={"0.0.0"}>
        <TopBar sidePaneOptions={['X']} activeSidePane={0} setActiveSidePane={() => {}} sidebarWidth={150} panesVisible={new Set(['X'])} />
      </VersionContext.Provider>
    );
    expect(screen.getByText('SummaryLabel')).toBeTruthy();
  });

  test('renders sidePaneOptions when displayContent is true', () => {
    mockedLoadingStatus.mockReturnValue([true, false, true]); // displayContent true
    render(
      <VersionContext.Provider value={"v"}>
        <TopBar sidePaneOptions={['One','Two']} activeSidePane={1} setActiveSidePane={() => {}} sidebarWidth={180} panesVisible={new Set(['One','Two'])} />
      </VersionContext.Provider>
    );
    expect(screen.getByText('One')).toBeTruthy();
    expect(screen.getByText('Two')).toBeTruthy();
  });

  test('does not render sidePaneOptions when displayContent is false', () => {
    mockedLoadingStatus.mockReturnValue([true, false, false]); // displayContent false
    render(
      <VersionContext.Provider value={"v"}>
        <TopBar sidePaneOptions={['Alpha','Beta']} activeSidePane={0} setActiveSidePane={() => {}} sidebarWidth={180} panesVisible={new Set(['Alpha','Beta'])} />
      </VersionContext.Provider>
    );
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  test('renders stacked TitleAndFinishTime when roomForFinishTime true and roomForTitle false', () => {
    // roomForFinishTime -> (min-width: 1000px) true
    // roomForTitle -> (min-width: 1650px) false
    mockedUseMediaQuery.mockImplementation((opts: any) => {
      const q = opts?.query;
      if (q === '(min-width: 1000px)') return true;
      if (q?.includes('1650px')) return false;
      // other queries default false
      return false;
    });
    render(
      <VersionContext.Provider value={"v"}>
        <TopBar sidePaneOptions={['P']} activeSidePane={0} setActiveSidePane={() => {}} sidebarWidth={150} panesVisible={new Set(['P'])} />
      </VersionContext.Provider>
    );
    expect(screen.getByText('Predicted 12:34')).toBeTruthy();
  });

  test('renders adjacent predicted finish time when roomForFinishTime and roomForTitle true', () => {
    mockedUseMediaQuery.mockImplementation((opts: any) => {
      const q = opts?.query;
      if (q === '(min-width: 1000px)') return true;
      if (q?.includes('1650px')) return true;
      // other queries default false
      return false;
    });
    render(
      <VersionContext.Provider value={"v"}>
        <TopBar sidePaneOptions={['Z']} activeSidePane={0} setActiveSidePane={() => {}} sidebarWidth={150} panesVisible={new Set(['Z'])} />
      </VersionContext.Provider>
    );
    // finish time should still be present
    expect(screen.getByText('Predicted 12:34')).toBeTruthy();
  });

  test('includes BugReportButton, DonationRequest and ShortUrl according to layout', () => {
    // Ensure ShortUrl MediaQuery (default mock of MediaQuery component renders children) and other comps present
    render(
      <VersionContext.Provider value={"v"}>
        <TopBar sidePaneOptions={[]} activeSidePane={0} setActiveSidePane={() => {}} sidebarWidth={200} panesVisible={new Set()} />
      </VersionContext.Provider>
    );
    expect(screen.getByTestId('bug-report')).toBeTruthy();
    expect(screen.getByTestId('donation-request')).toBeTruthy();
    // ShortUrl wrapped in MediaQuery minWidth={1780} but our stub MediaQuery renders children always
    expect(screen.getByTestId('short-url')).toBeTruthy();
  });
});