/* globals importScripts, localforage */

importScripts('lib/localforage.js');

const version = process.env.SW_VERSION;
const cacheName = `RandoplanCache_${version}`;
const indexed_db_app_name = 'RandoplanPOST_DB';
const indexed_db_table_name = 'RandoplanPOST_Cache';

const sendLogMessage = (message, type) => {
  // Get all active windows/tabs controlled by this service worker
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clientList) => {
      for (const client of clientList) {
        // Send the message to the main application
        client.postMessage({
          type: type,
          data: message,
          version : version
        });
      }
    });
};

self.addEventListener('install', (event) => {
    // delete old IndexedDB instance to avoid conflicts
    self.localforage.dropInstance({
        name: indexed_db_app_name,
        storeName: indexed_db_table_name
    });
    self.localforage.clear().then(() => {
        // sendLogMessage('Cleared POST IndexedDB cache', 'trace');
    });
    const assetsToCache = self.__WB_MANIFEST;
    const urlsToCache = assetsToCache.map((entry) => {
        return '/static/' + entry.url;
    });

    event.waitUntil(Promise.all([localforage.ready().catch((err) => {
        sendLogMessage(`localforage failed to find a storage method: ${err}`, 'error');
    }),
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
    if (response) {
        // console.info(`inserting item into cache with key ${url}`, response);
        cache.put(url, response.clone());
        return response;
    } else {
        // If the network is unavailable, get
        sendLogMessage(`Searching GET cache for ${url}`, 'info');
        let cachedResponse = await cache.match(url);
        if (!cachedResponse) {
            // try while ignoring query parameters if /
            if (url.startsWith("/?")) {
                cachedResponse = await cache.match(url, {ignoreSearch:true});
            }
            if (!cachedResponse) {
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
        const response = await fetch(request.clone());
        if (response && response.ok) {
            // If it works, put the response into IndexedDB
            console.info(`inserting item into POST cache with key ${cacheKey}`, response);
            localforage.setItem(cacheKey, serializeResponse(response.clone()));
            return response;
        } else {
            // If it does not work, return the cached response. If no cached response, return 502
            let responseBody = response ? `${response?.status} ${response?.statusText} ${await response.clone().text()}` : 'no response';
            sendLogMessage(`Checking POST cache for ${request.url} after response of ${responseBody}`, 'info');
            let cachedResponse = await localforage.getItem(cacheKey);
            if (!cachedResponse) {
                sendLogMessage(`No cache entry, returning 503 for POST to ${request.url} with ${cacheKey}`, 'warning');
                if (response) {     // but presumably it's not ok
                    try {
                        const json = await response.json();
                        return Response.json(json, {status:503, statusText: 'Service Unavailable'});
                    } catch (e) {
                        sendLogMessage(`Failed to parse JSON response for POST to ${request.url}: ${e}`, 'error');
                        return Response.json({details: `${response.statusText} ${e}`}, {status:503, statusText: 'Service Unavailable'});
                    }
                } else {
                    return Response.json({details: 'No cached POST response available'}, {status:503, statusText: 'Service Unavailable'});
                }
            }
            sendLogMessage(`Returning cached copy for ${request.url}`, 'info');
            return deserializeResponse(cachedResponse);
        }
    } catch (err) {
        sendLogMessage(`Could not POST to ${request.url} (${err})`, 'error');
        return Response.json({details: `Failed to POST to server - ${err}`}, {status:503, statusText: 'Service Unavailable'});
    }
}

const getFromCacheAndRevalidate = async (request) => {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request.url);
    if (cachedResponse) {
        // Return the cached response immediately
        // Meanwhile, fetch from network and update cache
        fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
                const clonedResponse = networkResponse.clone();
                cache.put(request.url, clonedResponse);
            }
        }).catch((err) => {
            sendLogMessage(`Network fetch failed for ${request.url} during revalidation: ${err}`, 'warning');
        });
        return cachedResponse;
    } else {
        let response = await fetch(request).catch(() => sendLogMessage(`Could not GET ${url}`, 'error'));
        if (response) {
            // console.info(`inserting item into cache with key ${url}`, response);
            cache.put(request.url, response.clone());
            return response;
        } else {
            return new Response(`No cached GET response for ${request.url}`, {status: 503, statusText: 'Service Unavailable'})
        }
    } 
}

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    if (!url.startsWith(self.location.origin) &&
        !url.startsWith("https://maps.googleaapis.com") && !url.startsWith("https://maps.googleapis.com/maps/api/js") &&
        !url.startsWith("https://fonts.gstatic.com") &&
        !url.startsWith('https://www.weather.gov/images') &&
        !url.startsWith('/?') && !url.startsWith('/rwgpsAuth') && 
        !url.startsWith('https://www.randoplan.com/?')
    ) {
        // console.info(`returning and not handling url ${url}`);
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
    } else if (url.endsWith('.js') || url.endsWith('.css') || url.includes('.js?')) {
        event.respondWith(getFromCacheAndRevalidate(event.request));
    } else {
        event.respondWith(getAndCacheGET(event.request));
    }
}
);
