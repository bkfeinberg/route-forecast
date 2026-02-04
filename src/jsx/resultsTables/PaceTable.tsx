import 'animate.css/animate.min.css';

import { useState } from 'react';
import Cookies from 'universal-cookie';
import {connect, ConnectedProps} from 'react-redux';
import * as Sentry from "@sentry/react"
import { zoomToRangeToggled } from '../../redux/forecastSlice';
import { useActualPace, useFormatSpeed } from '../../utils/hooks';
import stravaRouteParser from '../../utils/stravaRouteParser';
import { ToggleButton } from '../shared/ToggleButton';
import StravaAnalysisIntervalInput from './StravaAnalysisIntervalInput';
import {useTranslation} from 'react-i18next'
import { mapSubrangeSet, mapRangeToggled } from '../../redux/stravaSlice';
import type { RootState } from "../../redux/store";
import { Tooltip, Table } from '@mantine/core';
import { TableBody } from '@mui/material';

type PropsFromRedux = ConnectedProps<typeof connector>

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // extends React's HTMLAttributes
        start?:number
        end?: number
    }
}

const PaceTable = ({activityData, activityStream, analysisInterval, mapSubrangeSet, mapRangeToggled, zoomToRange, zoomToRangeToggled} : PropsFromRedux) =>  {
    const { t } = useTranslation()
    const cookies = new Cookies(null, { path: '/' });
    const [
        selectedRow,
        setSelectedRow
    ] = useState<string|null>(null)

    const updateSubrange = (event: React.MouseEvent) => {
        const startDistance = event.currentTarget.getAttribute('start');
        const endDistance = event.currentTarget.getAttribute('end');
        if (!startDistance || !endDistance) {
            return
        }
        mapSubrangeSet({
            start: startDistance,
            finish: endDistance
        }
        );
    };

    const toggleZoom = () => {
        zoomToRangeToggled();
        cookies.set('zoomToRange', (!zoomToRange).toString(), { path: '/' });
    };

    const toggleRange = (event : React.MouseEvent) => {
        const startDistance = event.currentTarget.getAttribute('start');
        const endDistance = event.currentTarget.getAttribute('end');
        if (!startDistance || !endDistance) {
            return
        }
        mapRangeToggled({start:startDistance, finish:endDistance});
        if (selectedRow === startDistance) {
            setSelectedRow(null)
        } else {
            setSelectedRow(startDistance)
        }
    };

    const formatSpeed = useFormatSpeed()

    interface Pace {
        speed: number;
        distance: number;
        climb: number;
        start: number;
        end: number;
        pace: number;
        alphaPace: string | undefined;
        time: string;
        stoppedTimeSeconds: number;
    }
    const expandTable = (paces : Array<Pace>) => {
        return (
            <TableBody>
            {paces.map((pace) =>
                <Table.Tr key={pace.distance+Math.random().toString(10)} start={pace.start} end={pace.end}
                    onClick={toggleRange} onMouseEnter={updateSubrange}>
                    <Table.Td>{pace.time}</Table.Td>
                    <Table.Td>{formatSpeed(pace.pace)}</Table.Td>
                    <Table.Td>{pace.alphaPace}</Table.Td>
                    <Table.Td>{pace.distance.toFixed(0)}</Table.Td>
                    <Table.Td>{pace.climb.toFixed(0)}</Table.Td>
                    <Table.Td>{((pace.climb*100)/(pace.distance*5280)).toFixed(1)}%</Table.Td>
                    <Table.Td>{(pace.stoppedTimeSeconds/60).toFixed(1)}min</Table.Td>
                </Table.Tr>
            )}
            </TableBody>
        );
    }

    const actualPace = useActualPace()

    if (activityData === null || activityStream === null || !actualPace) {
        return null
    }
    const paceOverTime = stravaRouteParser.findMovingAverages(activityData, activityStream, analysisInterval)

    // TODO: localize table headers
    return (
            <div className="animated slideInRight">
                <Sentry.ErrorBoundary fallback={<h2>Something went wrong.</h2>}>
                    <div style={{padding: "16px", display: "flex", flexFlow: "column", alignItems: "center"}}>
                        <StravaAnalysisIntervalInput />
                        <div id="paceSpan" style={{fontSize: "14px", marginTop: "10px"}}>{t('analysis.overallPace')} <span style={{fontWeight: "bold"}}>{formatSpeed(actualPace)}</span>.</div>
                    </div>
                    <div style={{padding: "16px", display: "flex", flexFlow: "column", alignItems: "end"}}>
                        <ToggleButton active={zoomToRange} onClick={toggleZoom}>{t('buttons.zoomToSegment')}</ToggleButton>
                    </div>
                    <Table withTableBorder striped withRowBorders stickyHeader stickyHeaderOffset={16} withColumnBorders highlightOnHover>
                        <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{'fontSize':'80%'}}>Time</Table.Th>
                            <Table.Th id={'pace'} style={{'fontSize':'80%'}}>
                                <Tooltip label={t('tooltips.overallPace')} position='top'>Pace</Tooltip>
                            </Table.Th>
                            <Table.Th style={{'fontSize':'80%'}}>WW Pace</Table.Th>
                            <Table.Th style={{'fontSize':'80%'}}>Distance</Table.Th>
                            <Table.Th style={{'fontSize':'80%'}}>Climb</Table.Th>
                            <Table.Th style={{'fontSize':'80%'}}>Avg Grade</Table.Th>
                            <Table.Th style={{'fontSize':'80%'}}>Time Stopped</Table.Th>
                        </Table.Tr>
                        </Table.Thead>
                        {expandTable(paceOverTime)}
                    </Table>
                </Sentry.ErrorBoundary>
            </div>
    );
}

const mapStateToProps = (state : RootState) =>
    ({
        activityData: state.strava.activityData,
        activityStream: state.strava.activityStream,
        analysisInterval: state.strava.analysisInterval,
        zoomToRange: state.forecast.zoomToRange
    });

const mapDispatchToProps = {
    mapSubrangeSet, mapRangeToggled, zoomToRangeToggled
};

const connector = connect(mapStateToProps,mapDispatchToProps)
export default connector(PaceTable);
