import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getRouteNumberFromValue } from '../utils/util';
import { StravaActivityData, StravaActivityStream } from '../utils/stravaRouteParser';
import { reset } from './routeParamsSlice';
import { rwgpsRouteSet } from './routeParamsSlice';
import { stravaErrorSet } from './dialogParamsSlice';
const defaultAnalysisIntervalInHours = 1;

const getAnalysisIntervalFromRouteDuration = (durationInHours: number) => {
    if (durationInHours > 72) {
        return 24;
    }
    else if (durationInHours > 59) {
        return 12;
    }
    else if (durationInHours > 39) {
        return 8;
    }
    else if (durationInHours > 29) {
        return 6;
    }
    else if (durationInHours > 19) {
        return 4;
    }
    else if (durationInHours > 11)  {
        return 2;
    }
    else {
        return 1;
    }
};

type StravaState = {
    analysisInterval: number
    activity: string
    route: string
    access_token: string | null
    refresh_token: string | null
    expires_at: number | null
    fetching: boolean
    activityData: StravaActivityData | null
    activityStream: StravaActivityStream | null
    subrange: [number,number] | []
}

const stravaInitialState : StravaState = {
    analysisInterval: defaultAnalysisIntervalInHours,
    activity: '',
    route: '',
    access_token: null,
    refresh_token: null,
    expires_at: null,
    fetching: false,
    activityData: null,
    activityStream: null,
    subrange:[]
}

const stravaSlice = createSlice({
    name:'strava',
    initialState: stravaInitialState,
    reducers: {
        stravaTokenSet(state,action:PayloadAction<{token:string,expires_at:number}>) {
            if (action.payload && action.payload.token) {
                state.access_token = action.payload.token
                state.expires_at = action.payload.expires_at
            }
        },
        stravaAccessTokenClear(state) {
            state.access_token = null
        },
        stravaRefreshTokenClear(state) {
            state.refresh_token = null
        },
        stravaRefreshTokenSet(state,action:PayloadAction<string>) {
            if (action.payload) {
                state.refresh_token = action.payload
            }
        },
        stravaActivitySet(state,action:PayloadAction<string>) {
            if (action.payload !== undefined) {
                const newValue = getRouteNumberFromValue(action.payload)
                state.activity = newValue
                state.activityData = null
                state.activityStream = null

                state.subrange = []
            }
        },
        stravaRouteSet(state,action:PayloadAction<string>) {
            if (action.payload !== undefined) {
                state.route = getRouteNumberFromValue(action.payload)
            }
        },
        stravaFetchBegun(state) {
            state.fetching = true
        },
        stravaFetched(state,action:PayloadAction<{activity:StravaActivityData,stream:StravaActivityStream}>) {
            state.fetching = false
            state.activityData = action.payload.activity
            state.activityStream = action.payload.stream
            state.analysisInterval = getAnalysisIntervalFromRouteDuration(action.payload.activity.elapsed_time/3600)
        },
        stravaFetchFailed(state,action:PayloadAction<{message:string}>) {
            const errorMessage = typeof action.payload === 'object' ? action.payload.message : action.payload
            state.fetching = false
            if (errorMessage === "Authorization Error") {
                state.access_token = null
            }
        },
        analysisIntervalSet(state,action:PayloadAction<string>) {
            state.analysisInterval = parseFloat(action.payload)
            state.subrange = []
        },
        mapSubrangeSet(state,action:PayloadAction<{start:string,finish:string}>) {
            state.subrange = [
                parseFloat(action.payload.start),
                parseFloat(action.payload.finish)
            ]
        },
        mapRangeToggled(state,action:PayloadAction<{start:string,finish:string}>) {
            const start = parseFloat(action.payload.start)
            const finish = parseFloat(action.payload.finish)
            if (state.subrange[0] === start && state.subrange[1] === finish) {
                state.subrange = []
            } else {
                state.subrange = [
                    start,
                    finish
                ]
                }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(rwgpsRouteSet, (state,action) => {
                if (action.payload && action.payload !== '') {
                    state.activity = stravaInitialState.activity
                    state.route = stravaInitialState.route
                    state.activityData = stravaInitialState.activityData
                    state.activityStream = stravaInitialState.activityStream
                    state.subrange = stravaInitialState.subrange    
                }
        })
            .addCase(stravaErrorSet, (state, action: PayloadAction<string|Error>) => {
                if (action.payload !== undefined && action.payload !== "" ) {
                    state.access_token = null
                    state.refresh_token = null
                }
            })
            .addCase(reset, () => stravaInitialState)
    }
})

export const stravaReducer = stravaSlice.reducer
export const {stravaTokenSet,stravaAccessTokenClear,stravaRefreshTokenClear,stravaRefreshTokenSet,stravaActivitySet,stravaFetchBegun,
    stravaFetched,stravaFetchFailed,analysisIntervalSet,mapSubrangeSet,mapRangeToggled,
    stravaRouteSet} = stravaSlice.actions
