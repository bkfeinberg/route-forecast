export type ProviderValue = {
    min_interval : number
    max_days: number
    canForecastPast: boolean
    daysInPast: number
    name: string
    enabled: boolean,
    usOnly: boolean,
    maxCallsPerHour?: number,
    maxRequests: number
}
type ProviderValues = {
    [index:string]:ProviderValue
}
export const providerValues : ProviderValues = {
    nws:{min_interval:1, max_days:7, canForecastPast:false, daysInPast:0, name:"National Weather Service", enabled:true, usOnly: true, maxRequests:2},
    openMeteo:{min_interval:1, max_days:7, canForecastPast:true, daysInPast:7, name:"OpenMeteo", maxCallsPerHour:4000, enabled:true, usOnly: false, maxRequests:2},
    oneCall:{min_interval:0.25, max_days:5, canForecastPast:true, daysInPast:14, name:"OneCall", enabled:true, usOnly: false, maxRequests:20},
    weatherKit:{min_interval:0.25, max_days:8, canForecastPast:true, daysInPast:12, name:"Apple WeatherKit", enabled:true, usOnly: false, maxRequests:20},
    visualcrossing:{min_interval:1, max_days:14, canForecastPast:true, daysInPast:4, name:"Visual Crossing", enabled:true, usOnly: false, maxRequests:20},
    weatherapi:{min_interval:1, max_days:10, canForecastPast:false, daysInPast:4, name:"WeatherAPI", enabled:true, usOnly: false, maxRequests:20},
    climacell:{min_interval:0.25, max_days:4, canForecastPast:false, daysInPast:1, name:"Tomorrow.io", maxCallsPerHour:25, enabled:true, usOnly: false, maxRequests:10},
    // meteomatics:{min_interval:1, max_days:10,canForecastPast:true, daysInPast:1, name:"Meteomatics"}
    }
export const defaultProvider = 'weatherKit'
export const alternateProvider = "oneCall"
