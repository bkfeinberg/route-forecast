import React, {Dispatch, SetStateAction} from "react"
import DateSelect from "../../jsx/ForecastSettings/DateSelect";
import RidingPace from "../../jsx/ForecastSettings/RidingPace";
import { useAppSelector } from "../../utils/hooks";
import DesktopUI from "../../jsx/DesktopUI";
import MobileUI from "../../jsx/MobileUI";
import ReactGA from "react-ga4";

const DatePicker = () => {
    return (
        <div style={{textAlign:"center"}}>
            <h4>When does your ride start</h4>
            <div style={{ display: 'flex', justifyContent: 'center', 
                marginLeft:'auto', marginRight:'auto', maxWidth:'450px', flexDirection:'column' }}>
                <DateSelect/>
            </div>
        </div>
    )
}

const SpeedPicker = () => {
    return (
        <div style={{textAlign:"center"}}>
            <h4>How fast do you expect to ride <em>on flat terrain</em></h4>
            <RidingPace/>
        </div>
    )
}

const RealUI = ({ isLandscape, isLargeEnough, mapsApiKey, orientationChanged, setOrientationChanged }: {
    isLandscape: boolean, isLargeEnough: boolean,
    mapsApiKey: string
    orientationChanged: boolean
    setOrientationChanged: Dispatch<SetStateAction<boolean>>
}) => {
    return (
        <div>
            {isLandscape && isLargeEnough && <DesktopUI mapsApiKey={mapsApiKey} orientationChanged={orientationChanged} setOrientationChanged={setOrientationChanged} />}
            {(!isLargeEnough || !isLandscape) && <MobileUI mapsApiKey={mapsApiKey} orientationChanged={orientationChanged} setOrientationChanged={setOrientationChanged} />}
        </div>
    )
}

const NewUserPage = ({ isLandscape, isLargeEnough, mapsApiKey,
    orientationChanged, setOrientationChanged }: {
        isLandscape: boolean, isLargeEnough: boolean,
        mapsApiKey: string
        orientationChanged: boolean
        setOrientationChanged: Dispatch<SetStateAction<boolean>>
    }) => {
    const dateSelected = useAppSelector(state => state.uiInfo.routeParams.timeSetByUser);
    const paceSelected = useAppSelector(state => state.uiInfo.routeParams.paceSetByUser);
    
    if (dateSelected && paceSelected) {
        ReactGA.event("new_user");
    } else if (dateSelected) {
        ReactGA.event('new_user_date_only');
    }
    return (
        <div>
            {(!dateSelected || !paceSelected) && <h2 style={{ textAlign: "center" }}><em>Randoplan</em></h2>}
            {(!dateSelected || !paceSelected) && <h3 style={{ textAlign: "center" }}><strong>Forecast and planning for cycling and hiking routes</strong></h3>}
            {dateSelected ? null : <DatePicker/>}
            {(dateSelected && !paceSelected) ? <SpeedPicker /> : null}
            {(dateSelected && paceSelected) ? <RealUI isLandscape={isLandscape}
                isLargeEnough={isLargeEnough} mapsApiKey={mapsApiKey}
                orientationChanged={orientationChanged} setOrientationChanged={setOrientationChanged} /> : null}
        </div>
    )
}

export default NewUserPage;