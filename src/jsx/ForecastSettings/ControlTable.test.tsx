import { fireEvent, screen } from '@testing-library/react';
import {renderWithProviders} from '../../utils/test-utils';

import { ControlTable } from './ControlTable';

jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      t: (i18nKey: string) => i18nKey,
      // or with TypeScript:
      //t: (i18nKey: string) => i18nKey,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    };
  },
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  }
}));
  
describe('ControlTable', () => {

  beforeEach(() => {
    jest.clearAllMocks();

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
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
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

    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[0]);

    expect(store.getState().controls.userControlPoints).toEqual([
      { name: 'Control 2', distance: 20, duration: 60, arrival: '11:00', banked: 10 }
    ]);
  });

  test('updates control value on cell edit', () => {
    const { store } = renderWithProviders(<ControlTable />, {
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

    const controlNameCell = screen.getByText('Control 1');
    fireEvent.click(controlNameCell); // Enter edit mode
    const editableInput = screen.getByDisplayValue('Control 1');
    fireEvent.change(editableInput, { target: { value: 'Updated Control' } });

    fireEvent.blur(editableInput); // Exit edit mode
    expect(store.getState().controls.userControlPoints[0]).toEqual({
      name: 'Updated Control',
      distance: 10,
      duration: 30,
      arrival: '10:00',
      banked: 5
    });

  });
});