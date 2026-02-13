import { combineReducers, configureStore } from '@reduxjs/toolkit'
import * as Sentry from '@sentry/react';
import {createLogger} from 'redux-logger';
import { dialogParamsReducer } from './dialogParamsSlice';
import { stravaReducer } from './stravaSlice';
import { forecastApiSlice } from './forecastApiSlice'
import { rwgpsInfoReducer } from './rideWithGpsSlice';
import { paramsReducer } from './paramsSlice';
import { rusaIdLookupApiSlice} from './rusaLookupApiSlice'
import { routeInfoReducer } from './routeInfoSlice';
import { controlsReducer } from './controlsSlice';
import {routeParamsReducer} from './routeParamsSlice'
import { forecastReducer } from './forecastSlice';
export const loggerMiddleware = createLogger();

/**
 *
 * @param {Object} _preloadedState from server
 * @param {boolean} mode - development vs production
 * @returns {Object} The Redux store
 *
 */

export default function configureReduxStore({ _preloadedState, mode }: { _preloadedState:object; mode:string; }) {
    const sentryReduxEnhancer = Sentry.createReduxEnhancer({
        actionTransformer: action => {
            if (action.type === 'params/apiKeysSet') {
                // Return null to not log the action to Sentry
                return {...action,
                    maps_api_key:null,
                    timezone_api_key:null,
                    bitly_token:null
                };
            }
            return action;
        }
    });
    
    const store = configureStore({
        reducer: {
            uiInfo: combineReducers({ routeParams: routeParamsReducer, dialogParams: dialogParamsReducer }),
            routeInfo: routeInfoReducer, controls: controlsReducer, strava: stravaReducer, forecast: forecastReducer,
            params: paramsReducer, 
            rideWithGpsInfo: rwgpsInfoReducer,
            [forecastApiSlice.reducerPath]: forecastApiSlice.reducer,
            [rusaIdLookupApiSlice.reducerPath]: rusaIdLookupApiSlice.reducer
        },
        preloadedState:_preloadedState,
        middleware: getDefaultMiddleware => {
            if (mode === 'development') {
                return getDefaultMiddleware().concat(forecastApiSlice.middleware,rusaIdLookupApiSlice.middleware,loggerMiddleware)
            } else {
                return getDefaultMiddleware().concat(forecastApiSlice.middleware,rusaIdLookupApiSlice.middleware)
            }
        },
        enhancers: getDefaultEnhancers => {
            return getDefaultEnhancers().concat(sentryReduxEnhancer);
        },
    });

    return store;
}

// Store has all of the default middleware added, _plus_ the logger middleware