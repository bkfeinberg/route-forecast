import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getRwgpsRouteName, getGpxRouteName } from '../utils/util';
import type { GpxPoint, RwgpsCoursePoint, RwgpsPoint, RwgpsPoi } from '../utils/gpxParser';
import { v4 as uuidv4 } from 'uuid';

const routeInfoInitialState : RouteInfoState = {
    name: '',
    rwgpsRouteData: null,
    gpxRouteData: null,
    loadingFromURL: false,
    distanceInKm: 0,
    canDoUserSegment:false,
    type: "none",
    routeUUID: null,
    zoneCopy: Intl.DateTimeFormat().resolvedOptions().timeZone,
    country: 'US'
}

export interface RwgpsRoute {
    type: "route",
    route: {
        country_code: string;
        distance: number,
        name: string,
        track_points: RwgpsPoint[]
        course_points: Array<RwgpsCoursePoint>
        points_of_interest: Array<RwgpsPoi>
        id: number
    },
    trip?: never,
    [index:string]:any
}

export interface RwgpsTrip {
    trip: {
        country_code: string;
        distance: number,
        name: string,
        track_points: RwgpsPoint[]
        course_points: Array<RwgpsCoursePoint>
        points_of_interest: Array<RwgpsPoi>
        id: number
    },
    route?: never,
    type: "trip",
    [index:string]:any
}

export interface GpxRouteData {
    name: string
    tracks: Array<{
        distance: {
            total: number
        },
        points: Array<GpxPoint>,
        name: string,
        link: string
    }>
    type: "gpx"
}

export interface BaseRouteInfoState  {
    name: string,
    loadingFromURL: boolean,
    distanceInKm: number,
    canDoUserSegment: boolean,
    type: "rwgps" | "gpx" | "none"
    routeUUID: string | null
    zoneCopy: string
    [index:string]:any
}

interface RwgpsRouteInfoState extends BaseRouteInfoState {
    type: "rwgps"
    rwgpsRouteData: RwgpsRoute | RwgpsTrip
    gpxRouteData: null
}

interface GpxRouteInfoState extends BaseRouteInfoState {
    type: "gpx"
    rwgpsRouteData: null
    gpxRouteData: GpxRouteData
}

export interface NullRouteInfoState extends BaseRouteInfoState {
    // type: "none"
    // rwgpsRouteData: never
    // gpxRouteData: never
}

type RwGpsData = RwgpsRoute | RwgpsTrip
export type RouteInfoState = RwgpsRouteInfoState | GpxRouteInfoState | NullRouteInfoState

type GpxRoutePayload = {
    gpx: GpxRouteData,
    country: string
}
const routeInfoSlice = createSlice({
    name:'routeInfo',
    initialState: routeInfoInitialState,
    reducers:{
        rwgpsRouteLoaded(state, action: PayloadAction<RwGpsData>) {
            state.routeUUID = uuidv4()
            state.rwgpsRouteData = action.payload
            state.type = "rwgps"
            state.gpxRouteData = routeInfoInitialState.gpxRouteData
            state.name = getRwgpsRouteName(action.payload)
            if (action.payload.route) {
                state.distanceInKm = action.payload.route.distance/1000
                state.canDoUserSegment = action.payload.route.track_points[0] && action.payload.route.track_points[0].d !== undefined
                state.country = action.payload.route.country_code
            } else {
                state.distanceInKm = action.payload.trip.distance/1000
                state.canDoUserSegment = action.payload.trip.track_points[0] && action.payload.trip.track_points[0].d !== undefined
                state.country = action.payload.trip.country_code
            }
        },
        gpxRouteLoaded(state, action : PayloadAction<GpxRoutePayload>) {
            state.routeUUID = uuidv4()
            state.type = "gpx"
            state.gpxRouteData = action.payload.gpx
            state.gpxRouteData.type = "gpx"
            state.rwgpsRouteData = routeInfoInitialState.rwgpsRouteData
            state.name = getGpxRouteName(action.payload.gpx)
            state.distanceInKm = action.payload.gpx.tracks[0].distance.total/1000
            state.country = action.payload.country
        },
        routeDataCleared(state) {
            const {rwgpsRouteData, gpxRouteData, name, type, distanceInKm, routeUUID} = routeInfoInitialState
            const resetState = {rwgpsRouteData, gpxRouteData, name, type, distanceInKm, routeUUID}
            Object.assign(state, resetState)
        },
        loadingFromUrlSet(state, action : PayloadAction<boolean>) {
            state.loadingFromURL = action.payload
        }
    },
    extraReducers: (builder) => {
        builder.addCase("routeParams/rwgpsRouteSet", (state) => {
            state.rwgpsRouteData = routeInfoInitialState.rwgpsRouteData
            state.gpxRouteData = routeInfoInitialState.gpxRouteData
            state.name = routeInfoInitialState.name
            state.distanceInKm = routeInfoInitialState.distanceInKm
            state.type = routeInfoInitialState.type
        })
            .addCase("strava/stravaRouteSet", (state) => {
                state.rwgpsRouteData = routeInfoInitialState.rwgpsRouteData
                state.gpxRouteData = routeInfoInitialState.gpxRouteData
                state.name = routeInfoInitialState.name
                state.distanceInKm = routeInfoInitialState.distanceInKm
                state.type = routeInfoInitialState.type
            })
            .addCase("routeParams/reset", () => routeInfoInitialState)
            .addCase("routeParams/startTimeSet", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("routeParams/initialStartTimeSet", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("routeParams/startTimestampSet", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("routeParams/timeZoneSet", (state, action) => {
                //@ts-ignore
                if (state.zoneCopy !== action.payload) {
                    state.routeUUID = uuidv4()
                    //@ts-ignore
                    state.zoneCopy = action.payload
                }
            })
            .addCase("routeParams/paceSet", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("routeParams/intervalSet", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("routeParams/segmentSet", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("controls/controlAdded", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("controls/controlRemoved", (state) => {
                state.routeUUID = uuidv4()
            })
            .addCase("controls/userControlsUpdated", (state) => {
                state.routeUUID = uuidv4()
            })
    }
})

export const routeInfoReducer = routeInfoSlice.reducer
export const {rwgpsRouteLoaded, gpxRouteLoaded, routeDataCleared,loadingFromUrlSet} = routeInfoSlice.actions