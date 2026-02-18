import "./DesktopUI.css"

import React, { Suspense,useState, lazy } from "react";
import type { SetStateAction, Dispatch } from "react";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import { routeLoadingModes } from "../data/enums";
import { useDelay, usePrevious, useValueHasChanged, useWhenChanged } from "../utils/hooks";
const ForecastSettings = React.lazy(() => import("./ForecastSettings/ForecastSettings"));
import InstallExtensionButton from "./InstallExtensionButton";
import MapLoader, {addBreadcrumb} from "./Map/MapLoader";
const PaceTable = React.lazy(() => import("./resultsTables/PaceTable"));
import RouteInfoForm from "./RouteInfoForm/RouteInfoForm";
import { RouteTitle } from "./shared/RouteTitle";
import { TransitionWrapper } from "./shared/TransitionWrapper";
import { TitleScreen } from "./TitleScreen";
import { TopBar } from "./TopBar/TopBar";
import LangSwitcher from "./app/LangSwitcher";
import {useTranslation} from 'react-i18next'
import { lastErrorCleared } from '../redux/dialogParamsSlice'
import DisplayErrorList from "./app/DisplayErrorList";
import * as Sentry from "@sentry/react"
import '@mantine/core/styles/Loader.css';
import { Loader } from "@mantine/core";

export type DesktopUIProps = {
    mapsApiKey: string
    orientationChanged: boolean
    setOrientationChanged: Dispatch<SetStateAction<boolean>>
}
const LoadableForecastTable = lazy(() => { 
    addBreadcrumb('loading forecast table'); 
    return Promise.all([
        import(/* webpackChunkName: "ForecastTable" */ './resultsTables/ForecastTable'),
        import(/* webpackChunkName: "ForecastTable" */ './resultsTables/WeatherCorrections')
    ]).then(([forecastTableModule]) => forecastTableModule);});

const DesktopUI = ({mapsApiKey, orientationChanged, setOrientationChanged} : DesktopUIProps) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const titleRouteInfo = t("titles.routeInfo")
    const titleForecastSettings = t("titles.forecastSettings")
    const titleForecast = t("titles.forecast")
    const titlePaceAnalyis = t("titles.paceAnalysis")
    const sidePaneOptions = [
        {title: titleRouteInfo, content: <Sentry.ErrorBoundary fallback={<h2>Something went wrong loading the route selector.</h2>}><RouteInfoForm /></Sentry.ErrorBoundary>},
        {title: titleForecastSettings, content: <Sentry.ErrorBoundary fallback={<h2>Something went wrong loading the forecast settings.</h2>}><Suspense fallback={<div>Loading forecast settings</div>}><ForecastSettings/></Suspense></Sentry.ErrorBoundary>},
        {title: titleForecast, content: <Sentry.ErrorBoundary fallback={<h2>Something went wrong loading the forecast.</h2>}><Suspense fallback={<div>Loading ForecastTable...</div>}>{<LoadableForecastTable/>}</Suspense></Sentry.ErrorBoundary>},
        {title: titlePaceAnalyis, content: <Sentry.ErrorBoundary fallback={<h2>Something went wrong loading the table of paces.</h2>}>{<Suspense fallback={<div>Loading pace table...</div>}><PaceTable/></Suspense>}</Sentry.ErrorBoundary>}
    ]
    const [
        activeSidePane,
        setActiveSidePane
    ] = useState(0)
    const sidebarWidth = 703

    const rwgpsRouteData = useAppSelector(state => state.routeInfo.rwgpsRouteData)
    const gpxRouteData = useAppSelector(state => state.routeInfo.gpxRouteData)
    const routeData = rwgpsRouteData ? rwgpsRouteData : gpxRouteData
    const stravaActivityData = useAppSelector(state => state.strava.activityData)
    const forecastData = useAppSelector(state => state.forecast.forecast)
    const errorMessageList = useAppSelector(state => state.uiInfo.dialogParams.errorMessageList)
    const viewingControls = useAppSelector(state => state.uiInfo.dialogParams.viewControls)

    const closeErrorList = () => {
        dispatch(lastErrorCleared())
    }
    
    const panesVisible = new Set<string>()
    panesVisible.add(titleRouteInfo)
    if (routeData !== null) {
        panesVisible.add(titleForecastSettings)
    }
    if (forecastData.length > 0) {
        panesVisible.add(titleForecast)
    }
    if (stravaActivityData !== null) {
        panesVisible.add(titlePaceAnalyis)
    }

    useWhenChanged(routeData, () => setActiveSidePane(sidePaneOptions.findIndex(option => option.title === titleForecastSettings)))
    useWhenChanged(forecastData, () => setActiveSidePane(sidePaneOptions.findIndex(option => option.title === titleForecast)),
     forecastData.length > 0 && !viewingControls)
    useWhenChanged(stravaActivityData, () => setActiveSidePane(sidePaneOptions.findIndex(option => option.title === titlePaceAnalyis)))
    if (activeSidePane !== 0 && routeData === null && forecastData.length === 0 && !stravaActivityData) {
        setActiveSidePane(0)
    }

    React.useEffect(() => {
        if (orientationChanged) {
            const routeDataPane = sidePaneOptions.findIndex(option => option.title === titleForecastSettings)
            const forecastPane = sidePaneOptions.findIndex(option => option.title === titleForecast)
            if (forecastData.length > 0 && activeSidePane !== forecastPane) {
                setActiveSidePane(forecastPane)
            } else if (routeData && activeSidePane !== routeDataPane)  {
                setActiveSidePane(routeDataPane)
            }
        }    
    }, [orientationChanged, forecastData, routeData])

    React.useEffect(() => {
        if (orientationChanged) {
            setOrientationChanged(() => false)
        }
    }, [orientationChanged])

    const routeLoadingMode = useAppSelector(state => state.uiInfo.routeParams.routeLoadingMode)
    const hasStravaRoute = useAppSelector(state => state.strava.route) !== ''
    const mapDataExists = (routeLoadingMode === routeLoadingModes.RWGPS ||
         routeLoadingMode === routeLoadingModes.RUSA_PERM || 
         (routeLoadingMode === routeLoadingModes.STRAVA && hasStravaRoute)) ?
     (forecastData.length > 0) : stravaActivityData !== null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '97vh' }}>
            {!mapDataExists ? <InstallExtensionButton /> : null}
            <div style={{ display: 'flex'/*,  flexShrink: 0 */ }} >
                <TopBar
                    sidePaneOptions={sidePaneOptions.map(({ title }) => title)}
                    activeSidePane={activeSidePane}
                    setActiveSidePane={setActiveSidePane}
                    sidebarWidth={sidebarWidth}
                    panesVisible={panesVisible}
                />
            </div>
            <div style={{ display: "flex", flex: 1, flexGrow: 8, minHeight: '0px' }}>
                <div style={{ maxHeight: '100%', overflowY: 'scroll', width: `${sidebarWidth}px` }}>
                    <Sidebar sidePaneOptions={sidePaneOptions} activeSidePane={activeSidePane} sidebarWidth={sidebarWidth} />
                </div>
                <DisplayErrorList errorList={errorMessageList} onClose={closeErrorList} />
                <div style={{
                    flexGrow: 1,
                    maxHeight: "100%",
                    borderLeft: "1px solid transparent",
                    borderImage: "linear-gradient(to bottom, grey , transparent)",
                    borderImageSlice: 1
                }}>
                    {
                        (mapDataExists) ?
                            <MapLoader maps_api_key={mapsApiKey} /> :
                            <TitleScreen />
                    }
                </div>
            </div>
            <div style={{ flexShrink: 0 }}>
                <LangSwitcher />
            </div>
        </div>
    );
};

export const useLoadingFromURLStatus = () => {
    const delay = 1000

    const loadingFromURL = useAppSelector(state => state.routeInfo.loadingFromURL)
    const started = useValueHasChanged(loadingFromURL, false)
    const finished = useValueHasChanged(loadingFromURL, true)
    const delayFinished = useDelay(delay, finished) || !started

    return [
        started,
         finished,
        delayFinished
    ]
}

type SidebarProps = {
    sidePaneOptions: Array<{content:React.JSX.Element}>
    activeSidePane: number
    sidebarWidth: number
}
const Sidebar = ({sidePaneOptions, activeSidePane, sidebarWidth} : SidebarProps) => {

    const [
        loadingFromURLStarted,
        loadingFromURLFinished,
         displayContent
        ] = useLoadingFromURLStatus()

    const previousActivePane = usePrevious(activeSidePane)
    return (
        displayContent ?
        <TransitionWrapper diffData={activeSidePane} transitionTime={1} transitionType={!previousActivePane || previousActivePane < activeSidePane ? "slideLeft" : "slideRight"} width={sidebarWidth}>
            <div style={{width: `${sidebarWidth}px`}} className={loadingFromURLStarted ? "fade-in" : ""}>
                {sidePaneOptions[activeSidePane].content}
            </div>
        </TransitionWrapper> :
        <div style={{
            width: `${sidebarWidth - 25 * 2}px`,
            display: "flex",
            flexFlow: "column",
            alignItems: "center",
            padding: "25px",
            backgroundColor: "rgb(19,124,189)",
            height: "fit-content",
            borderRadius: "5px",
            margin: "25px",
            opacity: loadingFromURLFinished ? 0 : 1,
            transition: loadingFromURLFinished ? "opacity 1s ease-in" : ""
        }}>
            <LoadingFromURLOverlay/>
        </div>
    )
}

const LoadingFromURLOverlay = () => {
    const type = useAppSelector(state => state.routeInfo.type)
    const routeData = useAppSelector(state => state.routeInfo[type === "rwgps" ? "rwgpsRouteData" : "gpxRouteData"])

    return (
        <>
            <RouteTitle style={{color: "white"}} className={routeData !== null ? "fade-in" : ""}/>
            <div style={{fontSize: "24px", color: "white", marginBottom: "10px"}}>Loading forecast...</div>
            <Loader color="red"/>
        </>
    )
}

export default DesktopUI