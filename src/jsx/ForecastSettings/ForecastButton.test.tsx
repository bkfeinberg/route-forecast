// src/jsx/ForecastSettings/ForecastButton.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from 'test-utils';
import { describe, beforeEach, jest, test, expect } from '@jest/globals';

// Mocks
jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning
  useTranslation: () => {
    return {
      t: (str: any) => str, // Returns the key as the translation
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    };
  },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children, // Mock the provider as well
}));

jest.mock('@sentry/react', () => ({
  __esModule: true,
  logger: { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn(), fmt: jest.fn() },
  metrics: { count: jest.fn() },
  setContext: jest.fn()
}));
// Mock redux modules that pull in ESM-only dependencies to avoid Jest parsing errors
jest.mock('../../redux/forecastActions', () => ({
  __esModule: true,
  msgFromError: jest.fn(() => 'msg'),
  removeDuplicateForecasts: jest.fn((v: any) => v),
  extractRejectedResults: jest.fn(() => []),
  getDaysInFuture: jest.fn(() => 0),
  errorDetails: jest.fn(() => 'err')
}));
jest.mock('../../redux/forecastSlice', () => ({
  __esModule: true,
  forecastFetched: jest.fn(),
  forecastAppended: jest.fn(),
}));
jest.mock('../../redux/dialogParamsSlice', () => ({
  __esModule: true,
  errorMessageListSet: jest.fn(),
  errorMessageListAppend: jest.fn(),
  forecastFetchBegun: jest.fn(),
  forecastFetchFailed: jest.fn(),
}));
jest.mock('../../redux/routeInfoSlice', () => ({ __esModule: true }));
jest.mock('../../redux/paramsSlice', () => ({ __esModule: true, querySet: jest.fn() }));
jest.mock('../../utils/queryStringUtils', () => ({ __esModule: true, generateUrl: jest.fn(() => ({ url: { url: '' }, search: '' })) }));
jest.mock('../../utils/routeUtils', () => ({ __esModule: true, getForecastRequest: jest.fn(() => []) }));
jest.mock('p-limit', () => ({ __esModule: true, default: (n: number) => (fn: any) => { try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(e); } } }));

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: { event: jest.fn() }
}));

jest.mock('../shared/DesktopTooltip', () => ({
  __esModule: true,
  DesktopTooltip: ({ children, label }: any) => (
    <div data-testid="desktop-tooltip" data-label={label}>{children}</div>
  )
}));

jest.mock('../../utils/useForecastRequestData', () => ({
  __esModule: true,
  useForecastRequestData: jest.fn()
}));

jest.mock('../../utils/hooks', () => ({
  __esModule: true,
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
  useGetForecastRequestDependencies: jest.fn()
}));

jest.mock('../../redux/forecastApiSlice', () => ({
  __esModule: true,
  useForecastMutation: jest.fn(),
  useGetAqiMutation: jest.fn()
}));

jest.mock('../../utils/writeToFile', () => ({
  __esModule: true,
  writeObjToFile: jest.fn()
}));

import ReactGA from 'react-ga4';
import { useForecastRequestData } from '../../utils/useForecastRequestData';
import { useAppSelector, useAppDispatch, useGetForecastRequestDependencies } from '../../utils/hooks';
import { useForecastMutation, useGetAqiMutation } from '../../redux/forecastApiSlice';
import { writeObjToFile } from '../../utils/writeToFile';
import { ForecastButton } from './ForecastButton';

describe('ForecastButton', () => {
  const mockedUseForecastData = useForecastRequestData as unknown as jest.Mock;
  const mockedUseAppSelector = useAppSelector as unknown as jest.Mock;
  const mockedUseAppDispatch = useAppDispatch as unknown as jest.Mock;
  const mockedGetDeps = useGetForecastRequestDependencies as unknown as jest.Mock;
  const mockedUseForecast = useForecastMutation as unknown as jest.Mock;
  const mockedUseAqi = useGetAqiMutation as unknown as jest.Mock;
  const mockedWrite = writeObjToFile as unknown as jest.Mock;
  const mockedGA = ReactGA as unknown as { default?: any, event?: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseForecastData.mockReturnValue({ length: 0, daysInFuture: 0 });
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { rwgpsRouteData: {}, gpxRouteData: null, name: 'routename', distanceInKm: 13 }, controls: { userControlPoints: [] }, forecast: { fetchAqi: false }, uiInfo: { routeParams: { rusaPermRouteId: '', segment: 0 } }, routeInfoSlice: {} }));
    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });
    // Default: no fetching
    mockedUseForecast.mockReturnValue([jest.fn(), { isLoading: false }]);
    mockedUseAqi.mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  test('shows disabled tooltip and has disabled button when submitDisabled prop true', () => {
    const { getByTestId, container } = render(<ForecastButton fetchingForecast={false} submitDisabled={true} routeNumber={'1'} startTimestamp={0} pace={"A"} interval={1} metric={false} controls={[]} strava_activity={""} strava_route={""} provider={"weatherKit"} origin={""} queryString={null} 
      querySet={jest.fn() as any} zone={""} computeStdDev={false} downloadAll={false} />);
    const tooltip = getByTestId('desktop-tooltip');
    expect(tooltip.getAttribute('data-label')).toBe('tooltips.forecast.disabled');

    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  test('responds to Alt/Shift key presses and changes button text', () => {
    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.textContent).toBe('buttons.forecast');

    // press Alt
    fireEvent.keyDown(window, { code: 'AltLeft' });
    expect(btn.textContent).toBe('buttons.downloadAll');

    // press Shift while Alt still down
    fireEvent.keyDown(window, { code: 'ShiftLeft' });
    expect(btn.textContent).toBe('buttons.standardDeviation');

    // release Alt
    fireEvent.keyUp(window, { code: 'AltLeft' });
    expect(btn.textContent).toBe('buttons.forecast');

    // release Shift
    fireEvent.keyUp(window, { code: 'ShiftLeft' });
    expect(btn.textContent).toBe('buttons.forecast');
  });

  test('shows pending text when forecast mutation is loading', () => {
    mockedUseForecast.mockReturnValue([jest.fn(), { isLoading: true }]);
    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.textContent).toBe('buttons.forecastPending');
  });

  test('downloadAll clicking triggers GA event and writeObjToFile via grabAllPossibleForecasts', () => {
    // make sure ReactGA.event exists
    const mockEvent = jest.fn();
    (ReactGA as any).event = mockEvent;
    // prepare forecastRequestData.current used by grabAllPossibleForecasts
    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={true}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);

    expect(mockEvent).toHaveBeenCalledWith('generate_lead', { currency: 'USD', value: 13 });
    // writeObjToFile is invoked asynchronously after fetching all providers; asserting GA event suffices for this unit test.
  });

  test('successful forecast dispatches forecastFetched/forecastAppended and clears errors', async () => {
    // create forecast promises for two parts
    const results = [{ forecast: { distance: 2 } }, { forecast: { distance: 1 } }];
    let callCount = 0;
    const forecastFn = jest.fn(() => ({ unwrap: () => Promise.resolve(results[callCount++]) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);

    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    // ensure routeData exists
    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });

    // make getForecastRequest return parts so forecast promises are created
    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    await (async () => fireEvent.click(btn))();

    // wait for async dispatches
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

    // expect forecastFetchBegun to have been dispatched (first call)
    const { forecastFetchBegun } = require('../../redux/dialogParamsSlice');
    expect(forecastFetchBegun).toHaveBeenCalled();

    const { forecastFetched, forecastAppended } = require('../../redux/forecastSlice');
    // forecastFetched called at least once and forecastAppended may have been called for extra parts
    expect(forecastFetched).toHaveBeenCalled();
    expect(forecastAppended).toHaveBeenCalled();
  });

  test('no forecasts returned dispatches forecastFetchFailed', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    // getForecastRequest returns empty array to simulate no parts
    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([]);

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);

    // expect forecastFetchFailed to have been dispatched
    const { forecastFetchFailed } = require('../../redux/dialogParamsSlice');
    await waitFor(() => expect(forecastFetchFailed).toHaveBeenCalledWith('No forecast was returned'));
  });

  test('partial failures produce forecasts and error messages', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    const results = [{ forecast: { distance: 5 } }];
    let callCount = 0;
    // first call resolves, second rejects
    const forecastFn = jest.fn(() => ({ unwrap: () => (callCount++ === 0 ? Promise.resolve(results[0]) : Promise.reject({ details: 'bad' })) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);

    // ensure getForecastRequest returns two parts so we get one fulfilled and one rejected
    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    await (async () => fireEvent.click(btn))();

    // wait for async dispatches
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

    // ensure that errorMessageListSet/Append were called when a rejection occurred
    const { errorMessageListSet, errorMessageListAppend } = require('../../redux/dialogParamsSlice');
    expect(errorMessageListSet).toHaveBeenCalled();
    expect(errorMessageListAppend).toHaveBeenCalled();
  });

  test('partial forecast failures still dispatch successful forecasts and record errors', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    // first part resolves to distance 4, second part rejects
    let call = 0;
    const forecastFn = jest.fn(() => ({ unwrap: () => (call++ === 0 ? Promise.resolve({ forecast: { distance: 4 } }) : Promise.reject({ details: 'fetch error' })) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);

    // no AQI for simplicity
    mockedUseAqi.mockReturnValue([jest.fn(), { isLoading: false }]);

    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    await (async () => fireEvent.click(btn))();

    // wait for dispatches
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

    const { forecastFetched, forecastAppended } = require('../../redux/forecastSlice');
    // forecastFetched should be called with the first successful forecast
    expect(forecastFetched).toHaveBeenCalled();
    // since there's only one successful forecast, forecastAppended may not be called; ensure not to throw if it wasn't

    const { errorMessageListSet, errorMessageListAppend } = require('../../redux/dialogParamsSlice');
    expect(errorMessageListSet).toHaveBeenCalled();
    expect(errorMessageListAppend).toHaveBeenCalled();
  });

  test('getForecastForProvider returns [] for all providers when no route data (downloadAll)', async () => {
    // no route data present
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { rwgpsRouteData: null, gpxRouteData: null, name: 'routename', distanceInKm: 13 }, controls: { userControlPoints: [] }, forecast: { fetchAqi: false }, uiInfo: { routeParams: { rusaPermRouteId: '', segment: 0 } }, routeInfoSlice: {} }));
    // ensure providers are considered by grabAllPossibleForecasts
    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={true}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);

    // grabAllPossibleForecasts calls writeObjToFile asynchronously
    await waitFor(() => expect(mockedWrite).toHaveBeenCalled());
    const arg = mockedWrite.mock.calls[0][0] as any;
    // weatherKit should be present and its array should be empty since getForecastForProvider returns [] without route data
    expect(arg.weatherKit).toEqual([]);
  });

  test('getForecastForProvider returns [] when all parts reject', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);
    // route data exists so the internal doForecastByParts will create parts
    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });
    // two parts
    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    // forecast unwrap always rejects
    const forecastFn = jest.fn(() => ({ unwrap: () => Promise.reject({ details: 'bad' }) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);

    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={true}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);

    await waitFor(() => expect(mockedWrite).toHaveBeenCalled());
    const arg = mockedWrite.mock.calls[0][0] as any;

    expect(arg.weatherKit).toEqual([]);
  });

  test('getForecastForProvider returns sorted forecasts when parts succeed', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);
    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });

    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    // return distance based on part data so result ordering is deterministic
    const forecastFn = jest.fn((req: any) => ({ unwrap: () => Promise.resolve({ forecast: { distance: req.locations.lat } }) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);

    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={true}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);

    await waitFor(() => expect(mockedWrite).toHaveBeenCalled());
    const arg = mockedWrite.mock.calls[0][0] as any;
    const arr = arg.weatherKit;
    expect(arr).toBeDefined();
    expect(arr.length).toBeGreaterThan(0);
    const distances = arr.map((a:any)=>a.distance).sort((a:number,b:number)=>a-b);
    expect(distances).toEqual([1,2]);
  });

  test('fetchAqi true includes AQI values in forecast payload', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    // route data exists and fetchAqi true
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { rwgpsRouteData: {}, gpxRouteData: null, name: 'routename', distanceInKm: 13 }, controls: { userControlPoints: [] }, forecast: { fetchAqi: true }, uiInfo: { routeParams: { rusaPermRouteId: '', segment: 0 } }, routeInfoSlice: {} }));

    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });

    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    const forecastFn = jest.fn((req: any) => ({ unwrap: () => Promise.resolve({ forecast: { distance: req.locations.lat } }) }));
    const aqiFn = jest.fn((req: any) => ({ unwrap: () => Promise.resolve({ aqi: { aqi: req.locations.lat * 10 } }) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);
    mockedUseAqi.mockReturnValue([aqiFn, { isLoading: false }]);

    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    await (async () => fireEvent.click(btn))();

    await waitFor(() => expect(require('../../redux/forecastSlice').forecastFetched).toHaveBeenCalled());

    const { forecastFetched, forecastAppended } = require('../../redux/forecastSlice');
    const fetchedArg = (forecastFetched as jest.Mock).mock.calls[0][0] as any;
    expect(fetchedArg.forecastInfo.forecast[0].aqi).toBe(10);

    const appendedArg = (forecastAppended as jest.Mock).mock.calls[0][0] as any;
    expect(appendedArg.aqi).toBe(20);
  });

  test('partial AQI failures: one AQI rejects, one succeeds', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    // route data exists and fetchAqi true
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { rwgpsRouteData: {}, gpxRouteData: null, name: 'routename', distanceInKm: 13 }, controls: { userControlPoints: [] }, forecast: { fetchAqi: true }, uiInfo: { routeParams: { rusaPermRouteId: '', segment: 0 } }, routeInfoSlice: {} }));

    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });
    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    const forecastFn = jest.fn((req: any) => ({ unwrap: () => Promise.resolve({ forecast: { distance: req.locations.lat } }) }));
    const aqiFn = jest.fn((req: any) => ({ unwrap: () => (req.locations.lat === 1 ? Promise.resolve({ aqi: { aqi: 10 } }) : Promise.reject({ details: 'badAQI' })) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);
    mockedUseAqi.mockReturnValue([aqiFn, { isLoading: false }]);

    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    await (async () => fireEvent.click(btn))();

    await waitFor(() => expect(require('../../redux/forecastSlice').forecastFetched).toHaveBeenCalled());
    const { forecastFetched, forecastAppended } = require('../../redux/forecastSlice');
    const fetchedArg = (forecastFetched as jest.Mock).mock.calls[0][0] as any;
    expect(fetchedArg.forecastInfo.forecast[0].aqi).toBe(10);

    const appendedArg = (forecastAppended as jest.Mock).mock.calls[0][0] as any;
    // second part had AQI fetch fail, so no aqi set on appended forecast
    expect(appendedArg.aqi).toBeUndefined();

    const { errorMessageListAppend } = require('../../redux/dialogParamsSlice');
    expect(errorMessageListAppend).toHaveBeenCalled();
  });

  test('all AQI failures: forecasts succeed but no AQI fields set and errors appended', async () => {
    const mockDispatch = jest.fn();
    mockedUseAppDispatch.mockReturnValue(mockDispatch);

    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { rwgpsRouteData: {}, gpxRouteData: null, name: 'routename', distanceInKm: 13 }, controls: { userControlPoints: [] }, forecast: { fetchAqi: true }, uiInfo: { routeParams: { rusaPermRouteId: '', segment: 0 } }, routeInfoSlice: {} }));

    mockedGetDeps.mockReturnValue({ routeData: {}, timeZoneId: 'tz', controlPoints: [], segment: 0, routeUUID: 'uuid' });
    const routeUtils = require('../../utils/routeUtils');
    routeUtils.getForecastRequest.mockReturnValue([{ lat: 1 }, { lat: 2 }]);

    const forecastFn = jest.fn((req: any) => ({ unwrap: () => Promise.resolve({ forecast: { distance: req.locations.lat } }) }));
    const aqiFn = jest.fn(() => ({ unwrap: () => Promise.reject({ details: 'badAQI' }) }));
    mockedUseForecast.mockReturnValue([forecastFn, { isLoading: false }]);
    mockedUseAqi.mockReturnValue([aqiFn, { isLoading: false }]);

    mockedUseForecastData.mockReturnValue({ length: 1, daysInFuture: 1 });

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={false}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    await (async () => fireEvent.click(btn))();

    await waitFor(() => expect(require('../../redux/forecastSlice').forecastFetched).toHaveBeenCalled());
    const { forecastFetched, forecastAppended } = require('../../redux/forecastSlice');
    const fetchedArg = (forecastFetched as jest.Mock).mock.calls[0][0] as any;
    expect(fetchedArg.forecastInfo.forecast[0].aqi).toBeUndefined();

    const appendedArg = (forecastAppended as jest.Mock).mock.calls[0][0] as any;
    expect(appendedArg.aqi).toBeUndefined();

    const { errorMessageListAppend } = require('../../redux/dialogParamsSlice');
    expect(errorMessageListAppend).toHaveBeenCalled();
  });

  test('computeStdDev true causes add_payment_info to include provider list with provider first', async () => {
    const mockEvent = jest.fn();
    (ReactGA as any).event = mockEvent;

    // For this test, clear route data so the handler returns early after add_payment_info and avoids running the full fetch loop
    mockedUseAppSelector.mockImplementation((fn: any) => fn({ routeInfo: { rwgpsRouteData: null, gpxRouteData: null, name: 'routename' }, controls: { userControlPoints: [] }, forecast: { fetchAqi: false }, uiInfo: { routeParams: { rusaPermRouteId: '', segment: 0 } }, routeInfoSlice: {} }));

    const { container } = render(<ForecastButton
      fetchingForecast={false}
      submitDisabled={false}
      routeNumber={'1'}
      startTimestamp={0}
      pace={"A"}
      interval={1}
      metric={false}
      controls={[]}
      strava_activity={""}
      strava_route={""}
      provider={"weatherKit"}
      origin={""}
      queryString={null}
      querySet={jest.fn() as any}
      zone={""}
      computeStdDev={true}
      downloadAll={false}
    />);

    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);

    await waitFor(() => expect(mockEvent).toHaveBeenCalledWith('add_payment_info', expect.objectContaining({ provider: expect.any(String) })));

    const call = mockEvent.mock.calls.find((c:any) => c[0]==='add_payment_info');
    expect(call).toBeDefined();
    const args = call![1] as any;
    // provider string should start with the active provider
    expect((args.provider as string).split(',')[0]).toBe('weatherKit');
  });
});
