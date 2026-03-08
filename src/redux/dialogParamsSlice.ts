import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { pinnedRoutesSet } from './rideWithGpsSlice'
import { rwgpsRouteLoaded, gpxRouteLoaded } from './routeInfoSlice'
import { stravaFetched, stravaFetchFailed } from './stravaSlice'
import {rwgpsRouteSetAsNumber, rwgpsRouteSet} from './routeParamsSlice'
import { forecastInvalidated } from './forecastSlice'
import * as Sentry from "@sentry/react";

interface ErrorMessage {
    message:string
    data: never
    error: never
}

interface ErrorDetails {
    data: {details:string}
    message: never    
    error: never
}

interface ErrorError {
    data: never
    message: never
    error:string
}

type ErrorObject = ErrorMessage | ErrorDetails | ErrorError | string

const getMessageFromError = 
(error : ErrorObject) : string => {
    if (typeof error === 'object') {
        if (error.message) return error.message
        if (error.data) return error.data.details
        if (error.error) return error.error
        return error.toString()
    } else return error
}

interface DialogParams {
    errorDetails: string | null
    errorMessageList: Array<string>
    succeeded: boolean
    shortUrl: string
    loadingSource: string | null
    fetchingForecast: boolean
    fetchingRoute: boolean,
    viewControls: boolean
}

const dialogParamsInitialState : DialogParams = {
    errorDetails: null,
    errorMessageList: [],
    succeeded: true, 
    shortUrl: 'click here to get a short URL',
    loadingSource: null, 
    fetchingForecast: false, 
    fetchingRoute: false,
    viewControls: false
}

export type ErrorPayload = Error|ErrorDetails|string|null

const dialogParamsSlice = createSlice({
    name: 'dialogParams',
    initialState:dialogParamsInitialState,
    reducers: {
        routeLoadingBegun(state, action : PayloadAction<string>) {
            state.loadingSource = action.payload
            state.fetchingRoute = true
        },
        viewingControls(state, action: PayloadAction<boolean>) {
            state.viewControls = action.payload
        },
        forecastFetchBegun(state) {
            state.fetchingForecast = true
        },
        forecastFetchFailed(state, action : PayloadAction<ErrorObject>) {
            state.fetchingForecast = false
            state.errorDetails = getMessageFromError(action.payload)
        },
        forecastFetchCanceled(state) {
            state.fetchingForecast = false
        },
        rwgpsRouteLoadingFailed(state, action : PayloadAction<string|{message:string}>) {
            state.fetchingRoute = false
            state.errorDetails = (typeof action.payload === 'object' ? action.payload.message : action.payload)
            state.succeeded = false
        },
        gpxRouteLoadingFailed(state, action : PayloadAction<string|{message:string}>) {
            state.fetchingRoute = false
            state.errorDetails = (typeof action.payload === 'object' ? action.payload.message : action.payload)
            state.succeeded = false
        },
        errorDetailsSet(state, action:PayloadAction<ErrorPayload>) {
            if (action.payload instanceof Error) {
                Sentry.metrics.count("errors", 1, {attributes:{message:action.payload.toString()}});
                state.errorDetails = action.payload.toString()
            } else if (!action.payload) {
                state.errorDetails = action.payload
            } else if (typeof action.payload === "string") {
                Sentry.metrics.count("errors", 1, {attributes:{message:action.payload}});
                state.errorDetails = action.payload
            } else if (action.payload.data) {
                Sentry.metrics.count("errors", 1, {attributes:{message:action.payload.data.details}});
                state.errorDetails = action.payload.data.details
            } else {
                Sentry.metrics.count("errors", 1, {attributes:{message:JSON.stringify(action.payload)}});
                state.errorDetails = JSON.stringify(action.payload)
            }
        },
        errorMessageListSet(state,action:PayloadAction<Array<string>>) {
            state.errorMessageList = action.payload
            state.fetchingForecast = false
        },
        errorMessageListAppend(state,action:PayloadAction<Array<string>>) {
            state.errorMessageList.concat(action.payload)
            state.fetchingForecast = false
        },
        lastErrorCleared(state) {
            if (state.errorMessageList.length > 0) {
                state.errorMessageList.shift()
            }
        },
        shortUrlSet(state, action:PayloadAction<string>) {
            state.shortUrl = action.payload
        },
        stravaErrorSet(state,action:PayloadAction<string>) {
            if (action.payload !== undefined && action.payload !== "" ) {
                state.errorDetails = `Error loading route from Strava: ${action.payload}`
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(pinnedRoutesSet, (state) => {
                state.errorDetails = null
            })
            .addCase(stravaFetched, (state) => {
                state.errorDetails = null
            })
            .addCase(stravaFetchFailed, (state, action) => {
                const errorMessage = typeof action.payload === 'object' ? action.payload.message : action.payload
                state.errorDetails = `Error loading activity from Strava: ${errorMessage}`
            })
            .addCase(rwgpsRouteLoaded, (state) => {
                state.fetchingRoute = false
                state.errorDetails = null
                state.succeeded = true
            })
            .addCase(gpxRouteLoaded, (state) => {
                state.fetchingRoute = false
                state.errorDetails = null
                state.succeeded = true
            })
            .addCase('forecast/forecastFetched', (state) => {
                state.fetchingForecast = false
                state.errorDetails = null
            })
            .addCase(rwgpsRouteSetAsNumber, (state) => {
                state.loadingSource = null
            }).addCase(rwgpsRouteSet, (state) => {
                state.loadingSource = null
            }).addCase(forecastInvalidated, (state) => {
                state.shortUrl = dialogParamsInitialState.shortUrl;
            })
    }
})

export const dialogParamsReducer = dialogParamsSlice.reducer
export const {routeLoadingBegun,forecastFetchBegun,
    forecastFetchFailed,forecastFetchCanceled,rwgpsRouteLoadingFailed,
    gpxRouteLoadingFailed,errorDetailsSet,errorMessageListSet,shortUrlSet,
    lastErrorCleared,stravaErrorSet, errorMessageListAppend,
    viewingControls} = dialogParamsSlice.actions
