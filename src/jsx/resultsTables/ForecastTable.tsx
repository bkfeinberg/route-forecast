import tomorrowIo from 'Images/Powered_by_Tomorrow-Black.png';
import React, {useEffect,useState} from 'react';
import * as Sentry from '@sentry/react'
// const meteomatics = <svg viewBox="20 0 115 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="meteomatics Logo" className="w-14 h-12"><path className="meteomatics-logo_svg__logo-claim" d="M29.38 2.731h3.652v1.352c1.227-1.26 2.852-1.749 4.141-1.749 1.902 0 3.467.89 4.418 2.36 1.196-1.5 3.19-2.36 5.277-2.36 3.404 0 5.614 2.33 5.614 6.043v9.357h-3.406V9.176c0-2.27-1.134-3.682-3.068-3.682-1.687 0-3.374 1.164-3.374 3.712v8.528h-3.405V9.176c0-2.303-1.197-3.682-3.191-3.682-1.688 0-3.251 1.226-3.251 3.957v8.283H29.38V2.73ZM54.49 10.402c0-4.6 3.651-8.068 7.854-8.068 4.171 0 7.331 3.19 7.331 7.269 0 .37-.03.86-.122 1.536h-11.72c.338 2.516 2.24 4.08 4.602 4.08 1.78 0 3.284-.89 3.682-2.241h3.375c-.737 2.945-3.498 5.155-7.27 5.155-4.48 0-7.732-3.437-7.732-7.73Zm11.688-2.055c-.122-1.719-1.717-3.098-3.834-3.098-1.934 0-3.59 1.194-4.264 3.098h8.098ZM81.872 10.402c0-4.6 3.652-8.068 7.854-8.068 4.171 0 7.331 3.19 7.331 7.269 0 .37-.03.86-.122 1.536H85.217c.337 2.516 2.238 4.08 4.601 4.08 1.779 0 3.282-.89 3.682-2.241h3.375c-.737 2.945-3.497 5.155-7.272 5.155-4.479 0-7.73-3.437-7.73-7.73ZM93.56 8.347c-.123-1.719-1.716-3.098-3.834-3.098-1.934 0-3.59 1.194-4.264 3.098h8.098ZM98.651 10.248c0-4.417 3.498-7.914 7.914-7.914a7.877 7.877 0 0 1 7.916 7.914c0 4.418-3.53 7.885-7.916 7.885-4.416 0-7.914-3.467-7.914-7.885Zm7.914 4.726c2.548 0 4.571-2.056 4.571-4.726 0-2.698-2.023-4.754-4.571-4.754-2.608 0-4.571 2.056-4.571 4.754 0 2.67 1.963 4.726 4.571 4.726ZM29.38 22.597h3.652v1.352c1.227-1.26 2.852-1.749 4.141-1.749 1.902 0 3.467.89 4.418 2.36 1.196-1.5 3.19-2.36 5.277-2.36 3.404 0 5.614 2.33 5.614 6.043V37.6h-3.406v-8.558c0-2.27-1.134-3.682-3.068-3.682-1.687 0-3.374 1.164-3.374 3.712V37.6h-3.405v-8.558c0-2.303-1.197-3.682-3.191-3.682-1.688 0-3.251 1.227-3.251 3.957V37.6H29.38V22.597ZM54.464 33.396c0-2.945 2.454-4.998 7.055-4.998h2.7v-.37c0-1.871-1.135-3.038-3.067-3.038-1.657 0-3.037 1.045-3.16 2.578h-3.406c.154-3.16 2.884-5.368 6.627-5.368 3.988 0 6.443 2.423 6.443 6.135V37.6H64.31v-1.564C63.329 37.2 61.673 38 60.047 38c-3.375 0-5.583-1.811-5.583-4.604Zm5.859 1.933c2.24 0 3.988-1.808 3.988-4.171v-.245h-2.7c-2.485 0-3.804.827-3.804 2.393 0 1.197.89 2.023 2.516 2.023ZM68.432 22.598h2.852v-2.732h3.405v2.732h4.018v2.977h-4.018v6.75c0 1.534.766 2.3 2.21 2.3h1.808V37.6h-2.238c-3.436 0-5.185-1.596-5.185-5.03v-6.995h-2.852v-2.977ZM84.04 22.598v15.003h-3.405V22.598h3.404ZM86.071 30.114c0-4.51 3.465-7.914 7.854-7.914 3.62 0 6.687 2.453 7.146 5.768h-3.467c-.337-1.444-1.93-2.578-3.742-2.578-2.515 0-4.448 1.993-4.448 4.724 0 2.7 1.933 4.693 4.448 4.693 1.811 0 3.405-1.104 3.775-2.698h3.434c-.397 3.498-3.497 5.89-7.146 5.89-4.39 0-7.854-3.374-7.854-7.885ZM102.478 32.999h3.252c.122 1.379 1.259 2.33 2.977 2.33 1.687 0 2.668-.827 2.668-1.933 0-3.19-8.62-.95-8.62-6.532 0-2.823 2.363-4.664 5.613-4.664 3.285 0 5.738 1.594 6.045 4.601h-3.345c-.182-1.134-1.256-2.025-2.73-2.025-1.257 0-2.393.554-2.393 1.748 0 2.978 8.743.645 8.743 6.475 0 2.945-2.453 5-5.981 5-3.529 0-5.982-1.84-6.229-5ZM70.24 2.732h2.852V0h3.405v2.732h4.017v2.977h-4.017v6.75c0 1.533.765 2.3 2.209 2.3h1.808v2.975h-2.238c-3.436 0-5.184-1.596-5.184-5.03V5.708h-2.853V2.732Z" fill="#003652"></path><path d="M12.74 20.483H8.874v3.868h3.868v-3.868ZM3.868 11.609H0v3.868h3.868v-3.868Z" fill="#003652"></path><path d="M21.615 2.735H8.873v3.868h8.874v8.874h3.868V2.735Z" fill="#40E0D0"></path><path d="m17.083 17.083-2.735 2.735 2.735 2.735 2.735-2.735-2.735-2.735ZM4.534 4.534 1.799 7.269l2.735 2.735 2.735-2.735-2.735-2.735ZM4.534 17.083l-2.735 2.735 2.735 2.735 2.735-2.735-2.735-2.735Z" fill="#003652"></path></svg>;
const weatherKitImage = "https://weatherkit.apple.com/assets/branding/square-mark.png";
import VisualCrossingLogo from 'Images/vclogo.svg?react';
import oneCallLogo from 'Images/OpenWeather-Master-Logo RGB.png'
import OpenMeteoLogo from 'Images/OpenMeteo.svg?react'
import { DateTime, Interval } from 'luxon';
import MediaQuery, {useMediaQuery} from 'react-responsive';
import { finishTimeFormat } from '../ForecastSettings/TimeFields';
import { fetchAqiToggled, weatherRangeSet, weatherRangeToggled, zoomToRangeToggled, tableViewedSet, Forecast } from '../../redux/forecastSlice';
import { useFormatSpeed, useAppSelector, useAppDispatch } from '../../utils/hooks';
import { useForecastDependentValues } from "../../utils/forecastValuesHook";
import { maxWidthForMobile, milesToMeters } from '../../utils/util';
import InstallExtensionButton from "../InstallExtensionButton";
import { ToggleButton } from '../shared/ToggleButton';
import { WeatherCorrections } from './WeatherCorrections';
import {useTranslation} from 'react-i18next'
import { DesktopTooltip } from '../shared/DesktopTooltip';
import ShortUrl from '../TopBar/ShortUrl'
import { UserControl } from '../../redux/controlsSlice';
import { i18n } from 'i18next';
import ReactGA from "react-ga4";
import { Button, Tooltip, Table, Card, Title, Text } from '@mantine/core';

import { IconClipboard, IconTemperature, IconPercentage } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Cookies from 'universal-cookie';

type TimeFormats = {
    [index:string]:string
  }
const timeFormatForLang : TimeFormats = {'en':'h:mm a', 'en-US':'h:mm a', 'fr':'H:mm', 'es':'H:mm', 'it': 'H:mm'}
  
const displayBacklink = (provider : string) => {
    switch (provider) {
        case 'climacell':
            return <a tabIndex={-1} href="https://www.tomorrow.io/" target="_blank" rel="noopener noreferrer"><img src={tomorrowIo} width={166} height={19}/></a>;
        case 'weatherapi':
            return <a href="https://www.weatherapi.com/" title="Free Weather API"  target="_blank" rel="noopener noreferrer"><img src='//cdn.weatherapi.com/v4/images/weatherapi_logo.png' alt="Weather data by WeatherAPI.com" border="0"/></a>;
        case 'visualcrossing':
           return <a href="https://www.visualcrossing.com/weather-data" target="_blank" rel="noopener noreferrer"><VisualCrossingLogo width={200} height={100}/></a>;
        case 'nws':
            return <a href="https://www.weather.gov/documentation/services-web-api" target="_blank" rel="noopener noreferrer"><img src={"https://www.weather.gov/images/gjt/newsletter/NWSLogo.png"} width={100} height={100}/></a>
/*         case 'meteomatics':
            return meteomatics;
 */        case 'weatherKit':
            return <a href="https://developer.apple.com/weatherkit/data-source-attribution/" target="_blank" rel="noopener noreferrer"><img src={weatherKitImage} /></a>
        case 'oneCall':
            return <a href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer"><img src={oneCallLogo} width={150} height={85}/></a>
        case 'openMeteo':
            return <a href="https://open-meteo.com/" style={{fontFamily:'ui-sans-serif', fontSize:'18px'}} target="_blank" rel="noopener noreferrer"><OpenMeteoLogo width={28} height={28}/>Open Meteo</a>
        default: return <div/>;
    }
}

const getTimeFormat = (i18n: i18n) => {
    if (!timeFormatForLang) {
        return 'h:mm a'
    }
    let timeFormat = timeFormatForLang[i18n.language]
    if (!timeFormat) {
        timeFormat = timeFormatForLang['en']
    }
    return timeFormat
}

const formatReturnedTime = (point : {time: string, zone: string}, i18n : i18n, timeFormat: string) => DateTime.fromISO(point.time, {zone:point.zone, locale:i18n.language}).toFormat(timeFormat)
type AdjustedTimes = {adjustedTimes:Array<{time:DateTime, index:number}>}
const getAdjustedTime = (point : Forecast, index : number, adjustedTimes : AdjustedTimes, i18n : i18n) => {
    const timeFormat = getTimeFormat(i18n)
    if (adjustedTimes && adjustedTimes.adjustedTimes && adjustedTimes.adjustedTimes.length > 0 &&
        adjustedTimes.adjustedTimes.findIndex(element => element.index === index-1) !== -1) {
        const adjustedTimeFound = adjustedTimes.adjustedTimes.find(element => element.index === index);
        return adjustedTimeFound ? adjustedTimeFound.time.setLocale(i18n.language).toFormat(timeFormat) : formatReturnedTime(point, i18n, timeFormat)
    } else {
        return formatReturnedTime(point, i18n, timeFormat)
    }
}

const fahrenheitToCelsius = (degrees : string) => {
    return (((parseFloat(degrees)-32)*5)/9).toFixed(0);
}

export const formatTemperature = (temperature : string, isCelsius : boolean) => {
    return isCelsius ? `${fahrenheitToCelsius(temperature)}C` : `${temperature}F`;
}

const orangeText = {color: 'darkOrange'}

const skyBlueText = {color: 'deepSkyBlue'}

const redText = {color: 'red'}

const headwindStyle = (point : Forecast) => {
    if (point.relBearing <90) {
        if (Math.cos((Math.PI / 180) * point.relBearing) * parseInt(point.windSpeed) >= 10) {
            return redText;
        } else {
            return orangeText;
        }
    } else {
        return skyBlueText;
    }
}

const windStyle = (point: Forecast) => {
    const headwindColor = headwindStyle(point)
    if ((point.relBearing >= 75 && point.relBearing <= 105) || (point.relBearing >= 255 && point.relBearing <= 285) ) {
        if (Math.sin((Math.PI / 180) * point.relBearing) * parseInt(point.windSpeed) >= 10) {
            return {fontWeight:'900', backgroundColor: '#682c36  ', ...headwindColor}
        } else {
            return headwindColor    
        }
    } else {
        return headwindColor
    }
}

const ForecastTable = () => {
    const forecast = useAppSelector(state => state.forecast.forecast)
    const provider = useAppSelector(state => state.forecast.weatherProvider)
    const metric = useAppSelector(state => state.controls.metric)
    const celsius = useAppSelector(state => state.controls.celsius)
    const zoomToRange = useAppSelector(state => state.forecast.zoomToRange)
    const routeName = useAppSelector(state => state.routeInfo.name)
    const fetchAqi = useAppSelector(state => state.forecast.fetchAqi)
    const [showGusts, setShowGusts] = useState<boolean>(false)
    const [showApparentTemp, setShowApparentTemp] = useState<boolean>(false)
    const [showRelativeBearing, setShowRelativeBearing] = useState<boolean>(false)
    const [currentRow, setCurrentRow] = useState<number>()
    const [selectedRow, setSelectedRow] = useState<number>()
    const maxDistanceInKm = useAppSelector(state => state.routeInfo.distanceInKm)
    const userControls = useAppSelector(state => state.controls.userControlPoints)
    const startTimestamp = useAppSelector(state => state.uiInfo.routeParams.startTimestamp)
    const zone = useAppSelector(state => state.uiInfo.routeParams.zone)
    const startTime = DateTime.fromMillis(startTimestamp, {zone:zone})
    const ForecastValues = useForecastDependentValues()
    const dispatch = useAppDispatch()
    useEffect(() => { dispatch(tableViewedSet()) }, [])
    const { t } = useTranslation()
    const cookies = new Cookies(null, { path: '/' });

    const distHeaderText = <span>{metric ? 'KM' : 'Mile'}</span>
    const distHeader = <DesktopTooltip label={t('tooltips.distHeader')} position='top'>{distHeaderText}</DesktopTooltip>

    const toggleGustDisplay = () => {ReactGA.event('select_content', {content_type : 'gusts'}); return setShowGusts(!showGusts)}
    const windHeaderText = <Button className={'clickableHeaderCell'} variant='default' size='compact-xs' onClick={toggleGustDisplay} >{showGusts ? t('data.wind.gust') : t('data.wind.speed')}</Button>;
    const windHeader = <DesktopTooltip label={t('tooltips.windHeader')} position='top'>{windHeaderText}</DesktopTooltip>

    const toggleApparentDisplay = () => {ReactGA.event('select_content', {content_type : 'feelsLike'}); return setShowApparentTemp(!showApparentTemp)}

    const temperatureHeaderText = <Button className={'clickableHeaderCell'} variant='default' size='compact-xs' onClick={toggleApparentDisplay}>{showApparentTemp ? t('tableHeaders.temperature') : <IconTemperature/>}</Button>
    const temperatureHeader = <DesktopTooltip label={t('tooltips.temperatureHeader')} position='top'>{temperatureHeaderText}</DesktopTooltip>

    const copyTable = async (event: React.MouseEvent) => {
        ReactGA.event('tutorial_complete')
        var htmlTable = document.getElementById('forecastTable')
        var range = document.createRange()
        const selection = window.getSelection();
        if (selection && htmlTable) {
            range.selectNode(htmlTable)
            selection.removeAllRanges();
            selection.addRange(range)
            document.execCommand('copy')
            selection.removeAllRanges();
            notifications.show({ message: t('toasts.tableCopied'), autoClose: 3000, withCloseButton: false });
        }
    }

    const toggleZoom = () => {
        ReactGA.event('select_content', {content_type: 'zoom'})
        dispatch(zoomToRangeToggled())
        cookies.set('zoomToRange', (!zoomToRange).toString(), { path: '/' })
    }

    const toggleRelBearing = () => {
        ReactGA.event('select_content', {content_type: 'relativeBearing'})
        setShowRelativeBearing(!showRelativeBearing)
    }

    const toggleRange = (event: React.MouseEvent) => {
        const startAttr = event.currentTarget.getAttribute('start');
        const finishAttr = event.currentTarget.getAttribute('end');
        if (!startAttr || !finishAttr) return
        const start = parseInt(startAttr);
        dispatch(weatherRangeToggled({start:startAttr, finish:finishAttr}))
        if (selectedRow === start) {
            setSelectedRow(undefined)
        } else {
            setSelectedRow(start)
        }
    }

    const updateWeatherRange = (event : React.MouseEvent) => {
        const startAttr = event.currentTarget.getAttribute('start');
        if (!startAttr) return
        const start = parseInt(startAttr);
        // debouncing mechanism, if mouse enter is triggered after mouse click on the same row, the current row will be unchanged
        if (currentRow !== start) {
            setCurrentRow(start)
        } else {
            return
        }
        // the last row is not valid as a range
        if (!event.currentTarget.getAttribute('end')) {
            setCurrentRow(undefined)
        }
        else if (selectedRow !== start) {
            const endAttr = event.currentTarget.getAttribute('end')
            if (!endAttr) return
            dispatch(weatherRangeSet({start:startAttr, finish:endAttr}))
            setSelectedRow(start)
        }
    }

    const toggleAqi = async () => {
        ReactGA.event('select_content', {content_type: 'aqi'})
        dispatch(fetchAqiToggled())
        cookies.set('fetchAqi', (!fetchAqi).toString(), { path: '/' });
        // whatever the value in props is will be toggled by this
        if (!fetchAqi) {
            notifications.show({ message: t('toasts.aqi.enabled'), autoClose:3000, withCloseButton: false });
        } else {
            notifications.show({ message: t('toasts.aqi.disabled'), autoClose:3000, withCloseButton: false });
        }
    }

    const styleForControl = (point: Forecast) => {
        return {color:point.isControl?'blue':'black'}
    }

    type MakeSummaryProps = {
        startTime: DateTime
        finishTime: string
        finishTimeFormat: string
        userControls: Array<UserControl>
    }
    const MakeSummaryLine = ({startTime, finishTime, finishTimeFormat, userControls} : MakeSummaryProps) => {
        const elapsedTimeInterval = Interval.fromDateTimes(startTime, DateTime.fromFormat(finishTime, finishTimeFormat, {zone:zone}))
        const minutesOfIdling = userControls.reduce((accum,current) => accum += Number.parseInt(current.duration.toString()), 0)
        return (
            <div style={{border:'3px solid black'}}>Elapsed time <strong>{elapsedTimeInterval.length('hours').toFixed(1)} hours</strong>, <strong>{(minutesOfIdling/60).toFixed(1)}</strong> off bike</div>
        )
    }

    const getDayForComparison = (time : string, index : number, forecastLength : number, zone : string, finishTime : string | null) => {
        if (index === forecastLength-1) {
            if (finishTime) {
                return DateTime.fromFormat(finishTime, finishTimeFormat, {zone:zone}).day
            }
            else {
                return DateTime.fromISO(time, {zone:zone}).day
            }
        } else {
            return DateTime.fromISO(time, {zone:zone}).day
        }
    }

    const timeIsAdjusted = (adjustedTimes: AdjustedTimes, index: number) => {
        if (adjustedTimes && adjustedTimes.adjustedTimes && adjustedTimes.adjustedTimes.length > 0) {
            return (adjustedTimes.adjustedTimes.findIndex(element => element.index === index-1) !== -1)
        }
        return false
    }

    const preferFinishTime = (index: number, forecastLength: number, finishTime: string|null) => (finishTime != null) && (index === forecastLength-1)

    // determine whether two consecutive entries in the forecast are on different days
    // requirements: take wind into account for both times before comparing the days
    // use time zone as well
    // also the last entry will be the forecasted finish time, and not in the forecast table itself
    const compareDays = (earlier: string, later: string, zone: string, index: number,
        forecastLength: number, finishTime: string|null, adjustedTimes: AdjustedTimes
    ) => {
        // I'm not using the method that I defined for this purpose because it seems that
        // typescript doesn't understand that it protects against null values of finishTime
        const compareAgainstFinish = finishTime && (index === forecastLength-1)
        // adjust for wind before deciding the day of the forecast point
        if (timeIsAdjusted(adjustedTimes, index)) {
            const earlierDay = (adjustedTimes.adjustedTimes.findIndex(element => element.index === index-1) !== -1) ?
                adjustedTimes.adjustedTimes.find(element => element.index === index-1)?.time.day :
                DateTime.fromISO(earlier, {zone:zone}).day
            let laterDay = adjustedTimes.adjustedTimes.find(element => element.index === index)?.time.day
            if (compareAgainstFinish) {
                laterDay = DateTime.fromFormat(finishTime, finishTimeFormat, {zone:zone}).day
            }            
            return earlierDay != laterDay
        } else {
            return DateTime.fromISO(earlier, {zone:zone}).day != 
            (compareAgainstFinish ? 
                DateTime.fromFormat(finishTime, finishTimeFormat, {zone:zone}).day : 
                DateTime.fromISO(later, {zone:zone}).day)
        }        
    }

    // before showing the day, adjust for wind and localize the language, also set the time zone appropriately
    const forecastPointDayMarker = (point: Forecast, i18n: i18n, adjustedTimes: AdjustedTimes, 
        index: number, forecastLength: number, finishTime: string|null) => {
        // this will be true even if several forecast entries are missing due to errors 
        // from the provider
        if (finishTime && (index === forecastLength-1)) {
            return DateTime.fromFormat(finishTime, finishTimeFormat, {zone:zone}).toFormat('cccc')
        }
        return timeIsAdjusted(adjustedTimes, index) ?
            adjustedTimes.adjustedTimes.find(element => element.index === index)?.time.setLocale(i18n.language).toFormat('cccc')
            : DateTime.fromISO(point.time, { locale: i18n.language, zone: point.zone }).toFormat('cccc')
    }

    const forecastHasSummary = (forecasts : Forecast[]) => {
        return !!forecasts.find( (forecast : Forecast) => forecast.summary !== '');
    }

    const expandTable = (forecast : Forecast[], metric : boolean, adjustedTimes : AdjustedTimes, finishTime : string|null, hasSummary: boolean) => {
        const { i18n } = useTranslation()
        if (forecast.length > 0) {
            return (
                <Table.Tbody>
                {forecast.map((point,index) =>
                <React.Fragment key={index}>
                    {(index > 0 && compareDays(forecast[index-1].time, point.time, point.zone, index, forecast.length, finishTime, adjustedTimes) )?
                        <Table.Tr style={{outline:'thin solid'}}>
                            <Table.Td>{forecastPointDayMarker(point, i18n, adjustedTimes, index, forecast.length, finishTime)}</Table.Td>
                        </Table.Tr>:null}
                    <Table.Tr id={`forecast_row_${index}`}
                        start={point.distance*milesToMeters}
                        end={index!==forecast.length-1?forecast[index+1].distance*milesToMeters:maxDistanceInKm*1000}
                        className={selectedRow===point.distance*milesToMeters?'highlighted':undefined}
                        onClick={toggleRange}  onMouseEnter={updateWeatherRange}>
                        <Table.Td><span style={styleForControl(point)} className='timeCell'>
                            <Time time={getAdjustedTime(point,index,adjustedTimes, i18n)} zone={point.zone} i18n={i18n}/></span></Table.Td>
                        <Table.Td style={styleForControl(point)}>{metric ? ((point.distance*milesToMeters)/1000).toFixed(0) : point.distance}</Table.Td>
                        {hasSummary && <Table.Td>{point.summary}</Table.Td>}                        
                        <Table.Td>{showApparentTemp?
                            // eslint-disable-next-line multiline-ternary
                            <i>{formatTemperature(point.feel.toString(), celsius)}</i>:formatTemperature(point.temp, celsius)}</Table.Td>
                        {point.stdDev?<td>{point.stdDev?point.stdDev.toFixed(1):<span/>}</td>:<></>}
                        <td className='chanceRain'>{point.precip}</td>
                        <MediaQuery minWidth={maxWidthForMobile}>
                            <Table.Td>{point.humidity}</Table.Td>
                            <Table.Td>{point.cloudCover}</Table.Td>
                            <Table.Td>{point.aqi!==undefined?point.aqi:'N/A'}</Table.Td>
                        </MediaQuery>
                        <Table.Td style={windStyle(point)}>
                            <WindSpeed gust={point.gust} windSpeed={point.windSpeed} showGusts={showGusts}/>
                        </Table.Td>
                        <MediaQuery minWidth={maxWidthForMobile}>
                            <Table.Td>{showRelativeBearing ? point.relBearing.toFixed() : point.windBearing}&#176;</Table.Td>
                        </MediaQuery>
                    </Table.Tr>
                    </React.Fragment>
                )}
                </Table.Tbody>
            );
        }
    }

    const scrollToChanceOfRain = () => {
        var rowNum = 0
        while (rowNum < forecast.length) {
            if (forecast[rowNum].precip !== '0.0%') {
                const precip_row = document.getElementById(`forecast_row_${rowNum}`);
                if (!precip_row) return
                precip_row.scrollIntoView({
                    behavior: 'smooth'
                  });
                break
            }
            rowNum++
        }
    }

    const isLandscape = useMediaQuery({query:'(orientation:landscape)'})
    const isLargeEnough = useMediaQuery({query:'(min-width: 950px)'})
    const hasStdDev = forecast[0] && forecast[0].stdDev
    const hasSummary = forecastHasSummary(forecast);

    return (

        <div className="animated slideInLeft">
            <InstallExtensionButton/>
            {(!isLargeEnough || !isLandscape) && <h2>{routeName}</h2>}
            <Sentry.ErrorBoundary  fallback={<h2>Something went wrong.</h2>}>
                <div style={{ display: 'flex', flexDirection: "column", overflowY: 'scroll'}}>
                    <div style={{ display: 'flex', padding: '16px', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div /* style={{ flex: 1 }} */>
                            {displayBacklink(provider)}
                        </div>
                        {/* mobile layout for the first row above the forecast */}
                        <MediaQuery maxDeviceWidth={500}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems:'center', justifyContent:'center' }}>
                                <div style={{ flex: 1 }}>
                                    <WeatherCorrections />
                                </div>
                                <div style={{ marginTop: "5px", textAlign: "left" }}>
                                    <ShortUrl />
                                </div>
                            </div>
                        </MediaQuery>
                        {/* desktop layout for first row above the forecast table */}
                        <MediaQuery minDeviceWidth={501}>
                            <MediaQuery maxWidth={1749}>
                                <ShortUrl/>
                            </MediaQuery>
                            {/* /put the summary line below the wind effects */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf:'normal' }}>
                                <div style={{ flex: 1 }}>
                                    <WeatherCorrections />
                                </div>
                                {ForecastValues.finishTime && finishTimeFormat && <MakeSummaryLine startTime={startTime} finishTime={ForecastValues.finishTime} finishTimeFormat={finishTimeFormat} userControls={userControls} />}
                            </div>
                            <div style={{padding:'20px'}}>
                                <Tooltip label={t('tooltips.copyTable')}>
                                    <Button size='compact-sm' variant='default' leftSection={<IconClipboard size={16}/>} onClick={copyTable}/>
                                </Tooltip>
                            </div>
                            <div style={{ flexShrink: 0, width: "fit-content" }}>
                                <DesktopTooltip label={t('tooltips.zoom')} position='bottom'>
                                    <ToggleButton style={{ width: "5em", height: "4em", float: "right" }} active={zoomToRange} onClick={toggleZoom}>{t('buttons.zoomToSegment')}</ToggleButton>
                                </DesktopTooltip>
                            </div>
                        </MediaQuery>
                    </div>
                    <Card withBorder radius="md" padding="lg" shadow='lg'>
                        <Card.Section withBorder inheritPadding>
                            <Title order={6}>{t('titles.forecastControls')}</Title>
                        </Card.Section>
                        <Card.Section withBorder inheritPadding>
                            <Text size={"sm"}>{t('data.tableHeadersDoc')}</Text>
                        </Card.Section>                        
                    </Card>
                    <Table id={'forecastTable'} striped withColumnBorders withRowBorders
                        stickyHeader stickyHeaderOffset={16} withTableBorder highlightOnHover style={{ fontSize: "12px", borderSpacing: "0px"}}>
                        <Table.Thead>
                            <Table.Tr key={'777'}>
                                <Table.Th><span className={'timeHeaderCell'}>{t('tableHeaders.time')}</span></Table.Th>
                                <Table.Th><span className={'headerCell'}>{distHeader}</span></Table.Th>
                                {hasSummary && <Table.Th><span style={{display:"inline-block", width:"60px"}}className={'headerCell'}>{t('tableHeaders.summary')}</span></Table.Th>}                                
                                <Table.Th id={'temp'}>{temperatureHeader}</Table.Th>
                                {hasStdDev?<Table.Th>
                                    <span className={'symbolHeaderCell'}>&#x3c3;<IconTemperature/></span>
                                </Table.Th>:<></>}
                                <Table.Th>
                                    <span>
                                        <DesktopTooltip label={t('tooltips.scrollToRain')} position='top'>
                                            <Button  className={'clickableHeaderCell'} style={{width:"30px"}} variant='default' size='compact-xs' onClick={scrollToChanceOfRain}><IconPercentage/></Button>
                                        </DesktopTooltip>
                                    </span>
                                </Table.Th>
                                <MediaQuery minWidth={501}>
                                    <Table.Th><span className={'headerCell'}>{t('tableHeaders.humidity')}</span></Table.Th>
                                    <Table.Th><span className={'headerCell'}>{t('tableHeaders.cloudCover')}</span></Table.Th>
                                    <Table.Th className={'clickableHeaderCell'} id={'aqi'}>
                                        <DesktopTooltip label={t('tooltips.aqiHeader')} position='top'>
                                            <Button style={{padding:'0px'}} size='sm' variant={fetchAqi?"active":"default"} onClick={toggleAqi}><span className={fetchAqi ? 'largerClickableHeaderCell' : 'struckClickableHeaderCell'}>AQI</span></Button></DesktopTooltip>
                                    </Table.Th>
                                </MediaQuery>
                                <Table.Th id={'wind'}>{windHeader}</Table.Th>
                                <MediaQuery minWidth={501}>
                                    <Table.Th><span>
                                        <Tooltip label={t('tooltips.bearingHeader')}>
                                            <Button className={'clickableHeaderCell'} variant='default' size='compact-xs' onClick={toggleRelBearing} >{showRelativeBearing ? t('tableHeaders.relBearing') : t('tableHeaders.windBearing')}</Button></Tooltip></span></Table.Th>
                                </MediaQuery>
                            </Table.Tr>
                        </Table.Thead>
                        {expandTable(forecast, metric, ForecastValues, ForecastValues.finishTime, hasSummary)}
                    </Table>
                </div>
            </Sentry.ErrorBoundary>
        </div>
    )
}

const WindSpeed = ({gust, windSpeed, showGusts} : {gust: string, windSpeed: string, showGusts: boolean}) => {
    const formatSpeed = useFormatSpeed()
    return (
        showGusts ?
            <i>{formatSpeed(parseInt(gust, 10))}</i> :
            formatSpeed(parseInt(windSpeed, 10))
    )
}

const Time = ({time, zone, i18n} : {time?: string, zone: string, i18n: i18n}) => {
    const { finishTime } = useForecastDependentValues()
    if (!finishTime) {
        Sentry.addBreadcrumb({
            category: 'fromFormat',
            level: "warning",
            message: `Finish time missing in Time, returned by useForecastDependentValues`
        })                                    
    }

    const timeFormat = getTimeFormat(i18n)
    return (
        time || (finishTime && DateTime.fromFormat(finishTime, finishTimeFormat, {zone:zone}).toFormat(timeFormat)) || "N/A"
    )
}

export default React.memo(ForecastTable)
