import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';

jest.mock('axios');
jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@sentry/react', () => ({
    addBreadcrumb: jest.fn(),
    logger: { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn(), fmt: jest.fn() },
    captureException: jest.fn()
}));

import PinnedRouteLoaderConnected from './PinnedRouteLoader';
import { MantineProvider } from '@mantine/core';

const PinnedRouteLoader: any = (PinnedRouteLoaderConnected as any).WrappedComponent || PinnedRouteLoaderConnected;

const renderWithProviders = (ui: React.ReactElement) => render(
    <MantineProvider>{ui}</MantineProvider>
);

describe('PinnedRouteLoader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty div when credentialsValid is false and not using pinned', () => {
        const { container } = renderWithProviders(<PinnedRouteLoader rwgpsToken={undefined} rwgpsTokenSet={jest.fn()} credentialsValid={false}
            pinnedRoutesSet={jest.fn()} errorDetailsSet={jest.fn()} hasRoutes={false} loadingPinnedRoutes={false} loadingPinnedSet={jest.fn()}
            usingPinnedRoutesSet={jest.fn()} setShowPinnedRoutes={jest.fn()} usingPinnedRoutes={false} />);
        expect(container.querySelector('div')).toBeTruthy();
    });

    it('toggles pinned routes when button clicked', () => {
        const setUsePinned = jest.fn();
        const setShowPinned = jest.fn();
        const { getByRole } = renderWithProviders(<PinnedRouteLoader rwgpsToken={'token'} rwgpsTokenSet={jest.fn()} credentialsValid={true}
            pinnedRoutesSet={jest.fn()} errorDetailsSet={jest.fn()} hasRoutes={false} loadingPinnedRoutes={false} loadingPinnedSet={jest.fn()}
            usingPinnedRoutesSet={setUsePinned} setShowPinnedRoutes={setShowPinned} usingPinnedRoutes={false} />);

        const btn = getByRole('button');
        fireEvent.click(btn);
        expect(setUsePinned).toHaveBeenCalledWith(true);
        expect(setShowPinned).toHaveBeenCalledWith(true);
    });

    it('fetches pinned routes and calls pinnedRoutesSet when token present', async () => {
        const pinnedRoutesSet = jest.fn();
        const loadingPinnedSet = jest.fn();
        const mockData = [
            { id: 1, dateAdded: '2023-01-01T00:00:00Z' },
            { id: 2, dateAdded: '2024-01-01T00:00:00Z' }
        ];
        (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

        renderWithProviders(<PinnedRouteLoader rwgpsToken={'mytoken'} rwgpsTokenSet={jest.fn()} credentialsValid={true}
            pinnedRoutesSet={pinnedRoutesSet} errorDetailsSet={jest.fn()} hasRoutes={false} loadingPinnedRoutes={false} loadingPinnedSet={loadingPinnedSet}
            usingPinnedRoutesSet={jest.fn()} setShowPinnedRoutes={jest.fn()} usingPinnedRoutes={true} />);

        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        await waitFor(() => expect(pinnedRoutesSet).toHaveBeenCalled());
        expect(loadingPinnedSet).toHaveBeenCalled();
    });
});
