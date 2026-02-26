import { DateTime, Interval } from "luxon";
import { useGetForecastRequestDependencies } from "./hooks";
import { getForecastRequest } from "./routeUtils";

export const useForecastRequestData = () => {
  const {
    routeData, startTimestamp, timeZoneId, pace, interval, controlPoints, segment, routeUUID
  } = useGetForecastRequestDependencies();
  const getForecastRequestData = () => {
    if (!routeData) {
      // removed Sentry message here because this can happen when the language selection buttons are used
      // after a route has already been loaded
      return { length: 0, daysInFuture: 0, last: DateTime.now().toString() };
    }
    const forecastRequest = getForecastRequest(
      routeData,
      startTimestamp,
      timeZoneId, pace,
      interval, controlPoints,
      segment, routeUUID);
    return { length: forecastRequest.length, last: forecastRequest[forecastRequest.length - 1].time };
  };
  const forecastData = getForecastRequestData();
  const daysInFuture = Interval.fromDateTimes(DateTime.now(), DateTime.fromISO(forecastData.last)).length('days');

  return { length: forecastData.length, daysInFuture: daysInFuture };
};
