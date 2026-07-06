import React from 'react';
import { render, screen } from 'test-utils';
import ChunkErrorBoundary from './ChunkErrorBoundary';

describe('ChunkErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders children when there is no error', () => {
    render(
      <ChunkErrorBoundary>
        <div>safe content</div>
      </ChunkErrorBoundary>
    );

    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  test('shows a generic fallback for unexpected errors', () => {
    const Broken = () => {
      throw new Error('boom');
    };

    render(
      <ChunkErrorBoundary>
        <Broken />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  test('shows the recovery fallback after a ChunkLoadError is retried', () => {
    const Broken = () => {
      throw Object.assign(new Error('chunk failed'), { name: 'ChunkLoadError' });
    };

    const { rerender } = render(
      <ChunkErrorBoundary>
        <Broken />
      </ChunkErrorBoundary>
    );

    rerender(
      <ChunkErrorBoundary>
        <Broken />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText('Failed to load the application resources. Please try again.')).toBeInTheDocument();
  });
});
