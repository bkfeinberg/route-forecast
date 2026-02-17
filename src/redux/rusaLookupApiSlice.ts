import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const rusaIdLookupApiSlice = createApi({
    reducerPath:'rusaLookup',
    baseQuery: fetchBaseQuery({
        baseUrl: window.location.origin,
    }),
    endpoints: build => ({
        lookupRusaPermId: build.query({
            query: (permId) => ({
                url: `rusa_perm_id?permId=${permId}`
            }
            )
        })
    })
})

export const {useLookupRusaPermIdQuery} = rusaIdLookupApiSlice