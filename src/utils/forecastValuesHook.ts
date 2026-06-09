import { ForecastRequest } from "gpxParser";
import { DateTime } from "luxon";
import { useAppSelector, useAppDispatch } from "./hooks";
import { calculateWindResult } from "./routeHooks";
import { startTimestampSet } from '../redux/routeParamsSlice';
import { useEffect } from "react";

const preventInvalidStatsTime = (forecastRequest: Array<ForecastRequest>, dispatch: any) => {
  if (forecastRequest[forecastRequest.length - 1] &&
      DateTime.fromFormat(forecastRequest[forecastRequest.length - 1].time, "yyyy-MM-dd'T'HH:mm:00ZZZ") < DateTime.now()) {
      dispatch(startTimestampSet({ start: DateTime.now().plus({ hours: 1 }).toUnixInteger(), zone: DateTime.now().zoneName }))
  }
}

export const useForecastDependentValues = () => {
  const routeInfo = useAppSelector(state => state.routeInfo);
  const routeParams = useAppSelector(state => state.uiInfo.routeParams);
  const controls = useAppSelector(state => state.controls);
  const timeZoneId = routeParams.zone;
  const forecast = useAppSelector(state => state.forecast.forecast);
  const segment = useAppSelector(state => state.uiInfo.routeParams.segment);
  const dispatch = useAppDispatch();

  const windAdjustmentResult = calculateWindResult({ routeInfo, routeParams, controls, timeZoneId, forecast, segment });

  useEffect(() => {
    if (windAdjustmentResult.forecastRequest) {
      preventInvalidStatsTime(windAdjustmentResult.forecastRequest, dispatch);
    }
  }, [windAdjustmentResult.forecastRequest])

  return windAdjustmentResult;


};
