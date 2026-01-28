import {logger} from "@sentry/react";
const { trace, debug, info, warn, error, fatal, fmt } = logger;
import { routeLoadingModes } from "../data/enums";
import { useMemo } from "react";
import gpxParser, { type Point } from "./gpxParser";
import { useAppSelector } from "./hooks";
import stravaRouteParser from "./stravaRouteParser";
import type { Bounds } from "./util";

export type MapPoint = { lat: number; lng: number; dist?: number; };
export type MapPointList = Array<MapPoint>;

export type PointsAndBounds = {
  points?: MapPointList;
  pointList: Array<Point>;
  bounds: Bounds;
};
export const usePointsAndBounds = (): PointsAndBounds => {
  const rwgpsRouteData = useAppSelector(state => state.routeInfo.rwgpsRouteData);
  const rwgpsRoute = useAppSelector(state => state.uiInfo.routeParams.rwgpsRoute);
  const gpxRouteData = useAppSelector(state => state.routeInfo.gpxRouteData);

  const routeLoadingMode = useAppSelector(state => state.uiInfo.routeParams.routeLoadingMode);
  const stravaRoute = useAppSelector(state => state.strava.route);
  const stravaActivityStream = useAppSelector(state => state.strava.activityStream);
  const stravaMode = routeLoadingMode === routeLoadingModes.STRAVA;

  let pointsAndBounds: PointsAndBounds = { pointList: [], bounds: { min_latitude: 90, min_longitude: 180, max_latitude: -90, max_longitude: -180 } };

  if (stravaMode) {
    if (stravaActivityStream !== null) {
      pointsAndBounds = useMemo(() => stravaRouteParser.computePointsAndBounds(stravaActivityStream), [stravaActivityStream]);
    } else if ((stravaRoute !== '') && gpxRouteData) {
      // we import strava routes as gpx - so we expect the second half of the above condition to 
      // always be true
      pointsAndBounds = useMemo(() => gpxParser.computePointsAndBounds(
        gpxParser.parseGpxRouteStream(gpxRouteData)), [gpxRouteData]);
    }
  } else if (rwgpsRouteData !== null) {
    pointsAndBounds = useMemo(() => gpxParser.computePointsAndBounds(gpxParser.parseRwgpsRouteStream(rwgpsRouteData)), [rwgpsRouteData]);
    // pointsAndBounds = gpxParser.computePointsAndBounds(gpxParser.parseRwgpsRouteStream(rwgpsRouteData))
    if (!pointsAndBounds) {
      warn(`no points and bounds from RWGPS data with ${rwgpsRouteData[rwgpsRouteData.type].track_points.length} points`);
    }
  } else if (gpxRouteData !== null) {
    pointsAndBounds = useMemo(() => gpxParser.computePointsAndBounds(gpxParser.parseGpxRouteStream(gpxRouteData)), [gpxRouteData]);
  }
  if (pointsAndBounds.pointList.length === 0) {
    Sentry.captureMessage(
      `Empty points and bounds :Strava activity empty=${stravaActivityStream === null} Strava route: ${stravaRoute} RWGPS:${rwgpsRoute} RWGPS empty:${rwgpsRouteData === null} GPX empty:${gpxRouteData === null}`);
  }
  if (pointsAndBounds.pointList.length > 0) {
    pointsAndBounds.points = useMemo(() => pointsAndBounds.pointList
      .map(point => ({ lat: point.lat, lng: point.lon, dist: point.dist })), [pointsAndBounds.pointList]);
  }

  return pointsAndBounds;
};

import { DateTime } from "luxon";
import type { ControlsState } from "../redux/controlsSlice";
import type { RouteInfoState } from "../redux/routeInfoSlice";
import { type WindAdjustResults } from "./gpxParser";
import { getRouteInfo } from "./routeUtils";

///
//  routeInfo, routeParams, controls, timeZoneId, forecast, segment
const dependencies = [
  'routeInfo',
  'routeParams',
  'controls',
  'timeZoneId',
  'forecast'
];
interface WindResultInputs {
  controls: ControlsState;
  routeInfo: RouteInfoState;
  [index: string]: any;
}
type WalkRouteResult = {
  forecastRequest: [];
  points: [];
  values: [];
  finishTime: String;
  timeInHours: number;
};
type CachedWindResult = {
  result: WindAdjustResults;
  dependencyValues: WindResultInputs | { [index: string]: any; };
};
let lastWindResult: CachedWindResult = {
  result: {
    weatherCorrectionMinutes: 0, calculatedControlPointValues: [],
    maxGustSpeed: 0, finishTime: "", adjustedTimes: [], chartData: []
  }, dependencyValues: {}
};
export const calculateWindResult = (inputs: WindResultInputs): WindAdjustResults => {
  if (dependencies.every(dependency => inputs[dependency] === lastWindResult.dependencyValues[dependency])) {
    return lastWindResult.result;
  }
  const { routeInfo: routeInfoState, routeParams, controls, timeZoneId, forecast, segment } = inputs;
  const routeInfo = routeInfoState.rwgpsRouteData ? routeInfoState.rwgpsRouteData : routeInfoState.gpxRouteData;
  let result;
  if (routeInfo) {
    const { points, values, finishTime, totalDistMeters } = getRouteInfo(
      routeInfo,
      routeParams.startTimestamp,
      routeParams.zone,
      routeParams.pace,
      routeParams.interval,
      controls.userControlPoints,
      segment, routeInfoState.routeUUID);

    let sortedControls = controls.userControlPoints.slice();
    sortedControls?.sort((a, b) => a['distance'] - b['distance']);

    let sortedValues = values.slice();
    sortedValues.sort((a: { [x: string]: number; }, b: { [x: string]: number; }) => a['distance'] - b['distance']);

    const { weatherCorrectionMinutes, calculatedControlPointValues, maxGustSpeed, finishTime: adjustedFinishTime, adjustedTimes, chartData } = gpxParser.adjustForWind(
      forecast,
      points,
      routeParams.pace,
      sortedControls,
      sortedValues,
      DateTime.fromMillis(routeParams.startTimestamp, { zone: routeParams.zone }),
      finishTime,
      timeZoneId,
      totalDistMeters
    );
    result = {
      weatherCorrectionMinutes: weatherCorrectionMinutes,
      calculatedControlPointValues: calculatedControlPointValues, maxGustSpeed: maxGustSpeed,
      finishTime: adjustedFinishTime, adjustedTimes, chartData: chartData
    };
  } else {
    result = {
      weatherCorrectionMinutes: 0, calculatedControlPointValues: [],
      maxGustSpeed: 0, finishTime: null, adjustedTimes: [], chartData: []
    };
  }
  lastWindResult = { result, dependencyValues: inputs };
  return result;
};

