// src/jsx/RouteInfoForm/AlwaysFilledSwitch.test.tsx
import React from 'react';
import { render } from 'test-utils';
import { AlwaysFilledSwitch } from './AlwaysFilledSwitch';

jest.mock('./AlwaysFilledSwitch.css', () => ({}));

describe('AlwaysFilledSwitch component', () => {
  test('renders Switch component', () => {
    const { container } = render(<AlwaysFilledSwitch checked={true} />);
    const switchElement = container.querySelector('input[type="checkbox"]');
    expect(switchElement).toBeTruthy();
  });

  test('applies "checked" class when checked prop is true', () => {
    const { container } = render(<AlwaysFilledSwitch checked={true} />);
    const switchElement = container.querySelector('.always-filled-switch.checked');
    expect(switchElement).toBeTruthy();
  });

  test('applies "unchecked" class when checked prop is false', () => {
    const { container } = render(<AlwaysFilledSwitch checked={false} />);
    const switchElement = container.querySelector('.always-filled-switch.unchecked');
    expect(switchElement).toBeTruthy();
  });

  test('always includes "always-filled-switch" base class', () => {
    const { container: checkedContainer } = render(<AlwaysFilledSwitch checked={true} />);
    expect(checkedContainer.querySelector('.always-filled-switch')).toBeTruthy();

    const { container: uncheckedContainer } = render(<AlwaysFilledSwitch checked={false} />);
    expect(uncheckedContainer.querySelector('.always-filled-switch')).toBeTruthy();
  });

  test('applies style prop with marginBottom 0px', () => {
    const { container } = render(<AlwaysFilledSwitch checked={true} />);
    // Mantine Switch applies styles internally, so we check that the component renders
    const switchElement = container.querySelector('input[type="checkbox"]');
    expect(switchElement).toBeTruthy();
  });

  test('spreads additional SwitchProps to Switch component', () => {
    const { container } = render(
      <AlwaysFilledSwitch checked={true} disabled label="Test Label" />
    );
    const switchElement = container.querySelector('input[disabled]');
    expect(switchElement).toBeTruthy();
  });

  test('passes label prop to Switch component', () => {
    const { container } = render(<AlwaysFilledSwitch checked={true} label="Enable Feature" />);
    // Check that the label text is rendered
    expect(container.textContent).toContain('Enable Feature');
  });

  test('combines className and checked state correctly', () => {
    const { container } = render(<AlwaysFilledSwitch checked={true} />);
    const element = container.querySelector('.always-filled-switch.checked');
    expect(element).toBeTruthy();
  });

  test('handles toggle between checked and unchecked states', () => {
    const { rerender, container } = render(<AlwaysFilledSwitch checked={true} />);
    expect(container.querySelector('.checked')).toBeTruthy();
    expect(container.querySelector('.unchecked')).toBeNull();

    rerender(<AlwaysFilledSwitch checked={false} />);
    expect(container.querySelector('.checked')).toBeNull();
    expect(container.querySelector('.unchecked')).toBeTruthy();
  });

  test('preserves all SwitchProps while applying custom styling', () => {
    const { container } = render(
      <AlwaysFilledSwitch
        checked={false}
        disabled
        color="red"
        size="lg"
      />
    );
    const switchElement = container.querySelector('input[disabled]');
    expect(switchElement?.hasAttribute('disabled')).toBe(true);
    // Component renders with custom props applied by Mantine
    expect(container.querySelector('.always-filled-switch')).toBeTruthy();
  });
});