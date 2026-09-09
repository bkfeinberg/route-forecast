import React from 'react';
import { render, screen } from '@testing-library/react';
import { useApiIsLoaded } from '@vis.gl/react-google-maps';
import SafeMarker from './SafeMarker';

jest.mock('@vis.gl/react-google-maps', () => ({
  __esModule: true,
  AdvancedMarker: ({ children, title }: any) => (
    <div data-testid="advanced-marker" title={title}>
      {children}
    </div>
  ),
  CollisionBehavior: {
    OPTIONAL_AND_HIDES_LOWER_PRIORITY: 'optional',
    REQUIRED_AND_HIDES_OPTIONAL: 'required'
  },
  useApiIsLoaded: jest.fn()
}));

describe('SafeMarker', () => {
  const mockedUseApiIsLoaded = useApiIsLoaded as jest.Mock;

  beforeEach(() => {
    mockedUseApiIsLoaded.mockReset();
  });

  it('renders a placeholder until the Google Maps API finishes loading', () => {
    mockedUseApiIsLoaded.mockReturnValue(false);

    render(
      <SafeMarker position={{ lat: 40.7128, lng: -74.006 }} title="Test marker" />
    );

    expect(screen.getByText('API not yet loaded')).toBeInTheDocument();
  });

  it('renders the Google AdvancedMarker once the API has loaded', () => {
    mockedUseApiIsLoaded.mockReturnValue(true);

    render(
      <SafeMarker
        position={{ lat: 40.7128, lng: -74.006 }}
        title="Test marker"
      >
        <span>Marker content</span>
      </SafeMarker>
    );

    expect(screen.getByTestId('advanced-marker')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-marker')).toHaveTextContent('Marker content');
    expect(screen.getByTestId('advanced-marker')).toHaveAttribute('title', 'Test marker');
  });
});
