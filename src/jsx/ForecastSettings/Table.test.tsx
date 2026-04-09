// src/jsx/ForecastSettings/Table.test.tsx
import React from 'react';
import { render, screen, cleanup, fireEvent } from 'test-utils';
import { Table } from './Table';

describe('Table component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const makeProps = (onCellValueChanged = jest.fn()) => {
    const columns = [
      {
        name: 'name',
        render: 'Name',
        editable: true,
        valueTransformFunction: (v: string) => v.toUpperCase(),
        editTransformFunction: (v: string) => `edit_${v}`,
        editCompleteFunction: (v: string) => `complete_${v}`,
        editValidateFunction: (v: string) => v !== 'bad'
      },
      {
        name: 'age',
        render: 'Age',
        editable: true,
        valueTransformFunction: (v: string) => `Age:${v}`
      },
      {
        name: 'notes',
        render: 'Notes',
        editable: false
      }
    ];

    const rows = [
      { name: '', age: '30', notes: 'x' },
      { name: 'Alice', age: '40', notes: 'y' }
    ];

    return {
      data: { columns, rows },
      onCellValueChanged
    };
  };

  test('renders headers and transformed cell values', () => {
    render(<Table {...makeProps()} />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Age')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();

    expect(screen.getByText('Age:30')).toBeTruthy();
    expect(screen.getByText('Age:40')).toBeTruthy();
    expect(screen.getByText('x')).toBeTruthy();
    expect(screen.getByText('y')).toBeTruthy();
    // name for second row should be uppercased
    expect(screen.getByText('ALICE')).toBeTruthy();
  });

  test('clicking an editable cell opens input and committing calls onCellValueChanged', async () => {
    const onCellValueChanged = jest.fn();
    const props = makeProps(onCellValueChanged);
    // Ensure no auto-focus on mount by providing a non-empty name for first row
    props.data.rows = [ { name: 'Bob', age: '30', notes: 'x' }, { name: 'Alice', age: '40', notes: 'y' } ];
    render(<Table {...props} />);

    const ageCell = screen.getAllByText('Age:30')[0];
    fireEvent.click(ageCell);

    const input = await screen.findByDisplayValue('30') as HTMLInputElement;
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: '35' } });
    fireEvent.blur(input);

    expect(onCellValueChanged).toHaveBeenCalledTimes(1);
    expect(onCellValueChanged).toHaveBeenCalledWith(0, 'age', '35');
  });

  test('validation prevents invalid edit and onCellValueChanged receives original value with editComplete applied', async () => {
    const onCellValueChanged = jest.fn();
    const props = makeProps(onCellValueChanged);
    // Avoid auto-focus by ensuring first row has a non-empty name
    props.data.rows = [ { name: 'Bob', age: '30', notes: 'x' }, { name: 'Alice', age: '40', notes: 'y' } ];
    render(<Table {...props} />);

    const nameCell = screen.getByText('ALICE');
    fireEvent.click(nameCell);

    const input = await screen.findByDisplayValue('edit_Alice') as HTMLInputElement;
    expect(input).toBeTruthy();

    // Attempt to change to invalid value 'bad' -> validation rejects it so input value should remain unchanged
    fireEvent.change(input, { target: { value: 'bad' } });
    expect((input as HTMLInputElement).value).toBe('edit_Alice');

    fireEvent.blur(input);

    // editCompleteFunction prefixes 'complete_'
    expect(onCellValueChanged).toHaveBeenCalledWith(1, 'name', 'complete_edit_Alice');
  });

  test('clearing input results in sentinel "-----" passed to editCompleteFunction', async () => {
    const onCellValueChanged = jest.fn();
    render(<Table {...makeProps(onCellValueChanged)} />);

    // The empty name cell should auto-focus and begin editing on mount
    const input = await screen.findByDisplayValue('edit_') as HTMLInputElement;
    expect(input).toBeTruthy();

    // Clear input to empty string
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    fireEvent.blur(input);

    // Editing empty string should result in '-----' being passed through editCompleteFunction
    expect(onCellValueChanged).toHaveBeenCalledWith(0, 'name', 'complete_-----');
  });

  test('clicking non-editable cell does not open an input', () => {
    render(<Table {...makeProps()} />);

    const before = screen.queryAllByRole('textbox').length;

    const notesCell = screen.getByText('x');
    fireEvent.click(notesCell);

    // No new input should appear (textbox count unchanged)
    expect(screen.queryAllByRole('textbox').length).toBe(before);
  });

  test('tabIndex is 0 for editable columns and -1 for non-editable', () => {
    render(<Table {...makeProps()} />);

    const ageCell = screen.getByText('Age:30');
    const notesCell = screen.getByText('x');

    expect(ageCell.getAttribute('tabindex')).toBe('0');
    expect(notesCell.getAttribute('tabindex')).toBe('-1');
  });
});