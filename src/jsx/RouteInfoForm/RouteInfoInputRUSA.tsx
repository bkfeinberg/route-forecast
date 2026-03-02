
import * as Sentry from "@sentry/react";
import React, { ChangeEvent, useRef } from 'react';
import ReactGA from "react-ga4"

import { loadFromRideWithGps } from '../../redux/loadRouteActions';
import { errorDetailsSet } from '../../redux/dialogParamsSlice';
import { rusaIdLookupApiSlice } from '../../redux/rusaLookupApiSlice';
import { rusaPermRouteIdSet, rwgpsRouteSet } from '../../redux/routeParamsSlice';
import { useAppDispatch, useAppSelector } from '../../utils/hooks';
import {Button, CloseButton, Flex, Input} from "@mantine/core"

const RouteInfoInputRUSA = () => {
    const loadButtonRef = useRef(null)
    const dispatch = useAppDispatch()
    const rusaPermRouteId = useAppSelector(state => state.uiInfo.routeParams.rusaPermRouteId)

    const [getRusaPermInfo] = rusaIdLookupApiSlice.useLazyLookupRusaPermIdQuery()

    const lookupRouteId = () => {
        ReactGA.event('spend_virtual_currency', {virtual_currency_name:'RUSA',value:Number.parseInt(rusaPermRouteId)})
        Sentry.addBreadcrumb({
            category: 'load',
            level: 'info',
            message:'Loading RUSA perm query'
        })
        getRusaPermInfo(rusaPermRouteId).unwrap().then(routeInfo => {
            if (routeInfo.length === 0) {
                dispatch(errorDetailsSet(`${rusaPermRouteId} is not a valid permanent route ID`))
                return
            }
            dispatch(rwgpsRouteSet(routeInfo[0].rwgps))
            dispatch(loadFromRideWithGps())
        }).catch(error => dispatch(errorDetailsSet(error)))
    }

    const isReturnKey = function(event : React.KeyboardEvent) {
        const charCode = (event.which) ? event.which : event.keyCode;
        if (charCode === 13) {
            (loadButtonRef.current! as HTMLButtonElement).click()
        }
    };

    const clearRoute = () => {
        dispatch(rusaPermRouteIdSet(''))
    }

    const settingRoute = (event : ChangeEvent<HTMLInputElement>) => {
        dispatch(rusaPermRouteIdSet(event.target?.value))
    }

    return (
        <>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding:"10px" }}>
                <Flex direction={"column"} justify={"center"} style={{fontSize:"90%"}}>
                <label htmlFor={'rusa_perm_route'}>{<span><b>RUSA permanent route ID</b></span>} </label>
                    <Input id={'rusa_perm_route'} style={{fontSize:"16px"}} className={'glowing_input'}
                        autoFocus tabIndex={0} type="number" rightSection={<CloseButton onClick={clearRoute}/>}
                        onChange={settingRoute}
                        onKeyDown={isReturnKey}
                        value={rusaPermRouteId}/>
                </Flex>
            </div>
            <RUSALoadRouteButton loadButtonRef={loadButtonRef} lookupFunc={lookupRouteId}/>
        </>
    )
}

type RUSALoadRouteButtonProps = {
    loadButtonRef: React.MutableRefObject<HTMLButtonElement|null>
    lookupFunc:  () => void
}

const RUSALoadRouteButton = ({loadButtonRef, lookupFunc} : RUSALoadRouteButtonProps) => {
  const isLoading = useAppSelector(state => state.uiInfo.dialogParams.fetchingRoute)
  const hasRusaPermId = useAppSelector(state => state.uiInfo.routeParams.rusaPermRouteId !== '')
  return (
    <Button ref={loadButtonRef} variant='filled' fullWidth disabled={isLoading || (!hasRusaPermId)}
        onClick={lookupFunc} loading={isLoading}>
            Load Route
    </Button>
  )
}

export default RouteInfoInputRUSA;