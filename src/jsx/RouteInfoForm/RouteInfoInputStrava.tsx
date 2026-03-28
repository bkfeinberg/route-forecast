
import stravaImage from 'Images/api_logo_pwrdBy_strava_stack_light.png';
import ReactGA from "react-ga4";
import * as Sentry from "@sentry/react"
import { loadStravaActivity, loadStravaRoute } from '../../redux/loadFromStravaActions';
import stravaRouteParser from '../../utils/stravaRouteParser';
import StravaActivityIdInput from './StravaActivityIdInput';
import StravaRouteIdInput from './StravaRouteIdInput';
import { useAppSelector, useAppDispatch } from '../../utils/hooks';
import { Button } from "@mantine/core"
import React, { useState, useEffect } from "react";
import { stravaApiSlice } from '../../redux/stravaApiSlice';
import { stravaTokenSet } from '../../redux/stravaSlice';
import Cookies from 'universal-cookie';

const RouteInfoInputStrava = () => {
  const dispatch = useAppDispatch()
  const strava_activity_id = useAppSelector(state => state.strava.activity);
  const strava_route_id = useAppSelector(state => state.strava.route);
  const fetchingFromStrava = useAppSelector(state => state.strava.fetching)
  const accessToken = useAppSelector(state => state.strava.access_token)
  const refreshToken = useAppSelector(state => state.strava.refresh_token)
  const expires_at = useAppSelector(state => state.strava.expires_at);
  const [refreshStravaToken, refreshedTokenResults] = stravaApiSlice.useLazyRefreshStravaTokenQuery()

  const cookies = new Cookies(null, { path: '/' });

  useEffect(() => {
    if ((expires_at! < Math.round(Date.now()/1000))) {
      refreshStravaToken(refreshToken);
    }
  }, [refreshToken, expires_at])

  useEffect(() => {
    if (refreshedTokenResults.isSuccess && !refreshedTokenResults.isFetching && !refreshedTokenResults.isFetching) {
      dispatch(stravaTokenSet({
        token:refreshedTokenResults.data.access_token, 
        expires_at:refreshedTokenResults.data.expires_at}));
        cookies.set('strava_access_token', refreshedTokenResults.data.access_token);
        cookies.set('strava_token_expires_at', refreshedTokenResults.data.expires_at.toString());
    }
  }, [refreshedTokenResults.isLoading, refreshedTokenResults.isSuccess])

  const fetchRoute = () => {
    ReactGA.event('earn_virtual_currency', {virtual_currency_name:strava_activity_id});
    dispatch(loadStravaActivity())
  }


  const validActivityId = strava_activity_id != ''

  return (
    <div style={{display: "flex", flexFlow: "column", alignItems: "flex-end"}}>
      <Sentry.ErrorBoundary fallback={<h2>Something went wrong.</h2>}>
        <div style={{width: "100%"}}>
          {(!accessToken || !refreshToken) ?
            <StravaLoginButton/> :
            <div>
              {(expires_at! >= Math.round(Date.now()/1000))?<StravaActivityIdInput access_token={accessToken}/>:null}
              <Button
                id='analyze'
                tabIndex={0}
                variant='filled'
                onClick={fetchRoute}
                disabled={fetchingFromStrava || !validActivityId}
                loading={fetchingFromStrava}
                fullWidth
                style={{backgroundColor: "rgb(234, 89, 41)", borderColor: "rgb(234, 89, 41)", color:"white", marginTop: "10px"}}
              >
                Analyze Ride
              </Button>
              <StravaRouteIdInput/>
              <Button disabled={fetchingFromStrava || strava_route_id === ''}
              style={{ backgroundColor: "#137cbd", borderColor: "#137cbd", marginTop: "10px", color:"white"}} loading={fetchingFromStrava} fullWidth
              onClick={() => dispatch(loadStravaRoute(strava_route_id))}>
                {fetchingFromStrava ? "Loading..." : "Load Route"}
              </Button>
            </div>
          }
        </div>
      </Sentry.ErrorBoundary>
      <img style={{marginTop: "10px"}} id='stravaImage' src={stravaImage}/>
    </div>
  )
}

const StravaLoginButton = () => {
  return (
    <Button
      style={{backgroundColor: "rgb(234, 89, 41)", borderColor: "rgb(234, 89, 41)", width: "100%"}}
      onClick={() => stravaRouteParser.authenticate()}
    >
      Login to Strava
    </Button>
  )
}

export default RouteInfoInputStrava;