import { IconCloudRain, IconWorld, IconSettings, IconBike, IconMap } from "@tabler/icons-react";
import React, { Suspense, useContext } from "react";
import { NavLink, MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { errorDetailsSet, lastErrorCleared } from "../redux/dialogParamsSlice";
import { useWhenChanged } from "../utils/hooks";
const ForecastSettings = React.lazy(() => import("./ForecastSettings/ForecastSettings"));
import MapLoader from "./Map/MapLoader";
const ForecastTable = React.lazy(() => import("./resultsTables/ForecastTable"));
const PaceTable = React.lazy(() => import("./resultsTables/PaceTable"));
import RouteInfoForm from "./RouteInfoForm/RouteInfoForm";
import DonationRequest from "./TopBar/DonationRequest";
import DisplayErrorList from "./app/DisplayErrorList";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import type { Dispatch, SetStateAction } from "react";
import * as Sentry from "@sentry/react"
import '@mantine/core/styles/Divider.css'
import {Button, Group, Divider} from "@mantine/core";
import FaqButton from "./TopBar/FaqButton";
const ShowFaq = React.lazy(() => import("./TopBar/FaqImpl").then(module => ({ default: module.ShowFaq })));
import VersionContext from "./versionContext";

export interface MobileUIPropTypes {
    mapsApiKey:string, 
    orientationChanged:boolean
    setOrientationChanged: Dispatch<SetStateAction<boolean>>
}

const MobileUI = (props : MobileUIPropTypes) => {
    return (
        <MemoryRouter>
            <MobileUITabs {...props} />
        </MemoryRouter>
    )
};

export default MobileUI;

const MobileUITabs = (props : MobileUIPropTypes) => {
    const dispatch = useAppDispatch()
    const location = useLocation()
    const { pathname } = location
    try {
        const navigate = useNavigate()
        const type = useAppSelector(state => state.routeInfo.type)
        const routeData = useAppSelector(state => state.routeInfo[type === "rwgps" ? "rwgpsRouteData" : "gpxRouteData"])
        const stravaActivityData = useAppSelector(state => state.strava.activityData)
        const forecastData = useAppSelector(state => state.forecast.forecast)
        const viewingControls = useAppSelector(state => state.uiInfo.dialogParams.viewControls)

        useWhenChanged(routeData, () => navigate("/controlPoints", { replace: true }), routeData !== null)
        useWhenChanged(forecastData, () => navigate("/forecastTable/", { replace: true }), forecastData.length > 0 && !viewingControls)
        useWhenChanged(stravaActivityData, () => navigate("/paceTable/", { replace: true }))

        React.useEffect(() => {
            // if we've been reset while displaying another tab
            if (pathname !== '/' && routeData === null && stravaActivityData === null) {
                navigate('/')
            }
        }), [pathname, routeData, stravaActivityData]

        React.useEffect(() => {
            if (props.orientationChanged) {
                if (forecastData.length > 0) {
                    navigate("/forecastTable/", { replace: true })
                }
                else if (routeData) {
                    navigate("/controlPoints/", { replace: true })
                }
            }
        }, [props.orientationChanged, forecastData, routeData])
        
        React.useEffect(() => {
            if (props.orientationChanged) {
                props.setOrientationChanged(() => false)
            }
        }, [props.orientationChanged])

        const [showVersion, setShowVersion] = React.useState(false);
        const fontSize = showVersion ? "16px" : "18px";
        const version = useContext(VersionContext)
        const title = showVersion ? 'Randoplan v' + version : 'Randoplan';
        
        const toggleShowVersion = () => {
            setShowVersion(!showVersion)
        }

        const errorMessageList = useAppSelector(state => state.uiInfo.dialogParams.errorMessageList)

        const closeErrorList = () => {
            dispatch(lastErrorCleared())
        }

        const needToViewTable = useAppSelector(state => state.forecast.valid && !state.forecast.tableViewed)
        const needToViewMap = useAppSelector(state => state.forecast.valid && !state.forecast.mapViewed)
        const hasForecast = useAppSelector(state => state.forecast.valid)
        
        return (
            <>
                <DisplayErrorList errorList={errorMessageList} onClose={closeErrorList}/>
                <Sentry.ErrorBoundary fallback={<h2>Something went wrong.</h2>}>
                    <Group title="Randoplan" wrap={'nowrap'} onClick={toggleShowVersion} >
                        <span style={{fontSize:fontSize}}>{title}</span>
                        <NavLink to={"/"}>
                            <Button size='compact-xs' leftSection={<IconMap />} title={"home"} variant={pathname==='/'?'filled':'default'}></Button>
                        </NavLink>
                        <NavLink to={"/controlPoints/"}>
                            <Button size='compact-xs' leftSection={<IconSettings />} right={3} disabled={!routeData} title={"controls"} variant={pathname==='/controlPoints/'?'filled':'default'}></Button>
                        </NavLink>
                        <NavLink to={"/forecastTable/"}>
                            <Button size='compact-xs' leftSection={<IconCloudRain />} disabled={!hasForecast} title={"forecast"} variant={needToViewTable ? 'warning' : (pathname==='/forecastTable/'?'filled':'default')}></Button>
                        </NavLink>
                        <NavLink to={"/map/"}>
                            <Button size='compact-xs' leftSection={<IconWorld />} disabled={!hasForecast} title={"forecast"} variant={needToViewMap ? 'warning' : (pathname==='/map/'?'filled':'default')}></Button>
                        </NavLink>
                        {
                            stravaActivityData &&
                            <NavLink to={"/paceTable/"}>
                                <Button size='compact-xs' leftSection={<IconBike />} color="orange" disabled={!stravaActivityData} title={"strava"} variant={needToViewTable ? 'warning' : (pathname==='/paceTable/ '?'filled':'default')} />
                            </NavLink>
                        }
                        <FaqButton/>
                    </Group>
                </Sentry.ErrorBoundary>
                <Divider/>
                <Routes>
                    <Route path="/" element={<RouteInfoForm />} />
                    <Route path="/controlPoints/" element={<Suspense fallback={<div>Loading forecast settings...</div>}><ForecastSettings/></Suspense>} />
                    <Route path="/map/" element={<MapLoader maps_api_key={props.mapsApiKey} />} />
                    <Route path="/forecastTable/" element={<Suspense fallback={<div>Loading forecast table...</div>}><ForecastTable/></Suspense>} />
                    <Route path="/paceTable/" element={<Suspense fallback={<div>Loading pace table...</div>}><PaceTable/></Suspense>} />
                    <Route path="/faq/" element={<Suspense fallback={<div>Loading pace table...</div>}><ShowFaq/></Suspense>} />
                </Routes>
                <DonationRequest wacky={false}/>
            </>
        )
    } catch (err : any) {
        dispatch(errorDetailsSet(err.message))
    }
}
