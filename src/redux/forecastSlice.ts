import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { gpxRouteLoadingFailed } from './dialogParamsSlice'
import { defaultProvider } from './providerValues'
import { rwgpsRouteSet, reset } from './routeParamsSlice'
import { gpxRouteLoaded } from './routeInfoSlice'

export type Forecast = {
    temp:string
    feel: number
    humidity:number
    zone:string
    distance:number
    cloudCover:string
    windSpeed:string
    gust:string
    summary?: string
    relBearing: number
    windBearing: number
    time: string
    isControl: boolean
    aqi?: number
    precip: string
    lat: number
    lon: number
    rainy: boolean
    provider?: string
    stdDev?: number
}

export type ForecastInfo = {
    timeZoneId: string | null
    valid: boolean
    tableViewed: boolean
    mapViewed: boolean
    weatherProvider: string
    zoomToRange: boolean
    fetchAqi: boolean
    range: [number, number] | []
    forecast: Array<Forecast>
}

const forecastInitialState : ForecastInfo = {
    forecast: [],
    timeZoneId: null,
    valid: false,
    range: [],
    tableViewed: false,
    mapViewed: false,
    weatherProvider: defaultProvider,
    zoomToRange: true,
    fetchAqi:false
}
const forecastSlice = createSlice({
    name:'forecast',
    initialState:forecastInitialState,
    reducers: {
        forecastFetched(state, 
            action : PayloadAction<{timeZoneId:string, forecastInfo:{forecast:Array<Forecast>}}>) {
            state.forecast = action.payload.forecastInfo.forecast
            state.timeZoneId = action.payload.timeZoneId
            state.valid = true
            state.tableViewed = false
            state.mapViewed = false
            state.range = []
        },
        forecastAppended(state, action : PayloadAction<Forecast>) {
            state.forecast = state.forecast.concat(action.payload)
        },
        forecastInvalidated(state) {
            // debounce when called multiple times during a route load
            if (!state.valid) return
            state.valid = false
            state.forecast = []
            state.timeZoneId = null
            state.range = []
        },
        weatherRangeSet(state, action : PayloadAction<{start:string, finish:string}>) {
            state.range = [
                parseFloat(action.payload.start),
                parseFloat(action.payload.finish)
            ]
        },
        weatherRangeToggled(state,action : PayloadAction<{start:string, finish:string}>) {
            if (state.range[0] === parseFloat(action.payload.start) && state.range[1] === parseFloat(action.payload.finish)) {
                state.range = []
            } else {
                state.range = [
                    parseFloat(action.payload.start),
                    parseFloat(action.payload.finish)
                ]
            }
        },
        tableViewedSet(state) {
            state.tableViewed = true
        },
        mapViewedSet(state) {
            state.mapViewed = true
        },
        weatherProviderSet(state,action : PayloadAction<string>) {
            state.weatherProvider = action.payload
        },
        zoomToRangeSet(state,action : PayloadAction<boolean>) {
            state.zoomToRange = action.payload
        },
        zoomToRangeToggled(state) {
            state.zoomToRange = !state.zoomToRange
        },
        fetchAqiSet(state,action : PayloadAction<boolean>) {
            state.fetchAqi = action.payload
        },
        fetchAqiToggled(state) {
            state.fetchAqi = !state.fetchAqi
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(rwgpsRouteSet, (state) => {
                state.valid = false
                state.tableViewed = false
                state.mapViewed = false
                state.range = []
                state.forecast = []
            })
            .addCase(gpxRouteLoaded, (state) => {
                state.valid = false
            })
            .addCase(gpxRouteLoadingFailed, (state) => {
                state.valid = false
            })
            .addCase(reset, () => forecastInitialState)
    }
})

export const forecastReducer = forecastSlice.reducer
export const {forecastFetched,forecastInvalidated,weatherRangeSet,weatherRangeToggled,
    tableViewedSet,mapViewedSet,weatherProviderSet,zoomToRangeSet,zoomToRangeToggled,
    fetchAqiSet,fetchAqiToggled,forecastAppended} = forecastSlice.actions;
