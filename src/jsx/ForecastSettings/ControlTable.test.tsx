import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../utils/test-utils';
import { useActualArrivalTimes } from '../../utils/hooks';
import { useForecastDependentValues } from '../../utils/forecastValuesHook';

import { ControlTable } from './ControlTable';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (i18nKey: string) => i18nKey,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  }
}));

jest.mock('../../utils/forecastValuesHook', () => ({
  useForecastDependentValues: jest.fn(),
}));

jest.mock('../../utils/hooks', () => {
  const actual = jest.requireActual('../../utils/hooks');
  return {
    ...actual,
    useActualArrivalTimes: jest.fn(),
  };
});

jest.mock('./Table', () => ({
  Table: ({ data, onCellValueChanged }: { data: any; onCellValueChanged: (rowIndex: number, field: string, value: string | number) => void }) => (
    <div data-testid="mock-table">
      {data.columns.map((column: any) => (
        <div key={column.name}>{typeof column.render === 'string' ? column.render : column.render}</div>
      ))}
      {data.rows.map((row: any, rowIndex: number) => (
        <div key={rowIndex}>
          <span>{row.name}</span>
          <button data-testid={`delete-${rowIndex}`} onClick={() => row.delete.props.onClick()}>delete</button>
          <button onClick={() => onCellValueChanged(rowIndex, 'duration', 'abc')}>bad-duration</button>
          <button onClick={() => onCellValueChanged(rowIndex, 'distance', '12')}>distance</button>
        </div>
      ))}
    </div>
  )
}));

describe('ControlTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useForecastDependentValues as jest.Mock).mockReturnValue({ calculatedControlPointValues: null });
    (useActualArrivalTimes as jest.Mock).mockReturnValue(null);
  });

  test('renders table with controls', () => {
    renderWithProviders(<ControlTable />, {
      preloadedState: {
        controls: {
          displayBanked: true,
          controlOpenStatus: [],
          userControlPoints: [
            { name: 'Control 1', distance: 10, duration: 30, arrival: '10:00', banked: 5 },
            { name: 'Control 2', distance: 20, duration: 60, arrival: '11:00', banked: 10 }
          ]
        }
      }
    });

    expect(screen.getByText('Control 1')).toBeInTheDocument();
    expect(screen.getByText('Control 2')).toBeInTheDocument();
    expect(screen.getByTestId('mock-table')).toBeInTheDocument();
  });

  test('removes a control when delete button is clicked', () => {
    const { store } = renderWithProviders(<ControlTable />, {
      preloadedState: {
        controls: {
          displayBanked: true,
          displayControlTableUI: true,
          controlOpenStatus: [],
          userControlPoints: [
            { name: 'Control 1', distance: 10, duration: 30, arrival: '10:00', banked: 5 },
            { name: 'Control 2', distance: 20, duration: 60, arrival: '11:00', banked: 10 }
          ]
        }
      }
    });

    fireEvent.click(screen.getByTestId('delete-0'));

    expect(store.getState().controls.userControlPoints).toEqual([
      { name: 'Control 2', distance: 20, duration: 60, arrival: '11:00', banked: 10 }
    ]);
  });

  test('converts invalid duration edits to zero and includes actual-arrival columns when available', () => {
    (useForecastDependentValues as jest.Mock).mockReturnValue({
      calculatedControlPointValues: [{ distance: 10, arrival: '10:00' }]
    });
    (useActualArrivalTimes as jest.Mock).mockReturnValue([{ time: '10:15' }]);

    const { store } = renderWithProviders(<ControlTable />, {
      preloadedState: {
        controls: {
          displayBanked: false,
          metric: true,
          controlOpenStatus: [{ distance: 10, isOpen: false }],
          userControlPoints: [
            { name: 'Control 1', distance: 10, duration: 30, arrival: '10:00' }
          ]
        },
        strava: {
          activityData: { id: 123 },
          activityStream: []
        }
      }
    });

    expect(screen.getByText('Actual Arrival Time')).toBeInTheDocument();
    expect(screen.queryByText('Banked Time')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'bad-duration' }));

    expect(store.getState().controls.userControlPoints[0]).toEqual({
      name: 'Control 1',
      distance: 10,
      duration: 0,
      arrival: '10:00'
    });
  });

  test('sorts controls by distance when the distance header is clicked in metric mode', () => {
    const { store } = renderWithProviders(<ControlTable />, {
      preloadedState: {
        controls: {
          displayBanked: false,
          metric: true,
          controlOpenStatus: [],
          userControlPoints: [
            { name: 'Control 2', distance: 20, duration: 60, arrival: '11:00' },
            { name: 'Control 1', distance: 10, duration: 30, arrival: '10:00' }
          ]
        }
      }
    });

    fireEvent.click(screen.getByText('controls.distanceKilometers'));

    expect(store.getState().controls.userControlPoints).toEqual([
      { name: 'Control 1', distance: 10, duration: 30, arrival: '10:00', id: 0 },
      { name: 'Control 2', distance: 20, duration: 60, arrival: '11:00', id: 1 }
    ]);
  });
});