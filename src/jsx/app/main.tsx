import '@mantine/core/styles/baseline.css';
import '@mantine/core/styles/default-css-variables.css'; // Import globals separately if needed
import '@mantine/core/styles/global.css'; // Import globals separately if needed

import '@mantine/core/styles/ScrollArea.css';
import '@mantine/core/styles/UnstyledButton.css'; 
import '@mantine/core/styles/Paper.css';
import '@mantine/core/styles/Popover.css';
import '@mantine/core/styles/CloseButton.css';
import '@mantine/core/styles/Group.css';
import '@mantine/core/styles/Loader.css';
import '@mantine/core/styles/Overlay.css';
import '@mantine/core/styles/ModalBase.css';
import '@mantine/core/styles/Input.css';
import '@mantine/core/styles/InlineInput.css';
import '@mantine/core/styles/Flex.css';
import '@mantine/core/styles/ActionIcon.css';
import '@mantine/core/styles/Typography.css';

import '@mantine/core/styles/Modal.css';
import '@mantine/core/styles/Button.css';
import '@mantine/core/styles/Checkbox.css';
import '@mantine/core/styles/Stack.css';
import '@mantine/core/styles/Combobox.css';
import '@mantine/core/styles/Group.css';
import '@mantine/core/styles/Table.css';
import '@mantine/core/styles/Text.css';
import '@mantine/core/styles/Card.css';
import '@mantine/core/styles/Title.css';
import '@mantine/core/styles/Drawer.css';
import '@mantine/core/styles/Switch.css';
import '@mantine/core/styles/Tooltip.css';
import '@mantine/core/styles/Notification.css';

import '@mantine/notifications/styles.css';

import 'Images/style.css';

import { MantineProvider, createTheme, Button } from '@mantine/core';
import * as classes from "../../static/mantine.module.css";

import "./i18n";
import ReactGA from "react-ga4";
import * as Sentry from "@sentry/react";
const { info } = Sentry.logger;
import {Info} from "luxon";
import queryString from 'query-string';
import React, {lazy,  ReactElement, Suspense,useEffect} from 'react';
import { useAppDispatch, useAppSelector } from "../../utils/hooks";
import type { AppDispatch } from "../../redux/store";
import  {useMediaQuery} from 'react-responsive';
import {useTranslation} from 'react-i18next'
import { stravaErrorSet, viewingControls } from "../../redux/dialogParamsSlice";
import { usingPinnedRoutesSet, rwgpsTokenSet } from "../../redux/rideWithGpsSlice";
import { stravaActivitySet, stravaRefreshTokenSet, stravaRouteSet, stravaTokenSet } from "../../redux/stravaSlice";
import { apiKeysSet, querySet, actionUrlAdded } from "../../redux/paramsSlice";
import { fetchAqiSet, zoomToRangeSet } from "../../redux/forecastSlice";
import { stopAfterLoadSet, rusaPermRouteIdSet, routeLoadingModeSet, startTimestampSet, rwgpsRouteSet, reset } from "../../redux/routeParamsSlice";
import { metricSet, displayControlTableUiSet } from "../../redux/controlsSlice";
import { defaultProvider, providerValues } from "../../redux/providerValues";
import type { DesktopUIProps } from "../DesktopUI";
import { Notifications } from '@mantine/notifications';

import Cookies from 'universal-cookie';

const theme = createTheme({
  components: {
    // @ts-ignore
    Button: Button.extend({ classNames: classes }),
  }
});

const reloadPage = () => {
    Sentry.addBreadcrumb({category:"No stack", level:"info", message:"reloadPage"})
    if (window && window["location"] && window.location["reload"]) {
        window.location.reload()
    }
}
  
type DesktopUIType = Promise<typeof import(/* webpackChunkName: "DesktopUI" */ '../DesktopUI')>
type DynamicDesktopUIType = DesktopUIType | Promise<{default:({ mapsApiKey, orientationChanged, setOrientationChanged }: DesktopUIProps) => ReactElement; }>
const LoadableDesktop = lazy(() : DynamicDesktopUIType => {
    return import( /* webpackChunkName: "DesktopUI" */'../DesktopUI')
    .then(module => ({ default: module.default }))
    .catch((error) => {
    setTimeout(() => reloadPage(), 5000);
    return { default: () => <div>{`Error ${error} loading the component. Window will reload in five seconds`}</div> };
})})
const LoadableMobile = lazy(() => {return import( /* webpackChunkName: "MobileUI" */'../MobileUI').catch((error) => {
    setTimeout(() => reloadPage(), 5000);
    return { default: () => <div>{`Error ${error} loading the component. Window will reload in five seconds`}</div> };
})})

import { routeLoadingModes } from '../../data/enums';

import {
    loadRouteFromURL,
    MutationWrapper,
} from "../../redux/loadRouteActions";
import { setPace, updateUserControls, setInterval, setWeatherProvider } from "../../redux/actions";
import { useForecastMutation, useGetAqiMutation } from '../../redux/forecastApiSlice';
import { inputPaceToSpeed,parseControls } from '../../utils/util';
import i18next from "i18next";

i18next.on('languageChanged', (lng) => {
    if (lng.startsWith('zh')) {ReactGA.event('chinese_detected')}
})

const checkCredentialsInterface = () => {
    return ('PasswordCredential' in window &&
        "credentials" in navigator && "store" in navigator.credentials && "get" in navigator.credentials &&
        "password" in PasswordCredential && "name" in PasswordCredential)
}

export const saveRwgpsCredentials = (token : string, cookies: Cookies) => {
    Sentry.addBreadcrumb({
        category: 'rwgps',
        level: 'info',
        message:'Saving RidewithGPS login data'
    })

    if (checkCredentialsInterface() && token) {

        // eslint-disable-next-line no-undef
        let credential = new PasswordCredential({
            id: 'ridewithgps',
            name:'Ride With Gps',
            password:token
        });

        navigator.credentials.store(credential).then(() => {
        console.info("Rwgps login info stored by the user agent.");
        }, (err) => {
            Sentry.captureException(err)
            cookies.set('rwgpsToken', token, { path: '/' });
            console.info('RideWithGps login info stored in cookie');
            });
    } else {
        cookies.set('rwgpsToken', token, { path: '/' });
        console.info('RideWithGps login info stored in cookie');
    }
};

const loadAndStoreRwgpsCredentialsViaCookie = (dispatch : AppDispatch, cookies: Cookies) => {
    const token = cookies.get('rwgpsToken');
    if (token) {
        dispatch(rwgpsTokenSet(token))
        saveRwgpsCredentials(token, cookies);
    }
}

const setupRideWithGps = async (dispatch : AppDispatch, cookies: Cookies) => {
    Sentry.addBreadcrumb({
        category: 'rwgps',
        level: 'info',
        message:'Loading RidewithGPS login information'
    })
    let credentials = null;
    if (checkCredentialsInterface()) {
        try {
            credentials = await navigator.credentials.get({password:true,mediation:"silent"});
            if (credentials === null) {
                console.info('No rwgps login info retrieved, trying cookie');
                loadAndStoreRwgpsCredentialsViaCookie(dispatch, cookies);
            } else {
                console.info('Rwgps login info retrieved from manager');
                if ("password" in credentials && credentials.password) {
                    dispatch(rwgpsTokenSet(credentials.password))
                    saveRwgpsCredentials(credentials.password, cookies);    
                }
            }
        } catch (err) {
            console.info(`failed to load rwgps login info with ${err}`)
            Sentry.captureException(err)
            loadAndStoreRwgpsCredentialsViaCookie(dispatch, cookies);
    }
    } else {
        console.info('Login info manager not supported, retrieved from cookie');
        loadAndStoreRwgpsCredentialsViaCookie(dispatch, cookies)
    }
}

type QueryParams = {
    controlPoints: string
    strava_access_token?: string
    strava_refresh_token? : string
    strava_token_expires_at? : number
    provider: string
    interval: number
    rwgpsRoute: string
    startTimestamp: string
    zone: string
    pace: string
    metric: boolean
    strava_activity: string
    strava_route: string
    strava_error: string
    strava_analysis: boolean
    rusa_route_id: string
    rwgpsToken: string
    stopAfterLoad: boolean,
    viewControls: boolean
}
const setupBrowserForwardBack = (dispatch : AppDispatch, origin : string,
     cookies : Cookies) => {
    if (typeof window !== 'undefined') {
        window.onpopstate = (event) => {
            Sentry.addBreadcrumb({
                    category: 'history',
                    level: "info",
                    message: JSON.stringify(event.state),
                    data: document.location
                })
            if (event.state == null) {
                // clear the state when back button takes us past any saved routes
                dispatch(reset())
                Sentry.addBreadcrumb({
                    category: 'reset',
                    level: 'info',
                    message:'Moving back and resetting state'
                })
            } else {
                Sentry.addBreadcrumb({
                    category: 'reset',
                    level: 'info',
                    message:'Moving through history'
                })
                // reload previous or next route when moving throw browser history with forward or back buttons
                let queryParams = queryString.parse(event.state, {parseBooleans: true, parseNumbers:true});
                dispatch(querySet({url:`${origin}/?${event.state}`,search:event.state}))
                ReactGA.event('browser_history')
                updateFromQueryParams(dispatch, queryParams as unknown as QueryParams, cookies);
            }
        }
    }
}

const getStravaToken = (queryParams : QueryParams, dispatch : AppDispatch, cookies: { [x: string]: any; set?: any; get?: any; }) => {
    if (queryParams.strava_access_token !== undefined && queryParams.strava_refresh_token && queryParams.strava_token_expires_at) {
        cookies.set('strava_access_token', queryParams.strava_access_token);
        cookies.set('strava_refresh_token', queryParams.strava_refresh_token);
        cookies.set('strava_token_expires_at', queryParams.strava_token_expires_at.toString());
        dispatch(stravaTokenSet({ token: queryParams.strava_access_token, expires_at: queryParams.strava_token_expires_at }))
        dispatch(stravaRefreshTokenSet(queryParams.strava_refresh_token))
        return queryParams.strava_access_token;
    } else {
        const stravaToken = cookies.get('strava_access_token');
        dispatch(stravaTokenSet({token:stravaToken, expires_at:cookies.get('strava_token_expires_at')}))
        dispatch(stravaRefreshTokenSet(cookies.get('strava_refresh_token')))
        return stravaToken;
    }
}

const hasProvider = (provider? : string) => {
    return provider && Object.keys(providerValues).includes(provider)
}

const hasZone = (zone? : string) => {
    return zone && Info.isValidIANAZone(zone);
}

const updateFromQueryParams = (dispatch : AppDispatch, queryParams : QueryParams, 
    cookies : Cookies) => {
    if (!queryParams) {
        return;
    }
    if (hasProvider(queryParams.provider)) {
        dispatch(setWeatherProvider(queryParams.provider))
    } else {
        const provider = cookies.get('provider');
        if (hasProvider(provider)) {
            dispatch(setWeatherProvider(provider!))
        } else {
            dispatch(setWeatherProvider(defaultProvider))
        }
    }
    dispatch(rwgpsRouteSet(queryParams.rwgpsRoute))
    getStravaToken(queryParams, dispatch, cookies);
    if (queryParams.startTimestamp) {
        if (hasZone(queryParams.zone)) {
            dispatch(startTimestampSet({ start: Number.parseInt(queryParams.startTimestamp), zone: queryParams.zone }))
        } else {
            dispatch(startTimestampSet({ start: Number.parseInt(queryParams.startTimestamp) }))
        }
    }
    if (queryParams.pace && inputPaceToSpeed[queryParams.pace.trim()]) {
        dispatch(setPace(queryParams.pace.trim()))
    } else {
        let lastPace = cookies.get('pace');
        if (lastPace) {
            dispatch(setPace(lastPace))
        }
    }
    dispatch(setInterval(queryParams.interval))
    dispatch(metricSet(queryParams.metric))
    dispatch(stravaActivitySet(queryParams.strava_activity))
    dispatch(stravaRouteSet(queryParams.strava_route))
    dispatch(stravaErrorSet(queryParams.strava_error))
    if (queryParams.strava_analysis !== undefined || queryParams.strava_route) {
        dispatch(routeLoadingModeSet(routeLoadingModes.STRAVA))
    }
    if (queryParams.rusa_route_id) {
        dispatch(rusaPermRouteIdSet(queryParams.rusa_route_id))
    }
    if (queryParams.rwgpsToken !== undefined) {
        dispatch(rwgpsTokenSet(queryParams.rwgpsToken))
        // if we have just received an auth token then we previously clicked show pinned routes
        dispatch(usingPinnedRoutesSet(true))
        saveRwgpsCredentials(queryParams.rwgpsToken, cookies);
    }
    dispatch(viewingControls(queryParams.viewControls))
    dispatch(stopAfterLoadSet(queryParams.stopAfterLoad))
}

interface RouteWeatherUIProps {
    search: string
    href: string
    action: string
    maps_api_key: string
    timezone_api_key: string
    bitly_token: string
    origin: string
}

const RouteWeatherUI = ({search, href, action, maps_api_key, timezone_api_key, bitly_token, origin} : RouteWeatherUIProps) => {
    const dispatch = useAppDispatch()
    const { i18n } = useTranslation()
    // const isDesktop = useMediaQuery({ minWidth: 1224 })
    const cookies = new Cookies(null, { path: '/' });
    let queryParams = queryString.parse(search, {parseBooleans: true, parseNumbers:false, types:{viewControls:'boolean'}});
    // temporarily log query params as received by DuckDuckGo
    if (window.navigator.userAgent.indexOf('Ddg') !== -1) {
        info(`Query params received by DuckDuckGo: ${search}`, queryParams);
    }
    const queryParamsAsObj = queryParams as unknown as QueryParams
    dispatch(querySet({url:href,search:search}))
    Sentry.setContext("query", {queryString:search})
    updateFromQueryParams(dispatch, queryParamsAsObj, cookies);
    dispatch(actionUrlAdded(action))
    dispatch(apiKeysSet({maps_api_key:maps_api_key,timezone_api_key:timezone_api_key, bitly_token:bitly_token}))
    setupRideWithGps(dispatch, cookies);
    setupBrowserForwardBack(dispatch, origin, cookies)
    dispatch(updateUserControls(queryParams.controlPoints?parseControls(queryParamsAsObj.controlPoints, true):[]))
    const zoomToRange = cookies.get('zoomToRange');
    dispatch(zoomToRangeSet(zoomToRange!==false))
    const fetchAqi = cookies.get('fetchAqi');
    dispatch(fetchAqiSet(fetchAqi))
    ReactGA.event('language_detected', {rp_language:i18n.resolvedLanguage});
    if (i18n.resolvedLanguage?.startsWith('fr')) {
        ReactGA.event('tutorial_begin')
    }
    if (i18n.resolvedLanguage?.startsWith('es')) {
        ReactGA.event('select_promotion', {creative_name:'es'})
    }
    if (i18n.resolvedLanguage?.startsWith('it')) {
        ReactGA.event('select_promotion', {creative_name:'it'})
    }
    return (
        <MantineProvider theme={theme}>
            <FunAppWrapperThingForHooksUsability maps_api_key={maps_api_key} queryParams={queryParamsAsObj} lang={i18n.language}/>
        </MantineProvider>
    )

}

export default React.memo(RouteWeatherUI)

const useLoadRouteFromURL = (queryParams : QueryParams, forecastFunc : MutationWrapper, aqiFunc : MutationWrapper, 
    lang: string, rwgpsRoute: string, stravaRoute: string) => {
    const dispatch = useAppDispatch()
    // the odd logic below deserves some explanation
    // there are two possible edge cases that we are guarding against:
    // case one: randoplan has no route in the url parameters, and the user enters one, checking the
    // query params for a route ensures that we don't trigger the code to load and run a forecast,
    // since this method is meant for when randoplan is invoked with a full url, but there will be
    // none in the query params in this case
    // case two: randoplan was invokved with a url containing a route, but after the forecast was run
    // the user clears the route - this method is invoked because the route _changed_, and it is
    // still set in the query params - but not in the value from current state
    // so only when the value in the query params and the value in the current redux state
    // are set do we load route and run forecast
    // Q: what if they're different? A problem? Something to ponder
    useEffect(() => {
        if ((rwgpsRoute && queryParams.rwgpsRoute && queryParams.rwgpsRoute === rwgpsRoute) || (stravaRoute && queryParams.strava_route)) {
            dispatch(loadRouteFromURL(forecastFunc, aqiFunc, lang))
        }
    }, [queryParams, rwgpsRoute, stravaRoute, forecastFunc, aqiFunc, lang])
}

const useLoadControlPointsFromURL = (queryParams: QueryParams) => {

    const dispatch = useAppDispatch()
    useEffect(() => {
        if (!("controlPoints" in queryParams) || queryParams.controlPoints === "") {
            dispatch(updateUserControls([]))
        } else {
            dispatch(updateUserControls(parseControls(queryParams.controlPoints, false)))
            dispatch(displayControlTableUiSet(true))
        }
    }, [queryParams])
}

const useSetPageTitle = () => {

    const routeInfo = useAppSelector(state => state.routeInfo)

    useEffect(() => {
        if (routeInfo.name !== '') {
            document.title = `Forecast for ${routeInfo.name}`;
        }
    }, [routeInfo.name])
}

interface FunWrapperProps {
    maps_api_key: string
    queryParams: QueryParams,
    lang: string
}
const FunAppWrapperThingForHooksUsability = ({maps_api_key, queryParams, lang} : FunWrapperProps) => {
    const [forecast] = useForecastMutation()
    const [getAqi] = useGetAqiMutation()
    const [orientationChanged, setOrientationChanged] = React.useState<boolean>(false)
    const [mobileOrientationChanged, setMobileOrientationChanged] = React.useState<boolean>(false)
    const screenOrientationType = (window.screen ? (window.screen.orientation ? window.screen.orientation.type : 'N/A') : 'N/A')
    const screenChangeListener = React.useCallback(
        (event : Event) => {
            // const type = event.target.type;
            // const angle = event.target.angle;
            // console.log(`ScreenOrientation change: ${type}, ${angle} degrees.`)
            setOrientationChanged(true)
            setMobileOrientationChanged(true)
        },
        [screenOrientationType]
    )
    const rwgpsRoute = useAppSelector(state => state.uiInfo.routeParams.rwgpsRoute)
    const stravaRoute = useAppSelector(state => state.strava.route)
    useEffect(() => {
        if (window.screen.orientation) {
            window.screen.orientation.onchange = screenChangeListener
        }
    }, [screenChangeListener])
    
    useSetPageTitle()
    useLoadRouteFromURL(queryParams, forecast, getAqi, lang, rwgpsRoute, stravaRoute)
    useLoadControlPointsFromURL(queryParams)
    const isLandscape = useMediaQuery({query:'(orientation:landscape)'})
    const isLargeEnough = useMediaQuery({query:'(min-width: 950px)'})
    return (
        <div>
            <Notifications autoClose={2000}/>
            {isLandscape && isLargeEnough && <Suspense fallback={<div>Loading Desktop UI...</div>}><LoadableDesktop mapsApiKey={maps_api_key} orientationChanged={orientationChanged} setOrientationChanged={setOrientationChanged}/></Suspense>}
            {(!isLargeEnough || !isLandscape) && <Suspense fallback={<div>Loading Mobile UI...</div>}><LoadableMobile mapsApiKey={maps_api_key} orientationChanged={mobileOrientationChanged} setOrientationChanged={setMobileOrientationChanged}/></Suspense>}
        </div>
    )
}
