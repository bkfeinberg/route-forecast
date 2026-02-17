
import { useRef,useState } from 'react';

import { loadFromRideWithGps } from "../../redux/loadRouteActions"
import * as Sentry from "@sentry/react"
import PinnedRouteLoader from './PinnedRouteLoader';
import RideWithGpsId from './RideWithGpsId';
import {useTranslation} from 'react-i18next'
import type { RefObject } from 'react';
import { Button } from '@mantine/core';
import { useAppSelector, useAppDispatch } from '../../utils/hooks';
export const RouteInfoInputRWGPS = () => {
  const usingPinnedRoutes = useAppSelector(state => state.rideWithGpsInfo.usePinnedRoutes)
  const [
showPinnedRoutes,
setShowPinnedRoutes
] = useState<boolean>(usingPinnedRoutes)
  const loadButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <div style={{display: "flex", justifyContent: "center", alignItems: "center", padding:"10px"}}>
        {showPinnedRoutes ?
null :
          <>
            <div style={{flex: 1}}><RideWithGpsId loadButtonRef={loadButtonRef}/></div>
            <div className="or-divider" style={{flex: 0.3, fontSize: "13px", textAlign: "center"}}>- OR -</div>
          </>
        }
        <Sentry.ErrorBoundary fallback={<h2>Something went wrong.</h2>}>
          <div style={{flex: 1, padding: "5px"}}>
            <PinnedRouteLoader
              showPinnedRoutes={showPinnedRoutes}
              setShowPinnedRoutes={setShowPinnedRoutes}
            />
          </div>
        </Sentry.ErrorBoundary>
      </div>
      <RWGPSLoadRouteButton loadButtonRef={loadButtonRef}/>
    </>
  )
}

// eslint-disable-next-line react/prop-types
const RWGPSLoadRouteButton = ({loadButtonRef}:{loadButtonRef:RefObject<HTMLButtonElement|null>}) => {
  const { t } = useTranslation()
  const loading = useAppSelector(state => state.uiInfo.dialogParams.fetchingRoute)
  const hasRwgpsRouteId = useAppSelector(state => state.uiInfo.routeParams.rwgpsRoute!=='')
  const hasStravaRouteId = useAppSelector(state => state.strava.route!=='')
  const dispatch = useAppDispatch()
  return (
    <Button ref={loadButtonRef} variant={'filled'} disabled={loading || (!hasRwgpsRouteId && !hasStravaRouteId)}
      fullWidth loading={loading} onClick={() => dispatch(loadFromRideWithGps())}>
      {t('buttons.loadRoute')}
    </Button>
  )
}