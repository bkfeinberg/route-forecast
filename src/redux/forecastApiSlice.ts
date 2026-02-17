import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const forecastApiSlice = createApi({
    reducerPath:'forecastFetch',
    baseQuery: fetchBaseQuery({
        // Fill in your own server starting URL here
        baseUrl: window.location.origin,
    }),
    endpoints: build => ({
        forecast: build.mutation({
            query: request => ({
                url: `/forecast_one`,
                method: 'POST',
                body: request
            })
        }),
        getAqi: build.mutation({
            query: request => ({
                url: '/aqi_one',
                method: 'POST',
                body: request
            })
        })
    })
})

export const {useForecastMutation, useGetAqiMutation} = forecastApiSlice