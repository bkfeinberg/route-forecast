import React from 'react';
import { render, screen } from 'test-utils';
import { useAppSelector } from '../../utils/hooks';
import { RouteTitle } from './RouteTitle';

jest.mock('react-responsive', () => {
  return {
    __esModule: true,
    useMediaQuery: jest.fn()
  };
});

jest.mock('../../utils/hooks', () => ({
  __esModule: true,
  useAppSelector: jest.fn(),
}));

import { useMediaQuery } from 'react-responsive';

const mockedUseAppSelector = jest.mocked(useAppSelector);
const mockedUseMediaQuery = jest.mocked(useMediaQuery);

describe('RouteTitle', () => {
  beforeEach(() => {
    mockedUseAppSelector.mockReset();
    mockedUseMediaQuery.mockReset();
  });

  test('renders route name from routeInfo', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(false);

    render(<RouteTitle />);
    expect(screen.getByText('Test Route')).toBeInTheDocument();
  });

  test('renders route name from strava activity data when routeInfo name is null', () => {
    mockedUseAppSelector.mockReturnValue('Strava Route');
    mockedUseMediaQuery.mockReturnValue(false);

    render(<RouteTitle />);
    expect(screen.getByText('Strava Route')).toBeInTheDocument();
  });

  test('sets font size to 20px when media query is true (width >= 1300px)', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(true);

    const { container } = render(<RouteTitle />);
    const div = container.querySelector('div');
    expect(div!.style.fontSize).toBe('20px');
  });

  test('sets font size to 15px when media query is false (width < 1300px)', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(false);

    const { container } = render(<RouteTitle />);
    const div = container.querySelector('div');
    expect(div!.style.fontSize).toBe('15px');
  });

  test('applies correct styling to the container div', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(false);

    const { container } = render(<RouteTitle />);
    const div = container.querySelector('div');
    
    expect(div!.style.fontStyle).toBe('oblique');
    expect(div!.style.color).toBe('rgba(64, 111, 140, 0.87)');
    expect(div!.style.height).toBe('60px');
    expect(div!.style.textAlign).toBe('left');
  });

  test('accepts and applies custom className prop', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(false);

    const { container } = render(<RouteTitle className="custom-class" />);
    const div = container.querySelector('div');
    
    expect(div).toHaveClass('custom-class');
  });

  test('accepts and applies custom style prop', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(false);

    const customStyle = { paddingLeft: '10px' };
    const { container } = render(<RouteTitle style={customStyle} />);
    const div = container.querySelector('div');
    
    expect(div!.style.paddingLeft).toBe('10px');
  });

  test('renders empty string when neither routeInfo nor strava have route names', () => {
    mockedUseAppSelector.mockReturnValue(null);
    mockedUseMediaQuery.mockReturnValue(false);

    const { container } = render(<RouteTitle />);
    const div = container.querySelector('div');
    
    expect(div!.textContent).toBe('');
  });

  test('queries media query for minimum width of 1300px', () => {
    mockedUseAppSelector.mockReturnValue('Test Route');
    mockedUseMediaQuery.mockReturnValue(false);

    render(<RouteTitle />);
    
    expect(mockedUseMediaQuery).toHaveBeenCalledWith({ query: '(min-width: 1300px)' });
  });
});
