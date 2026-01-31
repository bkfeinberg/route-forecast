/* globals importScripts, localforage */

const sendLogMessage = (message, type) => {
  // Get all active windows/tabs controlled by this service worker
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clientList) => {
      for (const client of clientList) {
        // Send the message to the main application
        client.postMessage({
          type: type,
          data: message
        });
      }
    });
};

importScripts('lib/localforage.js');

const version = process.env.SW_VERSION;
const cacheName = `RandoplanCache_${version}`;
const indexed_db_app_name = 'RandoplanPOST_DB';
const indexed_db_table_name = 'RandoplanPOST_Cache';

self.addEventListener('install', (event) => {
    self.postCache = self.localforage.createInstance({
        name: indexed_db_app_name,
        storeName: indexed_db_table_name
    });
    self.postCache.clear().then(() => {
        // sendLogMessage('Cleared POST IndexedDB cache', 'trace');
    });
    const assetsToCache = self.__WB_MANIFEST;
    const urlsToCache = assetsToCache.map((entry) => {
        return '/static/' + entry.url;
    });

    event.waitUntil(Promise.all([self.postCache.ready(),
        caches.open(cacheName).then(async (cache) => {
            return cache.addAll(urlsToCache);
        }
        )
    ]))
    self.skipWaiting().then(() => {
        // sendLogMessage('Service Worker skipWaiting complete', 'trace');
    }).catch((err) => {
        sendLogMessage(`Service Worker skipWaiting error: ${err}`, 'error');
    });
});

self.addEventListener('activate', (e) => {
    try {
        e.waitUntil(caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key === cacheName) { /*sendLogMessage(`Skipping cache ${key}`, 'trace'); */ return null; }
                sendLogMessage(`Deleting cache ${key}`, 'trace');
                return caches.delete(key).then(sendLogMessage(`Deleted cache ${key}`, 'trace')).catch((err) => {
                    sendLogMessage(`Error deleting cache ${key}: ${err}`, 'error');
                });
            }
            )
            ).catch((err) => sendLogMessage(`Error during cache deletion: ${err}`, 'error'));
        }
        ).catch((err) => sendLogMessage(`Error during cache keys retrieval: ${err}`, 'error'))
        )
    } catch (err) {
        sendLogMessage(`Error deleting old caches: ${err}`, 'error');
    }
}
);

const serializeHeaders = (headers) => {
    var serialized = {};
    // `for(... of ...)` is ES6 notation but current browsers supporting SW, support this
    // notation as well and this is the only way of retrieving all the headers.
    for (var entry of headers.entries()) {
        serialized[entry[0]] = entry[1];
    }
    return serialized;
}

// Serialize is a little bit convolved due to headers is not a simple object.
const serialize = (request) => {
    // var headers = {};
    // `for(... of ...)` is ES6 notation but current browsers supporting SW, support this
    // notation as well and this is the only way of retrieving all the headers.
    // for (var entry of request.headers.entries()) {
    //     headers[entry[0]] = entry[1];
    // }
    var serialized = {
        url: request.url,
        // headers: headers,
        method: request.method,
        // mode: request.mode,
        credentials: request.credentials,
        // cache: request.cache,
        // redirect: request.redirect,
        referrer: request.referrer
    };

    // Only if method is not `GET` or `HEAD` is the request allowed to have body.
/*     if (request.method !== 'GET' && request.method !== 'HEAD') {
        return request.clone().text().then(function (body) {
            serialized.body = body;
            return Promise.resolve(serialized);
        });
    }
 */    return Promise.resolve(serialized);
}

/**
 * Serializes a Response into a plain JS object
 *
 * @param {Response} response object
 * @returns {Promise} Promise yielding a Response
 */
 const serializeResponse = (response) => {
    var serialized = {
      headers: serializeHeaders(response.headers),
      status: response.status,
      statusText: response.statusText
    };

    return response.clone().text().then(function(body) {
        serialized.body = body;
        return Promise.resolve(serialized);
    });
}

/**
 * Creates a Response from it's serialized version
 *
 * @param {data} data is serialized Response
 * @returns {Promise} Promise resolving to a Response
 */
 const deserializeResponse = (data) => {
    return Promise.resolve(new Response(data.body, data));
}

const getAndCacheGET = async (request) => {
    const cache = await caches.open(cacheName);
    const url = request.url;
    let response = await fetch(request).catch(() => sendLogMessage(`Could not GET, will try cache for ${url}`, 'warning'));
    if (response !== undefined) {
        console.info(`inserting item into cache with key ${url}`, response);
        cache.put(url, response.clone());
        return response;
    } else {
        // If the network is unavailable, get
        sendLogMessage(`Searching GET cache for ${url}`, 'info');
        let cachedResponse = await cache.match(url);
        if (cachedResponse === undefined) {
            // try while ignoring query parameters if /
            if (url.startsWith("/?")) {
                cachedResponse = await cache.match(url, {ignoreSearch:true});
            }
            if (cachedResponse == undefined) {
                sendLogMessage(`No matching cache entry for GET for ${url}`, 'warning');
                return new Response('No cached GET response', {status: 503, statusText: 'Service Unavailable'})
            }
        }
        return cachedResponse;
    }
}

const getAndCachePOST = async (request) => {
    // First try to fetch the request from the server
    const requestClone = request.clone()
    try {
        const formData = await requestClone.json();
        const cacheKey = formData.locations ? 
            `${formData.locations.lat}:${formData.locations.lon}_${formData.locations.time}_${formData.service}` : 'unknown';
        if (cacheKey === 'unknown') {
            sendLogMessage(`Contents of unknown POST request to ${request.url}: ${JSON.stringify(formData)}`, 'warning');
        }
        const response = await fetch(request.clone()).catch((err) => sendLogMessage(`Could not POST to ${request.url} ${cacheKey} (${err}), will try cache`, 'warning'));
        if (response !== undefined && response.ok) {
            // If it works, put the response into IndexedDB
            console.info(`inserting item into POST cache with key ${cacheKey}`, response);
            if (!self.postCache) {
                sendLogMessage(`POST cache is undefined, creating instance for ${request.url} ${cacheKey}`, 'info');
                self.postCache = localforage.createInstance({
                    name: indexed_db_app_name,
                    storeName: indexed_db_table_name
                });
            }
            self.postCache.setItem(cacheKey, serializeResponse(response.clone()));
            return response;
        } else {
            // If it does not work, return the cached response. If the cache does not
            // contain a response for our request, it will give us a 503-response
            // don't know how this could happen, but evidently it can
            if (self.postCache === undefined) {
                sendLogMessage(`POST cache is undefined, cannot retrieve response for ${request.url} ${cacheKey}`, 'error');
/*                 postCache = localforage.createInstance({
                    name: indexed_db_app_name,
                    storeName: indexed_db_table_name
                });
 */            }
            let cachedResponse = self.postCache && await self.postCache.getItem(cacheKey);
            if (!cachedResponse) {
                sendLogMessage(`No cache entry, returning 502 for POST to ${request.url} with ${cacheKey}`, 'warning');
                if (response) {     // but presumably it's not ok
                    try {
                        const json = await response.json();
                        return Response.json(json, {status:502, statusText: 'Service Unavailable'});
                    } catch (e) {
                        return Response.json({details: response.statusText}, {status:502, statusText: 'Service Unavailable'});
                    }
                } else {
                    return Response.json({details: 'No cached POST response available'}, {status:502, statusText: 'Service Unavailable'});
                }
            }
            sendLogMessage(`Returning cached copy for ${request.url}`, 'info');
            return deserializeResponse(cachedResponse);
        }
    } catch (err) {
        // don't even try to cache when we don't know what format of data we're getting
        sendLogMessage('Could not parse JSON from POST request to ${request.url}', 'error');
        try {
            const rawText = await request.clone().text();
            console.info('Raw request body:', rawText)
        } catch (e) {
            sendLogMessage(`Failed to read raw body for POST to ${request.url}: ${e}`, 'error');
        }        
        return fetch(request.clone());
    }
}

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    if (!url.startsWith(self.location.origin) &&
        !url.startsWith("https://maps.googleaapis.com") && !url.startsWith("https://maps.googleapis.com/maps/api/js") &&
        !url.startsWith("https://fonts.gstatic.com") &&
        !url.startsWith('https://www.weather.gov/images') &&
        !url.startsWith('/?') && !url.startsWith('/rwgpsAuth')
    ) {
        console.info(`returning and not handling url ${url}`);
        return;
    }
    // we don't need to cache the pinned routes, the intent of caching is to preserve completed forecasts
    if (url.includes('/pinned_routes') || url.includes('/bitly') || url.includes('/short_io')) {
        // console.info('Not handling pinned routes or shortened urls');
        return;
    }
    // console.log(`responding to event for ${url} with method ${event.request.method}`);

    // Open the cache
    if (event.request.method === "POST") {
        event.respondWith(getAndCachePOST(event.request));
    } else {
        event.respondWith(getAndCacheGET(event.request));
    }
}
);
