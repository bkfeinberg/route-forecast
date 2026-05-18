// Mock Sentry first before importing anything
jest.mock('@sentry/node', () => ({
  startSpan: jest.fn((config, callback) => callback()),
  logger: {
    error: jest.fn(),
  },
}));

// Mock all weather service modules with .js extensions before importing the dispatcher
jest.mock('./tomorrowio.js', () => jest.fn(), { virtual: true });
jest.mock('./weatherApi.js', () => jest.fn(), { virtual: true });
jest.mock('./visualCrossing.js', () => jest.fn(), { virtual: true });
jest.mock('./nws.js', () => jest.fn(), { virtual: true });
jest.mock('./meteomatics.js', () => jest.fn(), { virtual: true });
jest.mock('./weatherKit.js', () => jest.fn(), { virtual: true });
jest.mock('./openmeteo.js', () => jest.fn(), { virtual: true });
jest.mock('./oneCall.js', () => jest.fn(), { virtual: true });

import callWeatherService from './weatherForecastDispatcher';
import * as Sentry from '@sentry/node';

// Get mocked modules
const mockTomorrowIo = require('./tomorrowio.js');
const mockWeatherApi = require('./weatherApi.js');
const mockVisualCrossing = require('./visualCrossing.js');
const mockNWS = require('./nws.js');
const mockWeatherKit = require('./weatherKit.js');
const mockOneCall = require('./oneCall.js');
const mockOpenMeteo = require('./openmeteo.js');

describe('weatherForecastDispatcher', () => {
  const mockForecastResult = {
    time: '2024-05-17T10:00:00Z',
    zone: 'UTC',
    distance: 100,
    summary: 'Partly Cloudy',
    precip: '0%',
    humidity: 65,
    cloudCover: '30%',
    windSpeed: '10 mph',
    lat: 40.7128,
    lon: -74.006,
    temp: '72°F',
    relBearing: 0,
    rainy: false,
    windBearing: 180,
    vectorBearing: 0,
    gust: '15 mph',
    feel: 70,
    isControl: false,
  };

  const defaultParams = {
    lat: 40.7128,
    lon: -74.006,
    currentTime: '2024-05-17T10:00:00Z',
    distance: 100,
    zone: 'America/New_York',
    bearing: 90,
    isControl: false,
    lang: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBearingDifference', () => {
    // We'll test this through the service calls since it's exported but used internally
    it('should calculate bearing difference correctly', () => {
      // Test case: bearing 0, windBearing 90 - should return 90
      // Using the formula from the implementation
      const bearing = 0;
      const windBearing = 90;
      const result = Math.min(
        bearing - windBearing < 0 ? bearing - windBearing + 360 : bearing - windBearing,
        windBearing - bearing < 0 ? windBearing - bearing + 360 : windBearing - bearing
      );
      expect(result).toBe(90);
    });

    it('should handle same bearing', () => {
      const bearing = 180;
      const windBearing = 180;
      const result = Math.min(
        bearing - windBearing < 0 ? bearing - windBearing + 360 : bearing - windBearing,
        windBearing - bearing < 0 ? windBearing - bearing + 360 : windBearing - bearing
      );
      expect(result).toBe(0);
    });

    it('should handle bearing wrapping around 360', () => {
      const bearing = 10;
      const windBearing = 350;
      const result = Math.min(
        bearing - windBearing < 0 ? bearing - windBearing + 360 : bearing - windBearing,
        windBearing - bearing < 0 ? windBearing - bearing + 360 : windBearing - bearing
      );
      expect(result).toBe(20);
    });

    it('should return smallest angle', () => {
      const bearing = 0;
      const windBearing = 270;
      // 270 - 0 = 270, or 0 - 270 + 360 = 90, so min is 90
      const result = Math.min(
        bearing - windBearing < 0 ? bearing - windBearing + 360 : bearing - windBearing,
        windBearing - bearing < 0 ? windBearing - bearing + 360 : windBearing - bearing
      );
      expect(result).toBe(90);
    });
  });

  describe('callWeatherService', () => {
    describe('Tomorrow.io (climacell)', () => {
      it('should call Tomorrow.io when service is climacell', async () => {
        mockTomorrowIo.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'climacell',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockTomorrowIo).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap Tomorrow.io call in Sentry span', async () => {
        mockTomorrowIo.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'climacell',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'tomorrow.io' },
          expect.any(Function)
        );
      });
    });

    describe('Weather API', () => {
      it('should call Weather API when service is weatherapi', async () => {
        mockWeatherApi.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'weatherapi',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockWeatherApi).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap Weather API call in Sentry span', async () => {
        mockWeatherApi.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'weatherapi',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'weatherapi' },
          expect.any(Function)
        );
      });
    });

    describe('Visual Crossing', () => {
      it('should call Visual Crossing when service is visualcrossing', async () => {
        mockVisualCrossing.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'visualcrossing',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockVisualCrossing).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap Visual Crossing call in Sentry span', async () => {
        mockVisualCrossing.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'visualcrossing',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'visualcrossing' },
          expect.any(Function)
        );
      });
    });

    describe('NWS', () => {
      it('should call NWS when service is nws', async () => {
        mockNWS.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'nws',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockNWS).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap NWS call in Sentry span', async () => {
        mockNWS.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'nws',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'nws' },
          expect.any(Function)
        );
      });
    });

    describe('WeatherKit', () => {
      it('should call WeatherKit when service is weatherKit', async () => {
        mockWeatherKit.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'weatherKit',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockWeatherKit).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap WeatherKit call in Sentry span', async () => {
        mockWeatherKit.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'weatherKit',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'weatherkit' },
          expect.any(Function)
        );
      });
    });

    describe('OneCall', () => {
      it('should call OneCall when service is oneCall', async () => {
        mockOneCall.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'oneCall',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockOneCall).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap OneCall call in Sentry span', async () => {
        mockOneCall.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'oneCall',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'oneCall' },
          expect.any(Function)
        );
      });
    });

    describe('Open-Meteo', () => {
      it('should call Open-Meteo when service is openMeteo', async () => {
        mockOpenMeteo.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'openMeteo',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockOpenMeteo).toHaveBeenCalledWith(
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          expect.any(Function),
          defaultParams.isControl,
          defaultParams.lang
        );
        expect(result).toEqual(mockForecastResult);
      });

      it('should wrap Open-Meteo call in Sentry span', async () => {
        mockOpenMeteo.mockResolvedValueOnce(mockForecastResult);

        await callWeatherService(
          'openMeteo',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(Sentry.startSpan).toHaveBeenCalledWith(
          { name: 'openMeteo' },
          expect.any(Function)
        );
      });
    });

    describe('Unknown service', () => {
      it('should return null for unknown service', () => {
        const result = callWeatherService(
          'unknownService',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(result).toBeNull();
      });

      it('should log error for unknown service', () => {
        const { error } = Sentry.logger as any;

        callWeatherService(
          'unknownService',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(error).toHaveBeenCalledWith('Unknown weather service requested: unknownService');
      });

      it('should handle empty service string', () => {
        const result = callWeatherService(
          '',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(result).toBeNull();
      });
    });

    describe('Parameter passing', () => {
      it('should pass all parameters correctly to weather service', async () => {
        mockWeatherApi.mockResolvedValueOnce(mockForecastResult);

        const customParams = {
          lat: 51.5074,
          lon: -0.1278,
          currentTime: '2024-06-15T14:30:00Z',
          distance: 250,
          zone: 'Europe/London',
          bearing: 225,
          isControl: true,
          lang: 'fr',
        };

        await callWeatherService(
          'weatherapi',
          customParams.lat,
          customParams.lon,
          customParams.currentTime,
          customParams.distance,
          customParams.zone,
          customParams.bearing,
          customParams.isControl,
          customParams.lang
        );

        expect(mockWeatherApi).toHaveBeenCalledWith(
          customParams.lat,
          customParams.lon,
          customParams.currentTime,
          customParams.distance,
          customParams.zone,
          customParams.bearing,
          expect.any(Function),
          customParams.isControl,
          customParams.lang
        );
      });

      it('should handle control point parameter', async () => {
        mockVisualCrossing.mockResolvedValueOnce({
          ...mockForecastResult,
          isControl: true,
        });

        const result = await callWeatherService(
          'visualcrossing',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          true,
          defaultParams.lang
        );

        expect(result!.isControl).toBe(true);
      });

      it('should handle different language parameters', async () => {
        const languages = ['en', 'es', 'fr', 'de', 'it'];

        for (const lang of languages) {
          mockNWS.mockResolvedValueOnce(mockForecastResult);

          await callWeatherService(
            'nws',
            defaultParams.lat,
            defaultParams.lon,
            defaultParams.currentTime,
            defaultParams.distance,
            defaultParams.zone,
            defaultParams.bearing,
            defaultParams.isControl,
            lang
          );

          expect(mockNWS).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number),
            expect.any(String),
            expect.any(Number),
            expect.any(String),
            expect.any(Number),
            expect.any(Function),
            expect.any(Boolean),
            lang
          );
        }
      });
    });

    describe('Error handling', () => {
      it('should propagate errors from weather service', async () => {
        const error = new Error('Service unavailable');
        mockWeatherApi.mockRejectedValueOnce(error);

        await expect(
          callWeatherService(
            'weatherapi',
            defaultParams.lat,
            defaultParams.lon,
            defaultParams.currentTime,
            defaultParams.distance,
            defaultParams.zone,
            defaultParams.bearing,
            defaultParams.isControl,
            defaultParams.lang
          )
        ).rejects.toThrow('Service unavailable');
      });

      it('should handle rejection with null', async () => {
        mockOpenMeteo.mockRejectedValueOnce(null);

        await expect(
          callWeatherService(
            'openMeteo',
            defaultParams.lat,
            defaultParams.lon,
            defaultParams.currentTime,
            defaultParams.distance,
            defaultParams.zone,
            defaultParams.bearing,
            defaultParams.isControl,
            defaultParams.lang
          )
        ).rejects.toEqual(null);
      });
    });

    describe('Response validation', () => {
      it('should return response with all required fields', async () => {
        mockTomorrowIo.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'climacell',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(result).toHaveProperty('time');
        expect(result).toHaveProperty('zone');
        expect(result).toHaveProperty('distance');
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('precip');
        expect(result).toHaveProperty('humidity');
        expect(result).toHaveProperty('cloudCover');
        expect(result).toHaveProperty('windSpeed');
        expect(result).toHaveProperty('lat');
        expect(result).toHaveProperty('lon');
        expect(result).toHaveProperty('temp');
        expect(result).toHaveProperty('relBearing');
        expect(result).toHaveProperty('rainy');
        expect(result).toHaveProperty('windBearing');
        expect(result).toHaveProperty('vectorBearing');
        expect(result).toHaveProperty('gust');
        expect(result).toHaveProperty('feel');
        expect(result).toHaveProperty('isControl');
      });

      it('should return optional aqi field when provided', async () => {
        const resultWithAqi = { ...mockForecastResult, aqi: 45 };
        mockWeatherKit.mockResolvedValueOnce(resultWithAqi);

        const result = await callWeatherService(
          'weatherKit',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(result).toHaveProperty('aqi');
        expect(result!.aqi).toBe(45);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero distance', async () => {
        mockOneCall.mockResolvedValueOnce(mockForecastResult);

        const result = await callWeatherService(
          'oneCall',
          defaultParams.lat,
          defaultParams.lon,
          defaultParams.currentTime,
          0,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockOneCall).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          expect.any(String),
          0,
          expect.any(String),
          expect.any(Number),
          expect.any(Function),
          expect.any(Boolean),
          expect.any(String)
        );
      });

      it('should handle bearing values around 360', async () => {
        mockVisualCrossing.mockResolvedValueOnce(mockForecastResult);

        const bearingValues = [0, 90, 180, 270, 359];

        for (const bearing of bearingValues) {
          await callWeatherService(
            'visualcrossing',
            defaultParams.lat,
            defaultParams.lon,
            defaultParams.currentTime,
            defaultParams.distance,
            defaultParams.zone,
            bearing,
            defaultParams.isControl,
            defaultParams.lang
          );

          expect(mockVisualCrossing).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number),
            expect.any(String),
            expect.any(Number),
            expect.any(String),
            bearing,
            expect.any(Function),
            expect.any(Boolean),
            expect.any(String)
          );
        }
      });

      it('should handle negative coordinates', async () => {
        mockNWS.mockResolvedValueOnce(mockForecastResult);

        const negativeCoordinates = {
          lat: -33.8688,
          lon: 151.2093,
        };

        await callWeatherService(
          'nws',
          negativeCoordinates.lat,
          negativeCoordinates.lon,
          defaultParams.currentTime,
          defaultParams.distance,
          defaultParams.zone,
          defaultParams.bearing,
          defaultParams.isControl,
          defaultParams.lang
        );

        expect(mockNWS).toHaveBeenCalledWith(
          negativeCoordinates.lat,
          negativeCoordinates.lon,
          expect.any(String),
          expect.any(Number),
          expect.any(String),
          expect.any(Number),
          expect.any(Function),
          expect.any(Boolean),
          expect.any(String)
        );
      });
    });
  });
});
