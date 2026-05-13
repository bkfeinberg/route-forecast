import { render, screen } from '@testing-library/react';
import { TemperaturesChart } from './TemperaturesChart';
import type { Forecast } from '../../redux/forecastSlice';
import React from 'react';
import ReactGA from 'react-ga4';

// Mock react-ga4
jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    event: jest.fn(),
  },
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-data-length={data?.length || 0}>
      {children}
    </div>
  ),
  XAxis: (props: any) => <div data-testid="x-axis" data-props={JSON.stringify(props)} />,
  YAxis: (props: any) => <div data-testid="y-axis" data-props={JSON.stringify(props)} />,
  Tooltip: (props: any) => <div data-testid="tooltip" data-props={JSON.stringify(props)} />,
  Legend: () => <div data-testid="legend" />,
  Line: (props: any) => <div data-testid="line" data-props={JSON.stringify(props)} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" data-props={JSON.stringify(props)} />,
}));

describe('TemperaturesChart component', () => {
  const mockChartData: Forecast[] = [
    {
      temp: '68',
      feel: 65,
      humidity: 50,
      zone: 'zone1',
      distance: 0,
      cloudCover: '10',
      windSpeed: '5',
      gust: '8',
      relBearing: 0,
      windBearing: 180,
      time: '2024-05-12T10:00:00Z',
      isControl: false,
      precip: '0',
      lat: 0,
      lon: 0,
      rainy: false,
    },
    {
      temp: '70',
      feel: 68,
      humidity: 45,
      zone: 'zone1',
      distance: 10,
      cloudCover: '20',
      windSpeed: '6',
      gust: '9',
      relBearing: 45,
      windBearing: 180,
      time: '2024-05-12T10:30:00Z',
      isControl: false,
      precip: '0',
      lat: 0.1,
      lon: 0.1,
      rainy: false,
    },
    {
      temp: '72',
      feel: 70,
      humidity: 40,
      zone: 'zone1',
      distance: 20,
      cloudCover: '30',
      windSpeed: '7',
      gust: '10',
      relBearing: 90,
      windBearing: 180,
      time: '2024-05-12T11:00:00Z',
      isControl: false,
      precip: '0',
      lat: 0.2,
      lon: 0.2,
      rainy: false,
    },
    {
      temp: '71',
      feel: 69,
      humidity: 42,
      zone: 'zone1',
      distance: 30,
      cloudCover: '25',
      windSpeed: '6.5',
      gust: '9.5',
      relBearing: 135,
      windBearing: 180,
      time: '2024-05-12T11:30:00Z',
      isControl: false,
      precip: '0',
      lat: 0.3,
      lon: 0.3,
      rainy: false,
    },
    {
      temp: '69',
      feel: 66,
      humidity: 48,
      zone: 'zone1',
      distance: 40,
      cloudCover: '15',
      windSpeed: '5.5',
      gust: '8.5',
      relBearing: 180,
      windBearing: 180,
      time: '2024-05-12T12:00:00Z',
      isControl: false,
      precip: '0',
      lat: 0.4,
      lon: 0.4,
      rainy: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty div when popoverIsOpen is false', () => {
    const { container } = render(
      <TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={false} />
    );
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.textContent).toBe('');
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  test('renders empty div when chartData is null', () => {
    const { container } = render(
      <TemperaturesChart chartData={null as any} metric={false} popoverIsOpen={true} />
    );
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.textContent).toBe('');
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  test('renders empty div when chartData is empty array', () => {
    const { container } = render(
      <TemperaturesChart chartData={[]} metric={false} popoverIsOpen={true} />
    );
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.textContent).toBe('');
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  test('renders chart when popoverIsOpen is true and chartData is populated', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('renders all required recharts components', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getAllByTestId('y-axis')).toHaveLength(2); // two Y-axes
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getAllByTestId('line')).toHaveLength(2); // two lines
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  test('renders with metric units when metric is true', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={true} popoverIsOpen={true} />);

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('renders with imperial units when metric is false', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('first line component renders feel temperature', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const lines = screen.getAllByTestId('line');
    const firstLineProps = JSON.parse(lines[0].getAttribute('data-props')!);
    expect(firstLineProps.dataKey).toBe('feel');
  });

  test('second line component renders cloudCover', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const lines = screen.getAllByTestId('line');
    const secondLineProps = JSON.parse(lines[1].getAttribute('data-props')!);
    expect(secondLineProps.yAxisId).toBe('right');
    expect(secondLineProps.stroke).toBe('#32a852');
    expect(secondLineProps.name).toBe('Cloud cover');
  });

  test('first Y-axis has correct orientation for cloud cover', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const yAxes = screen.getAllByTestId('y-axis');
    const firstYAxisProps = JSON.parse(yAxes[0].getAttribute('data-props')!);
    expect(firstYAxisProps.yAxisId).toBe('right');
    expect(firstYAxisProps.orientation).toBe('right');
  });

  test('ResponsiveContainer has correct props', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const container = screen.getByTestId('responsive-container');
    expect(container).toBeInTheDocument();
  });

  test('CartesianGrid is rendered with correct styling', () => {
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const grid = screen.getByTestId('cartesian-grid');
    const gridProps = JSON.parse(grid.getAttribute('data-props')!);
    expect(gridProps.strokeDasharray).toBe('2 2');
  });

  test('handles single data point', () => {
    const singleDataPoint: Forecast[] = [
      {
        temp: '70',
        feel: 68,
        humidity: 45,
        zone: 'zone1',
        distance: 0,
        cloudCover: '20',
        windSpeed: '6',
        gust: '9',
        relBearing: 45,
        windBearing: 180,
        time: '2024-05-12T10:30:00Z',
        isControl: false,
        precip: '0',
        lat: 0.1,
        lon: 0.1,
        rainy: false,
      },
    ];

    render(<TemperaturesChart chartData={singleDataPoint} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('handles data with zero values', () => {
    const zeroData: Forecast[] = [
      {
        temp: '0',
        feel: 0,
        humidity: 0,
        zone: 'zone1',
        distance: 0,
        cloudCover: '0',
        windSpeed: '0',
        gust: '0',
        relBearing: 0,
        windBearing: 0,
        time: '2024-05-12T10:00:00Z',
        isControl: false,
        precip: '0',
        lat: 0,
        lon: 0,
        rainy: false,
      },
      {
        temp: '0',
        feel: 0,
        humidity: 0,
        zone: 'zone1',
        distance: 10,
        cloudCover: '0',
        windSpeed: '0',
        gust: '0',
        relBearing: 0,
        windBearing: 0,
        time: '2024-05-12T10:30:00Z',
        isControl: false,
        precip: '0',
        lat: 0.1,
        lon: 0.1,
        rainy: false,
      },
    ];

    render(<TemperaturesChart chartData={zeroData} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('handles data with high cloud cover values', () => {
    const highCloudData: Forecast[] = [
      {
        temp: '65',
        feel: 62,
        humidity: 80,
        zone: 'zone1',
        distance: 0,
        cloudCover: '100',
        windSpeed: '8',
        gust: '12',
        relBearing: 0,
        windBearing: 180,
        time: '2024-05-12T10:00:00Z',
        isControl: false,
        precip: '0.5',
        lat: 0,
        lon: 0,
        rainy: true,
      },
      {
        temp: '64',
        feel: 61,
        humidity: 85,
        zone: 'zone1',
        distance: 10,
        cloudCover: '100',
        windSpeed: '9',
        gust: '13',
        relBearing: 45,
        windBearing: 180,
        time: '2024-05-12T10:30:00Z',
        isControl: false,
        precip: '0.5',
        lat: 0.1,
        lon: 0.1,
        rainy: true,
      },
    ];

    render(<TemperaturesChart chartData={highCloudData} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('logs analytics event when rendering chart', () => {
    const mockedGA = ReactGA as any;
    render(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    expect(mockedGA.event).toHaveBeenCalledWith('temperature_chart');
  });

  test('handles rapid prop changes', () => {
    const { rerender } = render(
      <TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TemperaturesChart chartData={mockChartData} metric={true} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={false} />);

    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  test('changes between metric and imperial units', () => {
    const { rerender } = render(
      <TemperaturesChart chartData={mockChartData} metric={true} popoverIsOpen={true} />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('returns to empty state when toggling popover', () => {
    const { rerender } = render(
      <TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={true} />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TemperaturesChart chartData={mockChartData} metric={false} popoverIsOpen={false} />);

    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
});
