import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { providerValues, defaultProvider } from './providerValues'
import { routeLoadingModes } from '../data/enums';
import type { Segment } from '../utils/gpxParser';
import { DateTime } from 'luxon';
import { stravaRouteSet } from './stravaSlice';
import { weatherProviderSet } from './forecastSlice';
import { getRouteNumberFromValue } from '../utils/util';
import { rwgpsRouteLoaded, gpxRouteLoaded } from './routeInfoSlice';
import { usingPinnedRoutesSet } from './rideWithGpsSlice';

const defaultIntervalInHours = 1;
const defaultPace = 'D';
const startHour = 7;

const initialStartTime = function() {
    let now = DateTime.now();
    if (now.hour > startHour) {
        now = now.set({day:now.day+1, hour:startHour, minute:0, second:0});
    }
    return now;
};

export type RouteParamsState = {
    interval: number
    min_interval: number
    canForecastPast: boolean
    pace: string
    rwgpsRoute: string
    rwgpsRouteIsTrip: boolean
    startTimestamp: number
    zone: string
    routeLoadingMode: number
    maxDaysInFuture: number
    stopAfterLoad: boolean
    rusaPermRouteId: string
    succeeded: boolean | null
    segment: Segment
    [index:string]:any
}

const checkedStartDate = (startDate : DateTime, canForecastPast : boolean) => {
    if (canForecastPast) return startDate;
    const now = DateTime.now();
    if (startDate < now) {
        return startDate.set({year:now.year, month:now.month, day:now.day}).plus({days:1});
    }
    return startDate;
}

const routeParamsInitialState : RouteParamsState = {
    interval: defaultIntervalInHours,
    min_interval:providerValues[defaultProvider].min_interval,
    canForecastPast:providerValues[defaultProvider].canForecastPast,
    pace: defaultPace,
    rwgpsRoute: '',
    rwgpsRouteIsTrip: false,
    startTimestamp: initialStartTime().toMillis(),
    // eslint-disable-next-line new-cap
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    routeLoadingMode: routeLoadingModes.RWGPS,
    maxDaysInFuture: providerValues[defaultProvider].max_days,
    stopAfterLoad: false,
    rusaPermRouteId: '',
    succeeded:null,
    segment:[0,0]
}
const routeParamsSlice = createSlice({
    name: 'routeParams',
    initialState: routeParamsInitialState,
    reducers: {
        stopAfterLoadSet(state, action : PayloadAction<boolean>) {
            state.stopAfterLoad = action.payload
        },
        rwgpsRouteSetAsNumber(state, action: PayloadAction<number>) {
            state.rwgpsRoute = action.payload.toString()
            state.succeeded = null
            state.segment = routeParamsInitialState.segment
        },
        rwgpsRouteSet(state,action : PayloadAction<string>) {
            if (action.payload) {
                let route = getRouteNumberFromValue(action.payload);
                state.rwgpsRoute = route
            } else {
                state.rwgpsRoute = routeParamsInitialState.rwgpsRoute;
                state.rwgpsRouteIsTrip = routeParamsInitialState.rwgpsRouteIsTrip;
            }
            state.succeeded = null
            state.segment = routeParamsInitialState.segment
        },
        rusaPermRouteIdSet(state,action : PayloadAction<string>) {
            state.rusaPermRouteId = action.payload
            state.routeLoadingMode = routeLoadingModes.RUSA_PERM
            state.rwgpsRouteIsTrip = routeParamsInitialState.rwgpsRouteIsTrip;
        },
        startTimeSet(state,action : PayloadAction<number>) {
            if (action.payload) {
                const start =  DateTime.fromMillis(action.payload, {zone:state.zone})
                if (start.isValid) {
                    state.startTimestamp = checkedStartDate(start, state.canForecastPast).toMillis()
                    state.stopAfterLoad = false
                }
            }
        },
        initialStartTimeSet(state,action : PayloadAction<{start:string, zone:string}>) {
            if (action.payload) {
                const start =  DateTime.fromISO(action.payload.start, {zone:!action.payload.zone?"local":action.payload.zone})
                if (start.isValid) {
                    state.startTimestamp = checkedStartDate(start, state.canForecastPast).toMillis()
                    state.zone = action.payload.zone
                    state.stopAfterLoad = false
                }
            }
        },
        startTimestampSet(state, action: PayloadAction<{ start: number, zone?: string }>) {
            if (action.payload) {
                const start = DateTime.fromSeconds(action.payload.start, { zone: action.payload.zone === undefined ? "local" : action.payload.zone })
                if (start.isValid) {
                    state.startTimestamp = checkedStartDate(start, state.canForecastPast).toMillis()
                }    
            }
        },
        timeZoneSet(state,action : PayloadAction<string>) {
            state.zone = action.payload
        },
        paceSet(state,action : PayloadAction<string>) {
            if (action.payload) {
                state.pace = action.payload
                state.stopAfterLoad = false
            }
        },
        intervalSet(state,action) {
            if (action.payload) {
                // protect against garbage in url
                const interval = parseFloat(action.payload);
                if (!isNaN(interval) && interval >= 0.25 && interval <= 2.0) {
                    state.interval = interval
                    state.stopAfterLoad = false
                }
                state.segment = routeParamsInitialState.segment
            }
        },
        segmentSet(state,action) {
            // start and end are in meters
            state.segment = action.payload
        },
        routeIsTripSet(state,action) {
            state.rwgpsRouteIsTrip = action.payload
        },
        routeLoadingModeSet(state,action) {
            if (action.payload === routeLoadingModes.RWGPS || action.payload === routeLoadingModes.STRAVA || action.payload === routeLoadingModes.RUSA_PERM) {
                state.routeLoadingMode = action.payload
            }
        },
        reset(state) {
            for (const [key, value] of Object.entries(routeParamsInitialState)) {
                state[key] = value
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(weatherProviderSet, (state, action) => {
                state.interval = Math.max(state.interval, providerValues[action.payload].min_interval)
                state.min_interval = providerValues[action.payload].min_interval
                state.maxDaysInFuture = providerValues[action.payload].max_days
                state.canForecastPast = providerValues[action.payload].canForecastPast
                state.startTimestamp = checkedStartDate(DateTime.fromMillis(state.startTimestamp, {zone:state.zone}), providerValues[action.payload].canForecastPast).toMillis()
            })
            .addCase(rwgpsRouteLoaded, (state, action) => {
                if (action.payload.route) {
                    state.segment[1] = action.payload.route.distance
                } else {
                    state.segment[1] = action.payload.trip.distance
                }
            })
            .addCase(gpxRouteLoaded, (state, action) => {
                state.segment = [state.segment[0], action.payload.tracks[0].distance.total*1000]
            })
            .addCase('routeInfo/routeDataCleared', (state) => {
                state.segment = routeParamsInitialState.segment
            }).addCase(stravaRouteSet, (state, action) => {
                if (action.payload && action.payload !== '') {
                    state.rwgpsRoute = routeParamsInitialState.rwgpsRoute
                }
            }).addCase(usingPinnedRoutesSet, (state, action) => {
                if (!action.payload) {
                    state.rwgpsRouteIsTrip = routeParamsInitialState.rwgpsRouteIsTrip;
                }
            })
    }
})

export const routeParamsReducer = routeParamsSlice.reducer
export const {stopAfterLoadSet,rwgpsRouteSet,startTimeSet,initialStartTimeSet,
        startTimestampSet,paceSet,intervalSet,routeIsTripSet,
        routeLoadingModeSet,reset, timeZoneSet, rusaPermRouteIdSet,
        segmentSet, rwgpsRouteSetAsNumber} = routeParamsSlice.actions
