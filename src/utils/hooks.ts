import * as Sentry from "@sentry/react";
import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from '../redux/store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

import stravaRouteParser from "./stravaRouteParser"
import { milesToMeters } from "./util"

const useDelay = (delay: number, startCondition = true) => {
  const [
    ready,
    setReady
  ] = useState(false)
  useEffect(() => {
    if (startCondition) {
      setTimeout(() => {
        Sentry.addBreadcrumb({category:"No stack", level:"info", message:"useDelay"})
        setReady(true)
      }, delay)
    }
  }, [
    delay,
    startCondition
  ])
  return ready
}

const useReusableDelay = <Type,>(delay: number, startCondition = true) => {
  const [
    ready,
    setReady
  ] = useState(false)
  const [
    restartedAt,
    setRestartedAt
  ] = useState<number|null>(null)
  const timeout = useRef<NodeJS.Timeout|null>(null)

  const cancel = () => {
    if (timeout.current !== null) {
      clearTimeout(timeout.current)
    }
  }

  useEffect(() => {
    if (timeout.current !== null) {
      clearTimeout(timeout.current)
    }
    if (startCondition) {
      timeout.current = setTimeout(() => {
        Sentry.addBreadcrumb({ category: "No stack", level: "info", message: "useReusableDelay" })
        setReady(true)
        timeout.current = null
      }, delay)
    } else {
      setReady(false)
    }

    return cancel
  }, [
    delay,
    startCondition,
    restartedAt
  ])

  const restart = () => {
    setReady(false)
    setRestartedAt(Date.now())
  }
  return [
    ready,
    restart,
    cancel
  ]
}

const useValueHasChanged = <Type,>(value: Type, startValue?: Type) => {
  const [
    oldValue,
    setOldValue
  ] = useState(value)
  const [
    hasChanged,
    setHasChanged
  ] = useState(false)
  useEffect(() => {
    if (oldValue !== value) {
      if (startValue === oldValue || startValue === undefined) {
        setHasChanged(true)
      } else {
        setOldValue(value)
      }
    }
  }, [value])
  return hasChanged
}

const usePreviousPersistent = <Type,>(value: Type) => {
  const [
    oldValue,
    setOldValue
  ] = useState<Type | null>(null)
  const [
    newValue,
    setNewValue
  ] = useState(value)
  useEffect(() => {
    setOldValue(newValue)
    setNewValue(value)
  }, [value])

  return oldValue
}

const useActualPace = () => {
  const activityData = useAppSelector(state => state.strava.activityData)
  return activityData !== null ? stravaRouteParser.computeWWPaceForActivity(activityData) : null
}

const useActualFinishTime = () => {
  const activityData = useAppSelector(state => state.strava.activityData)
  return activityData !== null ? stravaRouteParser.computeActualFinishTime(activityData) : null
}

const useActualArrivalTimes = () => {
  const activityData = useAppSelector(state => state.strava.activityData)
  const activityStream = useAppSelector(state => state.strava.activityStream)
  const controls = useAppSelector(state => state.controls.userControlPoints)

  return activityData !== null && activityStream !== null ? 
  stravaRouteParser.computeControlPointArrivalTimes(activityData, activityStream, controls) : null
}

const usePrevious = <Type,>(value : Type) => {
  const ref = useRef<Type>(null);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const useFormatSpeed = () => {
  const metric = useAppSelector(state => state.controls.metric)
  return (speed : number) => (metric ?
    `${((speed * milesToMeters) / 1000).toFixed(1)} kph` :
    `${speed.toFixed(1)} mph`);
}

const useWhenChanged = <Type,>(value : Type, callback : () => void, changedCondition = true) => {
  const previousValue = usePrevious(value)
  const valueChanged = previousValue !== undefined && previousValue !== value && value !== null && changedCondition
  useEffect(() => {
    if (valueChanged) {
      return callback()
    }
  }, [value])
}

export const useGetForecastRequestDependencies = () => {
  const rwgpsRouteData = useAppSelector(state => state.routeInfo.rwgpsRouteData)
  const routeUUID = useAppSelector(state => state.routeInfo.routeUUID)
  const timeZoneId = useAppSelector(state => state.uiInfo.routeParams.zone)
  const routeData = useAppSelector(state => state.routeInfo[rwgpsRouteData ? "rwgpsRouteData" : "gpxRouteData"])
  const startTimestamp = useAppSelector(state => state.uiInfo.routeParams.startTimestamp)
  const pace = useAppSelector(state => state.uiInfo.routeParams.pace)
  const interval = useAppSelector(state => state.uiInfo.routeParams.interval)
  const controlPoints = useAppSelector(state => state.controls.userControlPoints)
  const segment = useAppSelector(state => state.uiInfo.routeParams.segment)
  return {
    routeData,
    startTimestamp,
    timeZoneId,
    pace,
    interval,
    controlPoints,
    segment,
    routeUUID
  }
}

export { useValueHasChanged, useActualPace, useActualFinishTime, useActualArrivalTimes, 
  usePrevious, useFormatSpeed, useDelay, useReusableDelay, 
  usePreviousPersistent, useWhenChanged }