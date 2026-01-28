import {connect, ConnectedProps} from 'react-redux';
import {useTranslation} from 'react-i18next'
import { routeDataCleared} from '../../redux/routeInfoSlice';
import { rwgpsRouteSet } from '../../redux/routeParamsSlice';
import { querySet } from '../../redux/paramsSlice';
import type { RootState } from "../../redux/store";
import { ChangeEvent, RefObject } from 'react';
import { CloseButton, Flex, TextInput } from '@mantine/core';
import { updateHistory } from '../../jsx/app/updateHistory';
import {logger} from "@sentry/react";
const { trace, debug, info, warn, error, fatal, fmt } = logger;

export const decideValidationStateFor = (type : string, methodUsed : string|null, loadingSuccess : boolean) => {
    if (type === methodUsed) {
        if (loadingSuccess) {
            return {'valid':null};
        } else {
            return {'invalid':null};
        }
    } else {
        return null;
    }
}

type PropsFromRedux = ConnectedProps<typeof connector>
interface RideWithGpsIdProps extends PropsFromRedux {
    loadButtonRef:RefObject<HTMLButtonElement|null>
}

const RideWithGpsId = ({rwgpsRouteSet,loadingSource,loadingSuccess,rwgpsRoute,routeDataCleared,loadButtonRef} : RideWithGpsIdProps) => {
    const { t } = useTranslation();
    
    const isNumberKey = function(event:React.KeyboardEvent<HTMLInputElement>) {
        const charCode = (event.which) ? event.which : event.keyCode;
        if (charCode === 13 && loadButtonRef && loadButtonRef.current) {
            loadButtonRef.current.click()
        }
    };

    const settingRoute = (value: ChangeEvent<HTMLInputElement>|string) => {
        rwgpsRouteSet(typeof value === "string" ? value : value.target?.value);
        routeDataCleared();
    };

    const clearRoute = () => {
        rwgpsRouteSet('')
        routeDataCleared();
        querySet({url:window.location.origin, search:''});
        updateHistory(window.location.origin, '');
    }

    // set font size of input to keep Mobile Safari from zooming
    return (
        <Flex direction={"column"} justify={"center"} >
            <TextInput id={'rwgps_route'} styles={{
                input: { fontSize: "16px" }, label: {
                    textAlign: 'center',
                    width: '100%'
                }
            }} className={'glowing_input'} autoComplete='on'
                autoFocus tabIndex={0} type="text" rightSection={<CloseButton onClick={clearRoute}></CloseButton>}
                inputSize='md' w='10rem'
                label={<span style={{ fontSize: "75%" }}><b>{t('titles.rwgpsId')}</b></span>}
                {...decideValidationStateFor('rwgps', loadingSource, loadingSuccess)}
                onKeyDown={isNumberKey}
                onChange={settingRoute}
                onDrop={event => {
                    let dt = event.dataTransfer;
                    if (dt.items) {
                        for (let i = 0; i < dt.items.length; i++) {
                            if (dt.items[i].kind === 'string') {
                                event.preventDefault();
                                dt.items[i].getAsString(value => {
                                    settingRoute(value);
                                });
                            } else {
                                info(`vetoing drop of ${i} ${dt.items[i].kind}`);
                                return false;
                            }
                        }
                    }
                }}
                pattern="[0-9]*"
                value={rwgpsRoute} />
        </Flex>
    );
};

const mapStateToProps = (state : RootState) =>
    ({
        loadingSource: state.uiInfo.dialogParams.loadingSource,
        loadingSuccess: state.uiInfo.dialogParams.succeeded,
        rwgpsRoute:state.uiInfo.routeParams.rwgpsRoute,
    });

const mapDispatchToProps = {
    rwgpsRouteSet, routeDataCleared
};

const connector = connect(mapStateToProps,mapDispatchToProps)
export default connector(RideWithGpsId);