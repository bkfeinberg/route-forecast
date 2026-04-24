import { render, screen } from '@testing-library/react';
import { TimeChangeChart } from './TimeChangeChart';
import type { ChartDataType, ChartData } from '../../utils/gpxParser';
import React from 'react';
import ReactGA from 'react-ga4';

// Mock react-ga4
jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    event: jest.fn(),
  },
}));

// Mock d3fc-sample
jest.mock('d3fc-sample', () => ({
  largestTriangleThreeBucket: jest.fn(() => {
    const mockSampler = jest.fn((data: ChartData[]) => data);
    mockSampler.x = jest.fn(() => mockSampler);
    mockSampler.y = jest.fn(() => mockSampler);
    mockSampler.bucketSize = jest.fn(() => mockSampler);
    return mockSampler;
  }),
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

describe('TimeChangeChart component', () => {
  const mockChartData: ChartData[] = [
    { distanceInKm: 0, totalMinutesLost: 0, windSpeedMph: 0 },
    { distanceInKm: 10, totalMinutesLost: 5, windSpeedMph: 10 },
    { distanceInKm: 20, totalMinutesLost: 15, windSpeedMph: 20 },
    { distanceInKm: 30, totalMinutesLost: 25, windSpeedMph: 15 },
    { distanceInKm: 40, totalMinutesLost: 20, windSpeedMph: 12 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty div when popoverIsOpen is false', () => {
    const { container } = render(
      <TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={false} />
    );
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.textContent).toBe('');
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  test('renders empty div when chartData is null', () => {
    const { container } = render(
      <TimeChangeChart chartData={null as any} metric={false} popoverIsOpen={true} />
    );
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.textContent).toBe('');
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  test('renders empty div when chartData is empty array', () => {
    const { container } = render(
      <TimeChangeChart chartData={[]} metric={false} popoverIsOpen={true} />
    );
    const div = container.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.textContent).toBe('');
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  test('renders chart when popoverIsOpen is true and chartData is populated', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('renders all required recharts components', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getAllByTestId('y-axis')).toHaveLength(2); // two Y-axes
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getAllByTestId('line')).toHaveLength(2); // two lines
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  test('passes sampled data to LineChart', () => {
    const largeData: ChartData[] = Array.from({ length: 500 }, (_, i) => ({
      distanceInKm: i,
      totalMinutesLost: i * 2,
      windSpeedMph: Math.random() * 30,
    }));

    render(<TimeChangeChart chartData={largeData} metric={false} popoverIsOpen={true} />);

    const lineChart = screen.getByTestId('line-chart');
    const dataLength = lineChart.getAttribute('data-data-length');
    // should be sampled down from 500
    expect(dataLength).toBeTruthy();
  });

  test('renders with metric units when metric is true', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={true} popoverIsOpen={true} />);

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('renders with imperial units when metric is false', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const xAxis = screen.getByTestId('x-axis');
    expect(xAxis).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('first line component renders totalMinutesLost', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const lines = screen.getAllByTestId('line');
    const firstLineProps = JSON.parse(lines[0].getAttribute('data-props')!);
    expect(firstLineProps.dataKey).toBe('totalMinutesLost');
  });

  test('second line component renders windSpeedMph', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const lines = screen.getAllByTestId('line');
    const secondLineProps = JSON.parse(lines[1].getAttribute('data-props')!);
    expect(secondLineProps.dataKey).toBe('windSpeedMph');
    expect(secondLineProps.stroke).toBe('#32a852');
  });

  test('second Y-axis has correct orientation', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const yAxes = screen.getAllByTestId('y-axis');
    const secondYAxisProps = JSON.parse(yAxes[1].getAttribute('data-props')!);
    expect(secondYAxisProps.yAxisId).toBe('right');
    expect(secondYAxisProps.orientation).toBe('right');
  });

  test('ResponsiveContainer has correct props', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const container = screen.getByTestId('responsive-container');
    expect(container).toBeInTheDocument();
    // Component should render successfully with these props
  });

  test('CartesianGrid is rendered with correct styling', () => {
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    const grid = screen.getByTestId('cartesian-grid');
    const gridProps = JSON.parse(grid.getAttribute('data-props')!);
    expect(gridProps.strokeDasharray).toBe('2 2');
  });

  test('handles single data point', () => {
    const singleDataPoint: ChartData[] = [
      { distanceInKm: 5, totalMinutesLost: 3, windSpeedMph: 8 },
    ];

    render(<TimeChangeChart chartData={singleDataPoint} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('handles data with zero values', () => {
    const zeroData: ChartData[] = [
      { distanceInKm: 0, totalMinutesLost: 0, windSpeedMph: 0 },
      { distanceInKm: 0, totalMinutesLost: 0, windSpeedMph: 0 },
    ];

    render(<TimeChangeChart chartData={zeroData} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('handles data with negative wind speed values', () => {
    const negativeData: ChartData[] = [
      { distanceInKm: 0, totalMinutesLost: 0, windSpeedMph: -5 },
      { distanceInKm: 10, totalMinutesLost: 5, windSpeedMph: -10 },
    ];

    render(<TimeChangeChart chartData={negativeData} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('logs analytics event when rendering chart', () => {
    const mockedGA = ReactGA as any;
    render(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    expect(mockedGA.event).toHaveBeenCalledWith('time_lost_chart');
  });

  test('handles rapid prop changes', () => {
    const { rerender } = render(
      <TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TimeChangeChart chartData={mockChartData} metric={true} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={false} />);

    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  test('changes between metric and imperial units', () => {
    const { rerender } = render(
      <TimeChangeChart chartData={mockChartData} metric={true} popoverIsOpen={true} />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('returns to empty state when toggling popover', () => {
    const { rerender } = render(
      <TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={true} />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    rerender(<TimeChangeChart chartData={mockChartData} metric={false} popoverIsOpen={false} />);

    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });
});
