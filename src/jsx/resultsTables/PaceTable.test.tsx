import React from 'react';
import { renderWithProviders, screen, fireEvent } from 'test-utils';
import PaceTable from './PaceTable';
import { useActualPace, useFormatSpeed } from '../../utils/hooks';
import stravaRouteParser from '../../utils/stravaRouteParser';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  ErrorBoundary: ({ children }: any) => <>{children}</>,
  createReduxEnhancer: jest.fn(() => (createStore: any) => createStore),
  metrics: { count: jest.fn() },
  startSpan: jest.fn(() => ({ finish: jest.fn() })),
  addBreadcrumb: jest.fn(),
  feedbackIntegration: jest.fn(),
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    fmt: jest.fn()
  }
}));

jest.mock('./StravaAnalysisIntervalInput', () => () => <div>Interval Input</div>);

jest.mock('../shared/ToggleButton', () => ({
  ToggleButton: ({ children, active, onClick }: any) => (
    <button type="button" data-active={String(active)} onClick={onClick}>
      {children}
    </button>
  )
}));

jest.mock('../../utils/hooks', () => ({
  useActualPace: jest.fn(),
  useFormatSpeed: jest.fn()
}));

jest.mock('../../utils/stravaRouteParser', () => ({
  __esModule: true,
  default: {
    findMovingAverages: jest.fn()
  }
}));

describe('PaceTable', () => {
  const mockedUseActualPace = useActualPace as jest.Mock;
  const mockedUseFormatSpeed = useFormatSpeed as jest.Mock;
  const mockedFindMovingAverages = stravaRouteParser.findMovingAverages as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseActualPace.mockReturnValue(6.5);
    mockedUseFormatSpeed.mockReturnValue((speed: number) => `${speed.toFixed(1)} mph`);
    mockedFindMovingAverages.mockReturnValue([
      {
        time: '08:00',
        pace: 6.5,
        alphaPace: 'A',
        distance: 10,
        climb: 25,
        start: 0,
        end: 10,
        stoppedTimeSeconds: 120
      },
      {
        time: '09:00',
        pace: 7.5,
        alphaPace: 'B',
        distance: 20,
        climb: 30,
        start: 10,
        end: 20,
        stoppedTimeSeconds: 60
      }
    ]);
  });

  it('returns null when required activity data is missing', () => {
    const { container } = renderWithProviders(<PaceTable />, {
      preloadedState: {
        strava: {
          activityData: null,
          activityStream: null,
          analysisInterval: 30,
          route: ''
        },
        forecast: {
          zoomToRange: false
        }
      }
    });

    expect(screen.queryByText(/analysis\.overallPace/i)).not.toBeInTheDocument();
    expect(container.querySelector('#paceSpan')).toBeNull();
  });

  it('renders pace rows and handles mouse and click interactions', () => {
    renderWithProviders(<PaceTable />, {
      preloadedState: {
        strava: {
          activityData: { id: 1 },
          activityStream: { id: 2 },
          analysisInterval: 30,
          route: ''
        },
        forecast: {
          zoomToRange: false
        }
      }
    });

    expect(screen.getByText(/analysis\.overallPace/i)).toBeInTheDocument();
    expect(screen.getAllByText('6.5 mph').length).toBeGreaterThan(0);
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();

    const firstRow = screen.getByText('08:00').closest('tr');
    expect(firstRow).not.toBeNull();

    fireEvent.mouseEnter(firstRow!);
    fireEvent.click(firstRow!);
    fireEvent.click(screen.getByText('buttons.zoomToSegment'));

    expect(mockedFindMovingAverages).toHaveBeenCalledWith({ id: 1 }, { id: 2 }, 30);
  });
});
