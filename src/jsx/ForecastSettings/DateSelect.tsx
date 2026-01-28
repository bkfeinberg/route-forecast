import '@mantine/dates/styles.css';

import { DateTime } from 'luxon';
import {connect, ConnectedProps} from 'react-redux';

import { DateTimePicker } from '@mantine/dates';
import  {useMediaQuery} from 'react-responsive'
import {setStart} from "../../redux/actions";
import { setTimeFromIso } from "../../redux/actions";
import { initialStartTimeSet } from "../../redux/routeParamsSlice";
import {useTranslation} from 'react-i18next'
import type { RootState } from "../../redux/store";
import { ActionCreatorWithPayload } from "@reduxjs/toolkit";
type PropsFromRedux = ConnectedProps<typeof connector>
import { IconCalendar } from '@tabler/icons-react';
import { DesktopTooltip } from '../shared/DesktopTooltip';

export const setDateOnly = (start : DateTime, setInitialStart : ActionCreatorWithPayload<{
    start: string;
    zone: string;
}, "routeParams/initialStartTimeSet">) => {
    let now = DateTime.now();
    let newStart = start.set({day: now.day, month:now.month, year:now.year});
    setInitialStart({start: newStart.toISO()!, zone:newStart.zone.name});
};

const DateSelect = ({ start, zone, setStart, initialStartTimeSet, maxDaysInFuture, canForecastPast, setTimeFromIso } : PropsFromRedux) => {
    const { t, i18n } = useTranslation()
    const setDateFromPicker = (dateTimeString : string|null) => {
        if (dateTimeString) {
            setStart(DateTime.fromFormat(dateTimeString, "yyyy-MM-dd HH:mm:ss", {zone:zone}).toMillis());
        }
    }

    const isMobile = useMediaQuery({query:'(max-width: 600px)'})
    // allow us to continue to show the start time if the route was forecast for a time before the present
    const now = new Date();
    let later = new Date();
    const daysToAdd = maxDaysInFuture;
    later.setDate(now.getDate() + daysToAdd);
    interface OtherAttributes {
        minDate? : Date
    }
    let otherAttributes : OtherAttributes = {}
    if (!canForecastPast) {
        otherAttributes.minDate = now
    }
    let startIso
    startIso = start.toISO({includeOffset:false, precision:'minutes'});
    if (startIso===null)
        startIso=undefined

    const shortTimeZoneName = start.toFormat("ZZZZ")
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span id={"startingTime"} style={{ fontSize: isMobile ? ".7rem" : ".875rem", fontWeight: "bolder", padding: "0px 5px", flex: 1 }}>
                <IconCalendar onClick={() => setDateOnly(start, initialStartTimeSet)} style={{ cursor: "pointer", marginRight: "3px" }} />
                {t('labels.startingTime')}
            </span>
            <div style={{ flex: 2.5 }}>
                <DesktopTooltip label={t('tooltips.startingTime')} >
                    <DateTimePicker
                        dropdownType={isMobile ? "modal" : "popover"}
                        placeholder="M/D/YYYY"
                        styles = {{ input : {fontSize: '16px'} }}
                        rightSection={<span style={{ paddingRight: 4 }}>{shortTimeZoneName}</span>}
                        rightSectionWidth={"max-content"}
                        rightSectionPointerEvents="auto"
                        required
                        firstDayOfWeek={1}
                        {...otherAttributes}
                        inputSize="20"
                        maxDate={later}
                        level={"month"}
                        locale={i18n.language}
                        value={startIso}
                        onChange={setDateFromPicker}
                        highlightToday={false}
                        valueFormat='MMMM DD, YYYY h:mma'
                        timePickerProps={{ minutesStep: 5, format: "12h", styles: {input: {fontSize:'16px'}} }}
                    />
                </DesktopTooltip>
            </div>
        </div>
    )
};

const mapStateToProps = (state : RootState) =>
    ({
        start: DateTime.fromMillis(state.uiInfo.routeParams.startTimestamp, {zone:state.uiInfo.routeParams.zone}),
        zone: state.uiInfo.routeParams.zone,
        maxDaysInFuture:state.uiInfo.routeParams.maxDaysInFuture,
        canForecastPast:state.uiInfo.routeParams.canForecastPast
    });

const mapDispatchToProps = {
    setStart, initialStartTimeSet, setTimeFromIso
};

const connector = connect(mapStateToProps,mapDispatchToProps)
export default connector(DateSelect);
