import * as Sentry from "@sentry/react";
import {Suspense, lazy} from 'react';
import {connect, ConnectedProps} from 'react-redux';

import { routeLoadingModes } from '../../data/enums';
import type { RootState } from "../../redux/store";
import { useAppSelector } from "../../utils/hooks";

export const addBreadcrumb = (msg : string) => {
    Sentry.addBreadcrumb({
        category: 'loading',
        level: "info",
        message: msg
    })
}

const LoadableMap = lazy(() => {addBreadcrumb('loading map');return import(/* webpackChunkName: "Map" */ './RouteForecastMap')});

type PropsFromRedux = ConnectedProps<typeof connector>
type MapLoaderProps = PropsFromRedux & {
    maps_api_key: string
}
const MapLoader = (props : MapLoaderProps) => {
    const rwgpsRouteData = useAppSelector(state => state.routeInfo.rwgpsRouteData) || null
    const gpxRouteData = useAppSelector(state => state.routeInfo.gpxRouteData) || null
    // Validate API key
    if (!props.maps_api_key || props.maps_api_key.trim() === '') {
        return <div>Error: Google Maps API key is missing or invalid</div>;
    }
    
    // debug empty points and bounds
    let length = 0
    if (rwgpsRouteData && rwgpsRouteData[rwgpsRouteData.type] && rwgpsRouteData[rwgpsRouteData.type]['track_points']) {
        length = rwgpsRouteData[rwgpsRouteData.type]['track_points'].length
    } else if (gpxRouteData) {
        length = gpxRouteData.tracks[0].points.length
    }
    if (props.hasMap && props.hasRouteData) {
        Sentry.addBreadcrumb({
            category: 'load',
            level: 'info',
            message:`Loading map with ${length} route points`
        })
        return <Sentry.ErrorBoundary fallback={<h2>Something went wrong loading the map.</h2>}>
            <Suspense fallback={<div>Loading Map...</div>}>
                <LoadableMap {...props} />
            </Suspense>
        </Sentry.ErrorBoundary>;
    } else {
        return <div>Map for forecast</div>
    }
};

const mapStateToProps = (state : RootState) =>
    ({
        hasRouteData: (state.routeInfo.rwgpsRouteData || state.routeInfo.gpxRouteData || state.strava.activityStream),
        // TODO
        // this condition is not quite right -- it doesn't catch cases where we're in strava mode but no strava activity data has loaded
        // should change this and probably move it to a higher level component, when replacing the existing placeholder text with a splash screen or w/e
        hasMap: (state.forecast.forecast.length > 0 || state.uiInfo.routeParams.routeLoadingMode === routeLoadingModes.STRAVA)
    });

const connector = connect(mapStateToProps)
export default connector(MapLoader);
