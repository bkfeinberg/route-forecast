import type { RootState } from "../redux/store";
import type { AppDispatch } from "../redux/store";
import ReactGA from "react-ga4";
import * as Sentry from "@sentry/react";
import { routeLoadingBegun } from "./dialogParamsSlice";
import { gpxRouteLoaded } from "./routeInfoSlice";
import { stravaFetchBegun, stravaFetched, stravaFetchFailed, stravaActivitySet, stravaTokenSet } from "./stravaSlice";
import { stravaErrorSet, errorDetailsSet, gpxRouteLoadingFailed } from "./dialogParamsSlice";
import { Api } from 'rest-api-handler';
import queryString from 'query-string'
import { stravaAuthApiSlice } from '../redux/stravaAuthApiSlice'

const getStravaParser = async function() {
    const parser = await import(/* webpackChunkName: "StravaRouteParser" */ '../utils/stravaRouteParser');
    return parser.default;
};

const stravaTokenTooOld = (expires_at : number) => {
    return (expires_at! < Math.round(Date.now()/1000));
};

const refreshOldToken = (dispatch : AppDispatch, getState: () => RootState, refresh_token: string, expires_at: number|null) => {
    if (!expires_at || stravaTokenTooOld(expires_at)) {
        return new Promise<string|null>((resolve, reject) => {
            fetch(`/refreshStravaToken?refreshToken=${refresh_token}`).then(response => {
                if (response.status === 200) {
                    return response.json();
                }
            }).then(response => {
                if (response === undefined) {
                    dispatch(stravaErrorSet(Error("Received undefined response from Strava auth service")));
                    reject(Error("Received undefined response from Strava auth service"));
                }
                else {
                    dispatch(stravaTokenSet({token:response.access_token, expires_at:response.expires_at}));
                    resolve(response.access_token);
                }
            }, error => {
                dispatch(stravaErrorSet(error));
                reject(error);
            });
        });
    } else {
        return new Promise<string|null>((resolve) => {resolve(getState().strava.access_token)});
    }
}

const authenticate = (routeId : string) => {
    let params = queryString.parse(location.search);
    params['strava_route'] = routeId;
    window.location.href = '/stravaAuthReq?state=' + encodeURIComponent(JSON.stringify(params));
}

const authenticateActivity = (activityId : string) => {
    let params = queryString.parse(location.search);
    params['strava_activity'] = activityId;
    window.location.href = '/stravaAuthReq?state=' + encodeURIComponent(JSON.stringify(params));
}

export const loadStravaActivity = function() {
    return async function (dispatch : AppDispatch, getState: () => RootState) {
        const parser = await getStravaParser().catch((err) => {
            dispatch(stravaFetchFailed(err));
            return null
        });
        // handle failed load, error has already been dispatched
        if (parser == null) {
            return Promise.resolve(Error('Cannot load parser'));
        }
        const refresh_token = getState().strava.refresh_token
        const expires_at = getState().strava.expires_at
        const activityId = getState().strava.activity
        if (!refresh_token) {
            return authenticateActivity(activityId)
        }
        const access_token = await refreshOldToken(dispatch, getState, refresh_token, expires_at)
        if (!access_token) {
            dispatch(stravaFetchFailed(Error("Failed to get Strava access token")));
            dispatch(stravaActivitySet(''))
            return
        }
        dispatch(stravaFetchBegun());
        ReactGA.event('login', {method:activityId});
        return parser.fetchStravaActivity(activityId, access_token).then(result => {
            dispatch(stravaFetched(result));
        }).catch(error => {
            dispatch(stravaFetchFailed(error));
            dispatch(stravaActivitySet(''))
        });

    }
}

type ModuleType = Promise<any>

export const componentLoader = (lazyComponent : ModuleType, attemptsLeft : number) : ModuleType => {
    return new Promise((resolve, reject) => {
        Sentry.addBreadcrumb({category:'loading',level:'info',message:'in component loader'})
        return lazyComponent
            .then(resolve)
            .catch((error : Error)=>{
                // let us retry after 1500 ms
                setTimeout(() => {
                    Sentry.addBreadcrumb({category:"No stack", level:"info", message:"componentLoader"})
                    if (attemptsLeft === 1) {
                        // instead of rejecting reload the window
                        Sentry.captureException(error);
                        if (!navigator.userAgent.includes("jsdom")) {
                            window.location.reload();
                        }
                        return;
                    }
                    componentLoader(lazyComponent, attemptsLeft - 1).then(resolve, reject);
                }, 1500)
            })
    });
};

const getRouteParser = async function () {
    Sentry.addBreadcrumb({
        category: 'load',
        level: 'info',
        message:'Loading GPX parser module'
    })

    const parser = await componentLoader(import(/* webpackChunkName: "RwgpsParser" */ '../utils/gpxParser'), 5)
    return parser.default;
};

const loadGpxRoute = function(gpxFileData : string) {
    return async function (dispatch : AppDispatch) {
        const parser = await getRouteParser().catch((err) => {dispatch(gpxRouteLoadingFailed(err));return null});
        // handle failed load, error has already been dispatched
        if (parser == null) {
            return Promise.resolve(Error('Cannot load parser'))
        }
        const parsedResults = parser.loadGpxFile(gpxFileData)
        if (parsedResults.gpxData) {
            dispatch(gpxRouteLoaded(parsedResults.gpxData));
        } else if (parsedResults.error) {
            dispatch(gpxRouteLoadingFailed(parsedResults.error))
        }
    }
}

export const loadStravaRoute = (routeId : string) => {
    return async function (dispatch : AppDispatch, getState: () => RootState) {
        routeId = routeId || getState().strava.route
        // ReactGA.event('login', {method:routeId});
        ReactGA.event('sign_up', {method:routeId});
        dispatch(routeLoadingBegun('gpx'));
        await Sentry.startSpan({ name: "loadingStravaRoute" }, async () => {
            const api = new Api('https://www.strava.com/api/v3', [(response) => Promise.resolve(response.text())])
            const refresh_token = getState().strava.refresh_token
            const expires_at = getState().strava.expires_at
            if (!refresh_token) {
                return authenticate(routeId)
            }
            const access_token = await refreshOldToken(dispatch, getState, refresh_token, expires_at)
            if (!access_token) {
                authenticate(routeId)
            }
            api.setDefaultHeader('Authorization', `Bearer ${access_token}`)
            try {
                const routeInfo = await api.get(`routes/${routeId}/export_gpx`)
                if (!routeInfo || typeof routeInfo !== 'string' || routeInfo.trim().length === 0) {
                    dispatch(errorDetailsSet('Error fetching Strava route: Received empty or invalid data from Strava.'));
                } else if (routeInfo.charAt(0) === '{') {
                    try {
                        const errorJson = JSON.parse(routeInfo);
                        const message = errorJson.message || 'Unknown Strava error';
                        dispatch(errorDetailsSet(`Error fetching Strava route: ${message}`));
                    } catch (e) {
                        dispatch(errorDetailsSet('Error fetching Strava route: Received an unparsable JSON error from Strava.'));
                    }
                } else if (routeInfo.includes('<gpx') || routeInfo.includes('<?xml')) {
                    await dispatch(loadGpxRoute(routeInfo));
                } else {
                    dispatch(errorDetailsSet('Error fetching Strava route: Data received from Strava was not recognized as GPX.'));
                }
            } catch (err : any) {
                dispatch(errorDetailsSet(`Error fetching Strava route: ${err.details}`))
            }
        })
    }
}
