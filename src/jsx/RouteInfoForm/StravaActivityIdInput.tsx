import { connect, ConnectedProps, useSelector } from 'react-redux';

import { stravaActivitySet } from '../../redux/stravaSlice';
import { ActionCreatorWithPayload, SerializedError } from '@reduxjs/toolkit';
import type { RootState } from "../../redux/store";
import { Flex, Group, Input, Button } from '@mantine/core';
import {logger} from "@sentry/react";
const { trace, debug, info, warn, error, fatal, fmt } = logger;
import { useAppDispatch, useAppSelector } from "../../utils/hooks";
import { StravaActivity, useLoadActivitiesQuery } from '../../redux/stravaApiSlice';
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, useState } from 'react';
import { Alert, Combobox, ComboboxOptionProps, useCombobox, Text } from '@mantine/core';
import '@mantine/core/styles/Alert.css';
import { IconMap } from "@tabler/icons-react";
import stravaImage from 'Images/api_logo_pwrdBy_strava_stack_light.png';
import { useSearchParams } from 'react-router-dom';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
type MinimalActivity = {
    id: number,
    name: string
}
function SelectOption({ name, id }: MinimalActivity) {
  let idString = id.toString()
  const queryFound = idString.indexOf('?');
  if (queryFound !== -1) {
    idString = idString.slice(0, queryFound);
  }
  return (
    <Group>
      <Text fz={20}>{idString}</Text>
      <div>
        <Text fz="sm" fw={500}>
          {name}
        </Text>
        {/* <Text fz="xs" opacity={0.6}>
          {name}
        </Text> */}
      </div>
    </Group>
  );
}

const apiErrorToString = (errorObject: FetchBaseQueryError | SerializedError | undefined) => {
  if (errorObject) {
    if ('status' in errorObject) {
      // This is a FetchBaseQueryError
      const errMsg = 'error' in errorObject ? errorObject.error : JSON.stringify(errorObject.data);
      return errMsg;
    } else {
      // This is a SerializedError
      return errorObject.message;
    }
  } else {
    return '';
  }
}

const StravaActivityIdInput = ({ access_token }: { access_token: string }) => {
    const combobox = useCombobox()
    const { data: activities, isLoading, isError, error:loadActivitiesError } = useLoadActivitiesQuery({ access: access_token });
    const routeName = useAppSelector(state => state.routeInfo.name);
    const [selectedName, setSelectedName] = useState(routeName);
    const dispatch = useAppDispatch();

    if (isLoading) return <Text fw={500}>Loading activities...</Text>;
    if (isError || !activities) {
      error(`An error ${JSON.stringify(apiErrorToString(loadActivitiesError))} occurred loading Strava activities using key ${access_token}`);
      return <Alert variant="light" color="red" radius="xl" title="Strava error">An error {apiErrorToString(loadActivitiesError)} occurred loading activities</Alert>;
    }

    const options = activities.activities.map((item) => (
        <Combobox.Option value={item.id.toString()} key={item.id}>
            <SelectOption {...item} key={item.id} />
        </Combobox.Option>
    ))

    return (
        <div>
            <Combobox
                store={combobox}
                styles={{
                dropdown: {minWidth: 'max-content', width:'600px'}
                }}
                onOptionSubmit={(selected: string, options: ComboboxOptionProps) => {
                  //@ts-ignore
                    setSelectedName(options.children?.props.name);
                    dispatch(stravaActivitySet(options.value));
                    combobox.closeDropdown();
                }}
            >
            <Combobox.Target>
              <Button 
                variant="default"
                onClick={() => combobox.openDropdown()}
                rightSection={<Combobox.Chevron />}
                className={'glowing_input'}
              >             
              {selectedName ? selectedName : 'Select an activity'}
              </Button>
            </Combobox.Target>
                <Combobox.Dropdown className="dropdown">
                    <Combobox.Options mah={400} style={{ overflowY: 'auto' }}>
                        {options.length === 0 ? <Combobox.Empty>Nothing found</Combobox.Empty> : options}
                    </Combobox.Options>
                </Combobox.Dropdown>

            </Combobox>
        </div>
    )
}

export default StravaActivityIdInput;

// type StravaActivityIdProps = {
//     canAnalyze: boolean
//     strava_activity: string
//     stravaActivitySet: ActionCreatorWithPayload<string, "strava/stravaActivitySet">
// }
// type PropsFromRedux = ConnectedProps<typeof connector>
// const StravaActivityIdInput = ({ stravaActivitySet, strava_activity, canAnalyze } : StravaActivityIdProps) => {
//     return (
//         <Flex direction={"column"} justify={"center"}>
//             <label style={{fontSize:"90%"}} htmlFor={"stravaActivity"}>{<span><b>Strava Activity Id</b></span>}</label>
//             <Input style={{fontSize:"16px"}} autoFocus id='stravaActivity' tabIndex={0} type="text"
//                 onDrop={event => {
//                     let dt = event.dataTransfer;
//                     if (dt.items) {
//                         for (let i = 0;i < dt.items.length;i++) {
//                             if (dt.items[i].kind === 'string') {
//                                 event.preventDefault();
//                                 dt.items[i].getAsString(value => {
//                                     stravaActivitySet(value);
//                                     if (strava_activity !== '') {
//                                         //updateExpectedTimes(strava_activity);
//                                     }
//                                 });
//                             } else {
//                                 warn(`vetoing drop of ${i} of type ${dt.items[i].kind}`);
//                                 return false;
//                             }
//                         }
//                     }
//                 }}
//                 onDragEnd={event => {
//                     let dt = event.dataTransfer;
//                     if (dt.items) {
//                         // Use DataTransferItemList interface to remove the drag data
//                         for (let i = 0;i < dt.items.length;i++) {
//                             dt.items.remove(i);
//                         }
//                     }
//                 }}
//                 value={strava_activity}
//                 onChange={event => { stravaActivitySet(event.target.value) }}
//                 onFocus={() => {
//                     if (canAnalyze) {
//                         // TODO
//                         // i suspect this is here as a mechanism to automatially begin fetching if linked to with a premade url
//                         // but this feels not ideal to me, making that functionality rely on the focus details of a random text input deep in the component tree
//                         // should think about better ways of doing this
//                         //updateExpectedTimes(strava_activity)
//                     } else {
//                         warn('gained focus but not acting because there is no Strava activity or access token set')
//                     }
//                 }}
//                 onBlur={() => { if (strava_activity !== '') { /*updateExpectedTimes(strava_activity)*/ } }} />
//         </Flex>
//     );
// };

// const mapStateToProps = (state : RootState) =>
//     ({
//         strava_activity: state.strava.activity,
//         canAnalyze: state.strava.activity !== '' && state.strava.access_token != null
//     });

// const mapDispatchToProps = {
//     stravaActivitySet
// };

// const connector = connect(mapStateToProps,mapDispatchToProps)
// export default connector(StravaActivityIdInput);
