import React from 'react';
import { render } from 'test-utils';
import { Polyline } from './polyline';
import { GoogleMapsContext } from '@vis.gl/react-google-maps';

const setOptionsMock = jest.fn();
const setPathMock = jest.fn();
const setMapMock = jest.fn();
const addListenerMock = jest.fn();
const clearInstanceListenersMock = jest.fn();

class MockPolyline {
  setOptions(options: unknown) {
    setOptionsMock(options);
  }

  setPath(path: unknown) {
    setPathMock(path);
  }

  setMap(map: unknown) {
    setMapMock(map);
  }
}

const mockMap = { id: 'mock-map' };
const decodedPath = [{ lat: 1, lng: 2 }];

jest.mock('@vis.gl/react-google-maps', () => {
  const React = require('react');
  return {
    __esModule: true,
    GoogleMapsContext: React.createContext<any>(undefined),
    useMapsLibrary: jest.fn(() => ({
      encoding: {
        decodePath: jest.fn(() => decodedPath),
      },
    })),
  };
});

beforeAll(() => {
  (global as any).google = {
    maps: {
      Polyline: MockPolyline,
      event: {
        addListener: addListenerMock,
        clearInstanceListeners: clearInstanceListenersMock,
      },
    },
  };
});

afterAll(() => {
  delete (global as any).google;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Polyline', () => {
  test('creates a polyline, sets options, attaches to map, and cleans up listeners on unmount', () => {
    const { unmount } = render(
      <GoogleMapsContext.Provider value={{ map: mockMap }}>
        <Polyline strokeColor="#3244a8" strokeWeight={3} />
      </GoogleMapsContext.Provider>
    );

    expect(setOptionsMock).toHaveBeenCalledWith({ strokeColor: '#3244a8', strokeWeight: 3 });
    expect(setMapMock).toHaveBeenCalledWith(mockMap);
    expect(addListenerMock).toHaveBeenCalledTimes(6);
    expect(addListenerMock.mock.calls.map((call) => call[1])).toEqual([
      'click',
      'drag',
      'dragstart',
      'dragend',
      'mouseover',
      'mouseout',
    ]);

    unmount();

    expect(setMapMock).toHaveBeenLastCalledWith(null);
    expect(clearInstanceListenersMock).toHaveBeenCalledTimes(1);
  });

  test('decodes encodedPath and updates polyline path when geometry library is available', () => {
    render(
      <GoogleMapsContext.Provider value={{ map: mockMap }}>
        <Polyline encodedPath="abc123" />
      </GoogleMapsContext.Provider>
    );

    expect(setPathMock).toHaveBeenCalledWith(decodedPath);
    expect(setMapMock).toHaveBeenCalledWith(mockMap);
  });
});
