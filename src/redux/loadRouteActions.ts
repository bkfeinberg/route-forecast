import type { RootState } from "../redux/store";
import type { AppDispatch } from "../redux/store";
import ReactGA from "react-ga4";
import { loadingFromUrlSet } from "./routeInfoSlice";
import { updateHistory } from "../jsx/app/updateHistory";
import * as Sentry from "@sentry/react";
import { routeLoadingBegun, rwgpsRouteLoadingFailed } from "./dialogParamsSlice";
import { loadRwgpsRoute } from '../utils/rwgpsUtilities';
import { rwgpsRouteLoaded } from "./routeInfoSlice";
import { displayControlTableUiSet, UserControl } from "./controlsSlice";
import { timeZoneSet } from "./routeParamsSlice";
import { updateUserControls, setWeatherProvider } from "./actions";
import { requestTimeZoneForRoute } from "../utils/forecastUtilities";
import { loadStravaRoute, loadStravaActivity } from "./loadFromStravaActions";
import { cancelForecast, forecastWithHook } from "./forecastActions";
import { DateTime } from "luxon";
import { providerValues, alternateProvider } from "./providerValues";
const { trace, debug, info, warn, error, fatal, fmt } = Sentry.logger;

const mergeControls = (oldCtrls : Array<UserControl>, newCtrls : Array<UserControl>) => {
    let oldCtrlsCopy = oldCtrls.slice()
    const merged = newCtrls.map(ctrl => {
        const matchingOldCtrl = oldCtrlsCopy.find(item => item.distance === ctrl.distance)
        if (matchingOldCtrl) {
            const result =  {name:ctrl.name, distance:ctrl.distance, 
                business:ctrl.business, lat:ctrl.lat, lon:ctrl.lon, duration:matchingOldCtrl.duration}
            oldCtrlsCopy = oldCtrlsCopy.filter( item => item.distance !== ctrl.distance)
            return result
        } else {
            return ctrl
        }
    })
    // add in any old controls that are not present
    return merged.concat(oldCtrlsCopy).sort((control1, control2) => control1.distance - control2.distance)
}

export const loadFromRideWithGps = function (routeNumber? : string, isTrip? : boolean, loadPOIs : boolean = true) {
    return function (dispatch : AppDispatch, getState: () => RootState) {
        return Sentry.startSpan({ name: "loadingRwgpsRoute" }, () => {
            routeNumber = routeNumber || getState().uiInfo.routeParams.rwgpsRoute
            ReactGA.event('login', { method: routeNumber });
            isTrip = isTrip || getState().uiInfo.routeParams.rwgpsRouteIsTrip
            dispatch(routeLoadingBegun('rwgps'));
            dispatch(cancelForecast())
            Sentry.addBreadcrumb({
                category: 'loading',
                level: "info",
                message: `Loading route ${routeNumber}`
            })            
            return loadRwgpsRoute(routeNumber, isTrip, getState().rideWithGpsInfo.token).then(async (routeData) => {
                Sentry.addBreadcrumb({
                    category: 'loading',
                    level: "info",
                    message: `Route ${routeNumber} has been loaded`
                })                
                dispatch(rwgpsRouteLoaded(routeData));
                import ("../utils/routeUtils").then(({extractControlsFromRoute}) => {
                    const extractedControls = extractControlsFromRoute(routeData, loadPOIs);
                    if (extractedControls.length !== 0) {
                        const oldControls = getState().controls.userControlPoints
                        if (oldControls.length === 0) {
                            dispatch(updateUserControls(extractedControls))
                        } else {
                            const merged = mergeControls(oldControls, extractedControls)
                            dispatch(updateUserControls(merged))
                        }
                        dispatch(displayControlTableUiSet(true))
                    }
                })

                const routeInfo = getState().routeInfo
                if (routeInfo.type === null) {
                    warn(`Route ${routeNumber} loaded with no type, cannot fetch time zone`);
                    return
                }
                const timeZoneResults = await requestTimeZoneForRoute(routeInfo,
                    DateTime.fromMillis(getState().uiInfo.routeParams.startTimestamp, { zone: getState().uiInfo.routeParams.zone }),
                    getState().params.timezone_api_key)
                if (timeZoneResults.result === "error") {
                    error(`Failed to load RWGPS route because of error ${timeZoneResults.error} fetching time zone`)
                    dispatch(rwgpsRouteLoadingFailed(timeZoneResults.error?timeZoneResults.error:"Unknown error fetching time zone"))
                } else {
                    Sentry.addBreadcrumb({category:'timezone',level:'info',message:`TimeZone API call returned ${timeZoneResults.result}`})
                    dispatch(timeZoneSet(timeZoneResults.result))
                }
            }, error => { return dispatch(rwgpsRouteLoadingFailed(error.message?error.message:error)) }
            );
        })
    };
};

const filterProvider = (provider : string, country : string, providerValues : any, alternateProvider: string) => {
    const providerInfo = providerValues[provider];
    if (providerInfo && providerInfo.usOnly && country !== "US") {
        warn("Provider not valid in the country of the route, using alternateProvider");    
        return alternateProvider;
    }
    return provider;
}

export type MutationWrapper = (request:{}) => {unwrap: () => Promise<any>}

export const loadRouteFromURL = (forecastFunc : MutationWrapper, aqiFunc : MutationWrapper, 
    lang: string) => {
    return async function(dispatch : AppDispatch, getState: () => RootState) {
        // ReactGA.event('login', {method:getState().uiInfo.routeParams.rwgpsRoute});
        dispatch(loadingFromUrlSet(true))
        if (getState().uiInfo.routeParams.rwgpsRoute !== '') {
            await dispatch(loadFromRideWithGps())
        } else if (getState().strava.route !== '') {
            trace(`Loading Strava route with id ${getState().strava.route} from URL parameter`);
            await dispatch(loadStravaRoute(getState().strava.route))
            trace(`Finished loading Strava route with id ${getState().strava.route} from URL parameter`);
        } else if (getState().uiInfo.routeParams.rusaPermRouteId !== '') {
            warn("RUSA perm route loaded but with no RideWithGPS route specified, cannot load", {route:getState().uiInfo.routeParams.rusaPermRouteId})
        }
        const errorDetails = getState().uiInfo.dialogParams.errorDetails
        if (getState().uiInfo.routeParams.stopAfterLoad) {
            ReactGA.event('search', {search_term:getState().uiInfo.routeParams.rwgpsRoute})
        }
        // disallow provider not valid in the country of the route
        const country = getState().routeInfo.country;
        const requestedProvider = getState().forecast.weatherProvider;
        const provider = filterProvider(requestedProvider, country, providerValues, alternateProvider);
        dispatch(setWeatherProvider(provider));

        if (errorDetails === null && !getState().uiInfo.routeParams.stopAfterLoad) {
            // do we actually have a route
            if (!getState().routeInfo.rwgpsRouteData && !getState().routeInfo.gpxRouteData) {
                if (getState().uiInfo.dialogParams.fetchingRoute) {
                    warn("Race condition: forecast invoked before route finished loading for " + getState().strava.route);
                } else {
                    error(
                        `Invoking forecast with no route data loaded for ${getState().uiInfo.routeParams.rwgpsRoute} ${getState().strava.route} ${getState().uiInfo.routeParams.rusaPermRouteId}`,
                        {url:window.location.href})
                }
                return
            }
            if (!getState().uiInfo.routeParams.zone) {
                error(`Invoking forecast with no time zone for ${getState().uiInfo.routeParams.rwgpsRoute} ${getState().strava.route} ${getState().uiInfo.routeParams.rusaPermRouteId}`)
                return
            }
            await forecastWithHook (forecastFunc, aqiFunc, dispatch, getState, lang)
            const queryString = getState().params.queryString
            const searchString = getState().params.searchString
            if (queryString && searchString) {
                updateHistory(queryString, searchString, true);
            }
            if (getState().strava.activity && getState().strava.activity !== '') {
                dispatch(loadStravaActivity())
            }
        }
        dispatch(loadingFromUrlSet(false))
    }
}