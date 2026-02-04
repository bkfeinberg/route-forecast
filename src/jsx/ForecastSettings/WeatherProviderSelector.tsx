import { connect, ConnectedProps } from 'react-redux';
import { setWeatherProvider } from "../../redux/actions";
import { providerValues, defaultProvider } from "../../redux/providerValues";
import { DesktopTooltip } from '../shared/DesktopTooltip';
import { useTranslation } from 'react-i18next'
import { useAppSelector } from "../../utils/hooks"
import { useForecastRequestData } from "../../utils/useForecastRequestData";
import type { RootState } from "../../redux/store";
import ReactGA from "react-ga4";
import { Combobox, useCombobox, Button, Flex } from '@mantine/core';
import Cookies from 'universal-cookie';

type PropsFromRedux = ConnectedProps<typeof connector>

const WeatherProviderSelector = ({ weatherProvider, setWeatherProvider }: PropsFromRedux) => {
    const combobox = useCombobox()
    const { t } = useTranslation()
    const forecastData = useForecastRequestData()
    const country = useAppSelector((state: RootState) => state.routeInfo.country);
    const cookies = new Cookies(null, { path: '/' });
    
  
    const items = Object.entries(providerValues).
        filter((entry) => entry[1].maxCallsPerHour === undefined ||
            entry[1].maxCallsPerHour > forecastData.length).
        filter((entry) => entry[1].max_days >= forecastData.daysInFuture).
        filter((entry) => !entry[1].usOnly || country === 'US').
        map((element) => (
            <Combobox.Option value={element[0]} key={element[0]} disabled={!element[1].enabled}>
                {element[1].name}
            </Combobox.Option>
        )
        )
    
    const filteredWeatherProvider = items.map(item => item.key).includes(weatherProvider) ? weatherProvider : items[0]?.key || defaultProvider;
    if (filteredWeatherProvider !== weatherProvider) {
        setWeatherProvider(filteredWeatherProvider);
    }   
    return (
        <Flex direction={'column'} justify={'center'}>
            <label htmlFor={'provider'}>{<span><b>{t('labels.source')}</b></span>} </label>
            <Combobox
                store={combobox}
                onOptionSubmit={(selected: string) => {
                    ReactGA.event('unlock_achievement', { achievement_id: selected });
                    setWeatherProvider(selected);
                    cookies.set('provider', selected, { path: '/' });
                    combobox.closeDropdown();
                }
                }
            >
                <DesktopTooltip label={t('tooltips.provider')} position="right">
                    <div>
                        <Combobox.Target>
                            <Button
                                component="button"
                                type="button"
                                onClick={() => combobox.toggleDropdown()}
                                rightSection={<Combobox.Chevron />}
                                id={'provider'}
                                variant="default"
                            >
                                {providerValues[filteredWeatherProvider].name}
                            </Button>
                        </Combobox.Target>
                    </div>
                </DesktopTooltip>
                <Combobox.Dropdown className="dropdown">
                    <Combobox.Options>
                        {items}
                    </Combobox.Options>
                </Combobox.Dropdown>
            </Combobox>
        </Flex>
    );
};

const mapStateToProps = (state: RootState) =>
({
    weatherProvider: state.forecast.weatherProvider
});

const mapDispatchToProps = {
    setWeatherProvider
};

const connector = connect(mapStateToProps, mapDispatchToProps)
export { WeatherProviderSelector };
export default connector(WeatherProviderSelector);