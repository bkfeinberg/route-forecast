
import { useEffect, useRef, useState } from 'react';

import { loadFromRideWithGps } from "../../redux/loadRouteActions"
import * as Sentry from "@sentry/react"
import PinnedRouteLoader from './PinnedRouteLoader';
import RideWithGpsId from './RideWithGpsId';
import { useTranslation } from 'react-i18next'
import type { RefObject } from 'react';
import { Button, Checkbox } from '@mantine/core';
import { useAppSelector, useAppDispatch } from '../../utils/hooks';
import Cookies from 'universal-cookie';

export const RouteInfoInputRWGPS = () => {
  const usingPinnedRoutes = useAppSelector(state => state.rideWithGpsInfo.usePinnedRoutes)
  const [
    showPinnedRoutes,
    setShowPinnedRoutes
  ] = useState<boolean>(usingPinnedRoutes)
  const cookies = new Cookies(null, { path: '/' });

  const [
    loadPOIs, setLoadPOIs
  ] = useState<boolean>(cookies.get('loadPOIs') === false ? false : true);
  const { t } = useTranslation()

  
  const loadButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cookies.set('loadPOIs', loadPOIs, { path: '/' } )
  }, [loadPOIs])
  
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "10px" }}>
        {showPinnedRoutes ?
          null :
          <>
            <div style={{ flex: 1 }}><RideWithGpsId loadButtonRef={loadButtonRef} /></div>
            <div className="or-divider" style={{ flex: 0.3, fontSize: "13px", textAlign: "center" }}>- OR -</div>
          </>
        }
        <Sentry.ErrorBoundary fallback={<h2>Something went wrong.</h2>}>
          <div style={{ flex: 1, padding: "5px" }}>
            <PinnedRouteLoader
              showPinnedRoutes={showPinnedRoutes}
              setShowPinnedRoutes={setShowPinnedRoutes}
            />
          </div>
        </Sentry.ErrorBoundary>
      </div>
      <Checkbox size="xs" label={t('controls.loadPOIs')} checked={loadPOIs} onChange={(event) => setLoadPOIs(event.currentTarget.checked)} />
      <RWGPSLoadRouteButton loadButtonRef={loadButtonRef} loadPOIs={loadPOIs} />
    </>
  )
}

// eslint-disable-next-line react/prop-types
const RWGPSLoadRouteButton = ({ loadButtonRef, loadPOIs }: { loadButtonRef: RefObject<HTMLButtonElement | null>, loadPOIs: boolean }) => {
  const { t } = useTranslation()
  const loading = useAppSelector(state => state.uiInfo.dialogParams.fetchingRoute)
  const hasRwgpsRouteId = useAppSelector(state => state.uiInfo.routeParams.rwgpsRoute !== '')
  const hasStravaRouteId = useAppSelector(state => state.strava.route !== '')
  const rwgpsRouteId = useAppSelector(state => state.uiInfo.routeParams.rwgpsRoute)
  const dispatch = useAppDispatch()
  return (
    <Button ref={loadButtonRef} variant={'filled'} disabled={loading || (!hasRwgpsRouteId && !hasStravaRouteId)}
      fullWidth loading={loading} onClick={() => dispatch(loadFromRideWithGps(rwgpsRouteId, false, loadPOIs))}>
      {t('buttons.loadRoute')}
    </Button>
  )
}