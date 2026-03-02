import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid } from 'recharts';
import ReactGA from "react-ga4";
import { ReactNode } from 'react';
import { Forecast } from '../../redux/forecastSlice';

export const TemperaturesChart = ({chartData, metric, popoverIsOpen} : {chartData: Forecast[], metric: boolean, popoverIsOpen: boolean}) => {
    if (!popoverIsOpen || !chartData || chartData.length === 0) {
        return <div></div>
    }
    const kmToMiles = 0.62137;
    const milesToKm = 1.60934;

    const formatDistance = (value: number, isMetric: boolean) => isMetric ? (value * milesToKm).toFixed(0) : value.toFixed(0);
    const formatTipDistance = (value: number, isMetric: boolean) => isMetric ? (value * kmToMiles).toFixed(0) + " km" : value.toFixed(0) + " miles";
    const formatTooltipValue = (value: number|undefined, name: string|undefined, isMetric: boolean) => 
        (name === 'Cloud cover') ? value : isMetric ? [(value! / kmToMiles)?.toFixed(0), "feels like (C)"] : [value?.toFixed(0), "feels like (F)"]
    const formatTemp = (value: number|undefined, isMetric: boolean) => 
        isMetric ? (value! / kmToMiles).toFixed(0) : value!.toFixed(0)

    const getCloudCover = (dataObj : Forecast) => parseFloat(dataObj.cloudCover).toFixed(0)
    
    ReactGA.event('temperature_chart')
    return <ResponsiveContainer width="100%" height={"100%"} minWidth={550} minHeight={250} aspect={2.2}/* maxHeight={400} */>
        <LineChart
            width={550} height={250} data={chartData}
            margin={{
                top: 30,
                right: 35,
                left: 30,
                bottom: 30,
            }}
        >
            <XAxis dataKey="distance" type={'number'} unit={metric ? " km" : " miles"} tickFormatter={(value: number) => formatDistance(value, metric)} domain={[0, 'dataMax']} />
            <YAxis dataKey={getCloudCover} type={"number"} unit=" %" domain={[0,100]} tickFormatter={(value:number) => {console.log('Cloud cover values',value); return value.toString()}} orientation="right" yAxisId="right" />
            <YAxis dataKey="feel" type="number" unit={metric?" C":" F"}
                domain={['dataMin', 'dataMax']} tickFormatter={(value:number) => `${ formatTemp(value, metric)}`}/>
            <Tooltip labelFormatter={(value: ReactNode) => formatTipDistance(value as number, metric)} 
                formatter={(value: number|undefined, name: string|undefined) => formatTooltipValue(value, name, metric)} />
            <Legend />
            <Line type="monotone" dataKey="feel" dot={false} />
            <Line type="monotone" yAxisId={'right'} dataKey={getCloudCover} stroke={"#32a852"} dot={false} name={"Cloud cover"}/>
            <CartesianGrid strokeDasharray="2 2" />
        </LineChart>
    </ResponsiveContainer>
}
