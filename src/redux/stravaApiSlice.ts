import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface StravaActivity {
    id: number,
    name: string
}
export interface StravaTokens {
    access_token: string,
    expires_at: number
}
export const stravaApiSlice = createApi({
    reducerPath:'stravaApi',
    baseQuery: fetchBaseQuery({
        baseUrl: window.location.origin,
    }),
    endpoints: build => ({
        stravaAuth: build.query<StravaTokens,string>({
            query: (state) => ({
                url: `stravaAuthReq?state=${state}`
            }
            )
        }),
        refreshStravaToken: build.query({
            query: (refreshToken) => ({
                url: `refreshStravaToken?refreshToken=${refreshToken}`
            }
            )
        }),
        loadActivities: build.query<{activities:StravaActivity[]},{access: string}>({
            query: ({access}) => ({
                url: `stravaActivities?token=${access}`
            })
        })
    })
})

export const {useStravaAuthQuery, useRefreshStravaTokenQuery, useLoadActivitiesQuery} = stravaApiSlice