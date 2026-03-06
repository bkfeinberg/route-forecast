import { connect, ConnectedProps } from 'react-redux';

import { stravaActivitySet } from '../../redux/stravaSlice';
import { ActionCreatorWithPayload } from '@reduxjs/toolkit';
import type { RootState } from "../../redux/store";
import { Flex, Input } from '@mantine/core';
import {logger} from "@sentry/react";
const { trace, debug, info, warn, error, fatal, fmt } = logger;

type StravaActivityIdProps = {
    canAnalyze: boolean
    strava_activity: string
    stravaActivitySet: ActionCreatorWithPayload<string, "strava/stravaActivitySet">
}
type PropsFromRedux = ConnectedProps<typeof connector>
const StravaActivityIdInput = ({ stravaActivitySet, strava_activity, canAnalyze } : StravaActivityIdProps) => {
    return (
        <Flex direction={"column"} justify={"center"}>
            <label style={{fontSize:"90%"}} htmlFor={"stravaActivity"}>{<span><b>Strava Activity Id</b></span>}</label>
            <Input style={{fontSize:"16px"}} autoFocus id='stravaActivity' tabIndex={0} type="text"
                onDrop={event => {
                    let dt = event.dataTransfer;
                    if (dt.items) {
                        for (let i = 0;i < dt.items.length;i++) {
                            if (dt.items[i].kind === 'string') {
                                event.preventDefault();
                                dt.items[i].getAsString(value => {
                                    stravaActivitySet(value);
                                    if (strava_activity !== '') {
                                        //updateExpectedTimes(strava_activity);
                                    }
                                });
                            } else {
                                warn(`vetoing drop of ${i} of type ${dt.items[i].kind}`);
                                return false;
                            }
                        }
                    }
                }}
                onDragEnd={event => {
                    let dt = event.dataTransfer;
                    if (dt.items) {
                        // Use DataTransferItemList interface to remove the drag data
                        for (let i = 0;i < dt.items.length;i++) {
                            dt.items.remove(i);
                        }
                    }
                }}
                value={strava_activity}
                onChange={event => { stravaActivitySet(event.target.value) }}
                onFocus={() => {
                    if (canAnalyze) {
                        // TODO
                        // i suspect this is here as a mechanism to automatially begin fetching if linked to with a premade url
                        // but this feels not ideal to me, making that functionality rely on the focus details of a random text input deep in the component tree
                        // should think about better ways of doing this
                        //updateExpectedTimes(strava_activity)
                    } else {
                        warn('gained focus but not acting because there is no Strava activity or access token set')
                    }
                }}
                onBlur={() => { if (strava_activity !== '') { /*updateExpectedTimes(strava_activity)*/ } }} />
        </Flex>
    );
};

const mapStateToProps = (state : RootState) =>
    ({
        strava_activity: state.strava.activity,
        canAnalyze: state.strava.activity !== '' && state.strava.access_token != null
    });

const mapDispatchToProps = {
    stravaActivitySet
};

const connector = connect(mapStateToProps,mapDispatchToProps)
export default connector(StravaActivityIdInput);
