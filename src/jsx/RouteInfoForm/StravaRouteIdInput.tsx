import {connect, ConnectedProps} from 'react-redux';
import type { RootState } from "../../redux/store";
import { stravaRouteSet } from '../../redux/stravaSlice';
import { Flex, Input } from '@mantine/core';
import {logger} from "@sentry/react";
const { trace, debug, info, warn, error, fatal, fmt } = logger;

type PropsFromRedux = ConnectedProps<typeof connector>

const StravaRouteIdInput = ({ stravaRouteSet, strava_route } : PropsFromRedux) => {
    return (
        <Flex direction={"column"} justify={"center"} >
            <label style={{fontSize:"90%"}} htmlFor={"stravaRoute"}>{<span><b>Strava Route Id</b></span>}</label>
            <Input style={{fontSize:"16px"}} id='stravaRoute' tabIndex={1} type="text"
                onDrop={event => {
                    let dt = event.dataTransfer;
                    if (dt.items) {
                        for (let i = 0;i < dt.items.length;i++) {
                            if (dt.items[i].kind === 'string') {
                                event.preventDefault();
                                dt.items[i].getAsString(value => {
                                    stravaRouteSet(value);
                                    if (strava_route !== '') {
                                        //updateExpectedTimes(strava_activity);
                                    }
                                });
                            } else {
                                info(`vetoing drop of ${i} ${dt.items[i].kind}`);
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
                value={strava_route}
                onChange={event => { stravaRouteSet(event.target.value) }}
                onBlur={() => { if (strava_route !== '') { /*updateExpectedTimes(strava_activity)*/ } }} />
        </Flex>
    );
};

const mapStateToProps = (state : RootState) =>
    ({
        strava_route: state.strava.route
    });

const mapDispatchToProps = {
    stravaRouteSet
};

const connector = connect(mapStateToProps,mapDispatchToProps)
export default connector(StravaRouteIdInput)
