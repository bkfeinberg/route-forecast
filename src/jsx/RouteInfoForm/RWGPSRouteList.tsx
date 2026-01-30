import { IconMap } from "@tabler/icons-react";
import {useRef} from 'react';

import { loadFromRideWithGps } from "../../redux/loadRouteActions";
import { routeIsTripSet, rwgpsRouteSetAsNumber } from "../../redux/routeParamsSlice";
import { useAppSelector, useAppDispatch } from "../../utils/hooks";
import { Favorite } from "../../redux/rideWithGpsSlice";
import { Combobox, ComboboxOptionProps, useCombobox, InputBase, Group, Text, Button } from '@mantine/core'

function SelectOption({ name, id, associated_object_id, associated_object_type }: Favorite) {
  let idString = associated_object_id.toString()
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
        <Text fz="xs" opacity={0.6}>
          {associated_object_type}
        </Text>
      </div>
    </Group>
  );
}

const RWGPSRouteList = ({ }) => {
    const combobox = useCombobox()
    const routeName = useAppSelector(state => state.routeInfo.name)
    const selectedName = useRef(routeName)
    const pinnedRoutes = useAppSelector(state => state.rideWithGpsInfo.pinnedRoutes)
    const route_id = useAppSelector(state => state.uiInfo.routeParams.rwgpsRoute)
    const dispatch = useAppDispatch()

    const options = pinnedRoutes.map((item) => (
        <Combobox.Option value={item.associated_object_id.toString()} itemType={item.associated_object_type} key={item.id}>
            <SelectOption {...item} key={item.id}/>
        </Combobox.Option>
    ))

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={(selected: string, options: ComboboxOptionProps) => {
                dispatch(routeIsTripSet(options.itemType == "trip"))
                if (options.children && Array.isArray(options.children)) {
                    dispatch(rwgpsRouteSetAsNumber(options.children[0]))
                    selectedName.current = options.children[2]
                } else {
                  dispatch(rwgpsRouteSetAsNumber(Number(options.value)));
                }
                dispatch(loadFromRideWithGps(selected, options.itemType == "trip"))
                combobox.closeDropdown();
            }}
            styles={{
              dropdown: {minWidth: 'max-content', width:'600px'}
            }}
        >
            <Combobox.Target>
              <Button 
                variant="default"
                onClick={() => combobox.openDropdown()}
                rightSection={<Combobox.Chevron />}
                leftSection={<IconMap />}
                className={'glowing_input'}
              >             
              {selectedName.current === '' ? route_id : selectedName.current}     
              </Button>
            </Combobox.Target>

            <Combobox.Dropdown className="dropdown">
                <Combobox.Options mah={400} style={{ overflowY: 'auto' }}>
                    {options.length === 0 ? <Combobox.Empty>Nothing found</Combobox.Empty> : options}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    )
}

export default RWGPSRouteList
