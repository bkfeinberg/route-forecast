import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Favorite {
    name: string
    id: number
    associated_object_id: number
    associated_object_type: string
}

interface RideWithGpsInfoState {
    pinnedRoutes:Array<Favorite>
    token:string|null
    usePinnedRoutes:boolean
    loadingRoutes:boolean
}

const rideWithGpsInfoInitialState : RideWithGpsInfoState = {
    pinnedRoutes: [], token: null, usePinnedRoutes: false, loadingRoutes: false
}

const rideWithGpsInfoSlice = createSlice({
    name: 'rideWithGpsInfo',
    initialState : rideWithGpsInfoInitialState,
    reducers: {
        rwgpsTokenSet(state, action : PayloadAction<string|null>) {
            state.token = action.payload
        },
        pinnedRoutesSet(state, action:PayloadAction<Array<Favorite>>) {
            state.pinnedRoutes = action.payload
        },
        loadingPinnedSet(state, action:PayloadAction<boolean>) {
            state.loadingRoutes = action.payload
        },
        usingPinnedRoutesSet(state, action:PayloadAction<boolean>) {
            state.usePinnedRoutes = action.payload
        }
    }
})

export const {rwgpsTokenSet,pinnedRoutesSet,loadingPinnedSet,usingPinnedRoutesSet} = rideWithGpsInfoSlice.actions
export const rwgpsInfoReducer = rideWithGpsInfoSlice.reducer