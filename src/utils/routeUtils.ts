import { DateTime } from 'luxon';
import type { UserControl } from '../redux/controlsSlice';
import type { GpxRouteData, RwgpsRoute, RwgpsTrip, } from '../redux/routeInfoSlice';
import gpxParser, { type RouteAnalysisResults, type Segment, type ExtractedControl } from './gpxParser';

let cachedRouteUUID: string | null = null;
let cachedRouteData: RouteAnalysisResults = {
  points: [], forecastRequest: [], values: [],
  finishTime: '', timeInHours: 0, totalDistMeters: 0
};

export const getRouteInfo = (routeData: GpxRouteData | RwgpsRoute | RwgpsTrip,
  startTimestamp: number, timeZoneId: string, pace: string, interval: number,
  userControlPoints: Array<UserControl>, segment: Segment, routeUUID: string | null) => {
  let workingTimestamp = startTimestamp;
  // preflight check before using cached data
  // make sure to get a new forecast request if the starting date is in the past
/*   if (cachedRouteData && cachedRouteData.forecastRequest &&
    cachedRouteData.forecastRequest[0] &&
    DateTime.fromFormat(cachedRouteData.forecastRequest[0].time, "yyyy-MM-dd'T'HH:mm:00ZZZ") < DateTime.now()) {
    workingTimestamp = DateTime.now().plus({ hours: 1 }).toMillis();
  }
  else  */if (routeUUID === cachedRouteUUID) {
    return cachedRouteData;
  }
  if (routeData.type === "route" || routeData.type === "trip") {
    const data = gpxParser.walkRwgpsRoute(
      routeData,
      DateTime.fromMillis(workingTimestamp, { zone: timeZoneId }),
      pace,
      interval,
      userControlPoints,
      timeZoneId,
      segment
    );
    cachedRouteData = data;
    cachedRouteUUID = routeUUID;
    return data;
  } else {
    const data = gpxParser.walkGpxRoute(
      routeData,
      DateTime.fromMillis(workingTimestamp, { zone: timeZoneId }),
      pace,
      interval,
      userControlPoints,
      timeZoneId,
      segment
    );
    cachedRouteData = data;
    cachedRouteUUID = routeUUID;
    return data;
  }
};

export const getForecastRequest = (routeData: GpxRouteData | RwgpsRoute | RwgpsTrip,
  startTimestamp: number, timeZoneId: string, pace: string, interval: number,
  userControlPoints: Array<UserControl>, segment: Segment, routeUUID: string | null) => {
  return (
    getRouteInfo(
      routeData, startTimestamp, timeZoneId, pace, interval, userControlPoints,
      segment, routeUUID
    )?.forecastRequest
  );
};

export const removeDuplicateControl = (controls: Array<ExtractedControl>) => {
  const seenDistances = new Set(); for (let i = 0; i < controls.length - 1; ++i) {
    return controls.filter(ctrl => {
      if (ctrl.distance === 0 || seenDistances.has(ctrl.distance)) return false
      seenDistances.add(ctrl.distance)
      return true
    })
  }
}

const longerName = (a : ExtractedControl,b : ExtractedControl) => {
  if (!a.name) return -1
  if (!b.name) return 1
  return (b.name.length - a.name.length)
}

const compareControls = (a: ExtractedControl, b: ExtractedControl) => {
  if (a.distance === b.distance) {
    if (a.duration === b.duration) {
      return longerName(a,b)
    }
    else {
      return b.duration - a.duration
    }
  }
    return a.distance - b.distance
}

export const extractControlsFromRoute = (routeData: RwgpsRoute | RwgpsTrip, loadPOIs: boolean = true) => {
  const controlsPointControls = gpxParser.extractControlPoints(routeData)
  const poiControls = loadPOIs ? gpxParser.extractControlsFromPois(routeData) : undefined
  if (poiControls) {
    const deduplicatedControls = removeDuplicateControl(controlsPointControls.
      concat(poiControls).sort(compareControls))
    return deduplicatedControls ? deduplicatedControls : []
  } else {
    return controlsPointControls
  }
}
