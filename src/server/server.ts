/* eslint-disable max-lines */
require('./instrument');
import express, { Request, Response } from 'express'
const app = express();
app.set('trust proxy', 1 /* number of proxies between user and server */)

const apicache = require('node-cache-32')
require('source-map-support').install();
const expressStaticGzip = require("express-static-gzip");

const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer'); // v1.0.5
const upload = multer({
    limits: { fieldSize: 2 * 1024 * 1024 }
}); // for parsing multipart/form-data
import callWeatherService from './weatherForecastDispatcher'
import url from 'url'
import getPurpleAirAQI from'./purpleAirAQI'
import getAirNowAQI from './airNowAQI'
import querystring from 'querystring';
import * as Sentry from "@sentry/node"
import type { NextFunction, RequestHandler } from 'express';
const { trace, debug, info, warn, error, fatal, fmt } = Sentry.logger;
import axios, { AxiosError, isAxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
const axiosRetry = require('axios-retry').default
const axiosInstance = axios.create()
const timeout = require('connect-timeout');

// import {std} from "mathjs";
const {std} = require('mathjs');
import {Client} from "pg";

import RateLimit from 'express-rate-limit'
import { DateTime } from 'luxon';
var limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

let logger = console;
var compression = require('compression');

app.use(compression());

const bitly_token = process.env.BITLY_TOKEN
if (!bitly_token) {
    console.error('No Bitly token')
    process.exit(1)
}

const short_io_key = process.env.SHORT_IO_KEY
if (!short_io_key) {
    console.error('No Short.io access key')
    process.exit(1)
}

const publicPath = express.static(path.resolve(__dirname, '../static'), {
    setHeaders: (res, path) => {
        // Long-term caching for hashed static assets (js, css, images, etc.)
        if (path.match(/\.(js|br|css|png|jpg|jpeg|gif|ico|json|svg)$/)) {
            // Cache for one year, marked as public and immutable
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
            // No caching for index.html (ensures the latest version is always fetched)
            res.setHeader('Cache-Control', 'public, no-cache, must-revalidate');
        }
    }
});

app.use('/static', expressStaticGzip(path.resolve(__dirname, '../'), {
    enableBrotli: true,
    orderPreference: [
        'br',
        'gz'
    ]
}));

app.use('/static', publicPath);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/worker.js', limiter)
app.get('/worker.js', (req: Request, res : Response) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(path.resolve(__dirname,'../static/worker.js'));
})

app.use('/lib/localforage.js', limiter)
app.get('/lib/localforage.js', (req : Request, res : Response) => {
    res.set('Content-Type', 'application/javascript');
    res.sendFile(path.resolve(__dirname,'../static/lib/localforage.js'));
})
app.get('/robots.txt', (req : Request, res : Response) => {
    res.sendFile(path.resolve(__dirname,'../static/robots.txt'));
})

// ejs
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/favicon.ico', (req : Request, res : Response) => { 
    res.sendFile(path.resolve(__dirname, '../static/favicon.ico'))
})

app.get('/apple-touch-icon.png', (req : Request, res : Response) => { 
    res.sendFile(path.resolve(__dirname, '../static/apple-touch-icon.png'))
})

app.get('/apple-touch-icon-precomposed.png', (req : Request, res : Response) => { 
    res.sendFile(path.resolve(__dirname, '../static/apple-touch-icon-precomposed.png'))
})

const setupPostgres = async () => {

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    try {
        await client.connect((err:any) => {if (err) {warn(err)}});
        return client;
    } catch (excpt) {
        warn(`Postgres connection error: ${excpt}`);
    }

}

const isValidRouteResult = (body: string | undefined, type : string) => {
    if (body !== undefined) {
        let obj = JSON.parse(body);
        if (type === 'routes' && obj.type === 'route') {
            return true;
        }
        if (type === 'trips' && obj.type === 'trip') {
            return true;
        }
    }
    Sentry.captureMessage(`isValidRouteResult failed with check for ${type}`)
    return false;
};

let postgresClient: Client | undefined;

const getVisits = async () => {
    return await postgresClient?.query("SELECT * from randoplan ORDER BY timestamp DESC")
};

app.get('/dbquery', async (req : Request, res : Response) => {
    if (!postgresClient) {
        postgresClient = await setupPostgres();
    }
    const results = await getVisits();
    if (results && results.rows) {
        const visits = results.rows.map(
            (        entity: { timestamp: any; routename: string; routenumber: string; location: {x:number, y:number}; }) => JSON.stringify({
                "Time": entity.timestamp, "RouteName": entity.routename, "RouteNumber": entity.routenumber,
                "Latitude": entity.location.x, "Longitude": entity.location.y
            })
        );    
        res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send(`[\n${visits.join(',\n')}]`)
        .end(); 
    }
});

app.use((req : Request, res : Response, next) => {
    // Switch to randoplan.com
    var host = req.hostname;
    // const originalHost = req.header('host');
    // console.info(`Forwarded host is ${originalHost} request host is ${host}`);
    if (host === 'randoplan.herokuapp.com' || host === 'randoplan.com') {
        logger.info(`Redirected ${host} to www.randoplan.com`);
        return res.redirect(301, 'https://www.randoplan.com' + req.originalUrl);
    }
    return next();
});

const buildRouteUrl = (routeNumber : string, apiKey : string) => {
    const privacyCodeLoc = routeNumber.indexOf('?privacy_code')
    if (privacyCodeLoc === -1) {
        return `${routeNumber}.json?apikey=${apiKey}&version=2`
    }
    return `${routeNumber.substring(0,privacyCodeLoc)}.json${routeNumber.substring(privacyCodeLoc)}&apikey=${apiKey}&version=2`
}

app.get('/rwgps_route', (req : Request, res : Response) => {
    res.set('Content-Type', 'application/json');
    const routeNumber = req.query.route;
    if (!routeNumber || typeof routeNumber !== 'string' || !/^[?=a-zA-Z0-9_-]+$/.test(routeNumber)) {
        res.status(400).json({'status': 'Invalid route number'})
        return;
    }
    console.log(`request for route ${routeNumber}`);
    const isTrip = req.query.trip === "true";
    const routeType = isTrip === true ? 'trips' : 'routes';
    const rwgpsApiKey = process.env.RWGPS_API_KEY;
    if (rwgpsApiKey === undefined) {
        res.status(500).json({ 'details': 'Missing rwgps API key' });
        return;
    }
    const token = req.query.token;
    interface Headers {
        Authorization? : string 
    }
    const headers = {} as Headers;
    if (token !== undefined) {
        headers.Authorization = `Bearer ${token}`;
    }

    const rwgpsUrl = `https://ridewithgps.com/${routeType}/${buildRouteUrl(routeNumber,rwgpsApiKey)}`;
    fetch(rwgpsUrl,{headers:headers}).then(fetchResult => {if (!fetchResult.ok) {throw Error(fetchResult.statusText)} return fetchResult.text()})
        .then(body => {if (!isValidRouteResult(body, routeType)) {res.status(401).send(body)} else {res.status(200).send(body)}})
        .catch(err => {const status = isNaN(Number.parseInt(err.message,10))?500:Number.parseInt(err.message,10);
            res.status(status).json({ 'status': JSON.stringify(err) })});
});

app.get('/rusa_perm_id', (req : Request, res : Response) => {
    const permId = req.query.permId
    if (!permId) {
        res.status(400).json({details:"Missing RUSA perm ID"})
    }
    const rusaPermLookupApiKey = process.env.RUSA_PERM_ID_KEY
    if (!rusaPermLookupApiKey) {
        res.status(500).json({ 'details': 'Missing RUSA perm lookup API key' });
        return;
    }
    const rusaLookupUrl = `https://rusa.org/cgi-bin/permsearch_PF.pl?permid=${permId}&output_format=json&apikey=${rusaPermLookupApiKey}`
    fetch(rusaLookupUrl).then(fetchResult =>
        {if (!fetchResult.ok) {throw Error(fetchResult.statusText)} return fetchResult.json()})
        .then(body => {res.status(200).send(body)})
        .catch(err => {res.status(500).json({'status':JSON.stringify(err)})})
})

const getAQI = (result: { aqi?: number; }, point: { lat: number; lon: number; }) => {
    return Sentry.startSpan({name: "aqi"}, async () => {
        // eslint-disable-next-line no-await-in-loop
        // result.aqi = await getPurpleAirAQI(point.lat, point.lon);
        let results = await Promise.all([
            getAirNowAQI(point.lat, point.lon),
            getPurpleAirAQI(point.lat, point.lon)
        ])
        result.aqi = results[0] ? results[0] : results[1];
        return result
    })
}
    // add route to display cache performance (courtesy of @killdash9)
app.get('/cache/performance', (req : Request, res : Response) => {
    res.json(apicache.getPerformance())
})
  
  // add route to display cache index
app.get('/cache/index', (req : Request, res : Response) => {
    res.json(apicache.getIndex())
})

let cache = apicache.options(
    {
        trackPerformance: true,
        appendKey: (req: Request, res: Response) => req.body.locations.lat.toString() + req.body.locations.lon.toString() + req.body.locations.time + req.body.service
    })


const stdDevPrecip = (forecastPoint: { lat: number; lon: number; time: string; distance: number; bearing: number; isControl: boolean; }, 
    zone: string, services: string, req: RequestWithTimeout, res: Response, ip? : string) => {
    const serviceList = services.split(",").filter(service => service != "climacell")
    try {
        const multipleResults = serviceList.map((service: string) => {
            const result = callWeatherService(service, forecastPoint.lat,
                 forecastPoint.lon, forecastPoint.time, forecastPoint.distance, 
                 zone, forecastPoint.bearing, forecastPoint.isControl, 'en').catch((error: Error) => {
                throw error;
            })
            if (!process.env.NO_LOGGING) {
                logger.info(`Done with request to ${service} from ${ip}`);
            }
            return result
        })
        Promise.all(multipleResults).then(awaitedResults => {
            const tempArray = awaitedResults.map(result => parseInt(result.temp)).sort((a, b) => a - b)
            // total the results
            const stdDev = std(tempArray)
            const resultsWithStdDev = {
                ...awaitedResults[0], 
                stdDev: stdDev
            }
            if (req.timedout) {
                warn(`Standard deviation processing finished, but request already timed out. Not sending response.`);
                return;
            }        
            res.status(200).json({ 'forecast': resultsWithStdDev });
        })
    } catch (error) {
        if (!process.env.NO_LOGGING) {
            logger.info(`Error with request from ${ip}`);
        }
        res.status(500).json({ 'details': `Error calling weather service @ ${forecastPoint.lat},${forecastPoint.lon}: ${error}` });
        return
    }
}
    
/* const calculateMedian = (arr: Array<number>) => {
    const len = arr.length;

    if (len % 2 === 0) {
        const mid1 = arr[len / 2 - 1];
        const mid2 = arr[len / 2];
        return (mid1 + mid2) / 2;
    } else {
        return arr[Math.floor(len / 2)];
    }
}
 */

interface RequestWithTimeout extends Request {
    timedout?: boolean
}

const haltOnTimedout = (req: RequestWithTimeout, res: any, next: () => void) => {
  if (!req.timedout) {
    next()
  } else {
    res.status(503).json({ 'details': 'Request timed out' });
  }
}

app.post('/forecast_one', cache.middleware(), upload.none(), timeout('27s'), haltOnTimedout, async (req : RequestWithTimeout, res : Response) => {
    if (req.body.locations === undefined) {
        res.status(400).json({ 'status': 'Missing location key' });
        return;
    }
    if (req.body.timezone === undefined || req.body.timezone === 'undefined') {
        res.status(400).json({ 'status': 'Missing timezone key' });
        return;
    }
    const forecastPoints = req.body.locations;
    let service = process.env.WEATHER_SERVICE;
    if (req.body.service !== undefined) {
        service = req.body.service;
    }
    if (!service) {
        res.status(400).json({'status':'Missing weather service'})
        return
    }
    if (!process.env.NO_LOGGING) {
        logger.info(`Request from ${req.ip} for ${forecastPoints.lat},${forecastPoints.lon} from ${service} at ${forecastPoints.time}`);
    }
    if (req.body.routeName !== undefined && req.body.routeName !== '' && req.body.which===0) {
        try {
            if (!postgresClient) {
                postgresClient = await setupPostgres();
            }
        } catch (err) {
            warn(`Postgres setup failed: ${err}`);
        }
        if (postgresClient && req.body.routeNumber && req.body.routeName) {
            // tear off the privacy code if any
            const queryPos = req.body.routeNumber.indexOf('?')
            const routeNumber = (queryPos === -1) ? req.body.routeNumber : req.body.routeNumber.slice(0,queryPos);
            // limit route name to 90 characters to match DB schema
            const routeName = req.body.routeName.length > 90 ? req.body.routeName.slice(0,90) : req.body.routeName;
            try {
                const insertResult = await
                    postgresClient.query(
                        "INSERT into randoplan VALUES($1,$2,$3,$4) ON CONFLICT (routeName) DO UPDATE SET timestamp=EXCLUDED.timestamp, location=EXCLUDED.location, routeNumber=EXCLUDED.routeNumber",
                        [routeName, routeNumber,
                        new Date(), `(${forecastPoints.lat},${forecastPoints.lon})`]);
                // console.info(insertResult);
            } catch (err) {
                warn(`DB call from /forecast_one failed for route ${req.body.routeName} with ${err}`)
            }
        }
    }
    const zone = req.body.timezone;
    let lang = req.body.lang
    if (!lang) {
        lang = 'en'
    }
    
    if (service.indexOf(',') >= 0) {
        stdDevPrecip(forecastPoints, zone, service, req, res, req.ip)
        return
    }
    try {
        const point = forecastPoints
        const result = await callWeatherService(service, point.lat, point.lon, point.time, point.distance, zone, point.bearing, point.isControl, lang);
        if (!process.env.NO_LOGGING) {
            logger.info(`Done with request from ${req.ip}`);
        }
        if (req.timedout) {
            warn(`Forecast processing finished, but request already timed out. Not sending response.`);
            return;
        }        
        res.status(200).json({ 'forecast': result });
    } catch (err) {
        if (!process.env.NO_LOGGING) {
            logger.info(`Error with request @ ${forecastPoints.lat},${forecastPoints.lon} at ${forecastPoints.time} from ${req.ip} ${err}`);
        }
        error(`callWeatherService @ ${forecastPoints.lat},${forecastPoints.lon} ${forecastPoints.time} using ${service} failed with ${err}`);
        res.status(502).json(
            { 'details': `Error calling weather service @ ${forecastPoints.lat},${forecastPoints.lon} ${forecastPoints.time}: ${err}` });
    }
});

app.post('/aqi_one', upload.none(), timeout('27s'), haltOnTimedout, async (req : RequestWithTimeout, res: Response) => {
    if (req.body.locations === undefined) {
        res.status(400).json({ 'status': 'Missing location key' });
        return;
    }
    const forecastPoint = req.body.locations
    if (!process.env.NO_LOGGING) {
        logger.info(`AQI request from ${req.ip} for AQI at ${forecastPoint.lat},${forecastPoint.lon}`)
    }
    try {
        let result = {};
        await getAQI(result, forecastPoint);
        if (req.timedout) {
            warn(`AQI processing finished, but request already timed out. Not sending response of ${JSON.stringify(result)} for ${forecastPoint.lat},${forecastPoint.lon}`);
            return;
        }
        res.status(200).json({ 'aqi': result });
    } catch (err) {
        error(`Error retrieving AQI : ${JSON.stringify(err)}`);
        res.status(500).json({ 'details': `Error retrieving AQI : ${JSON.stringify(err)}`});
    }
});

// A general error handler to catch timeout errors
app.use((err : Error, req : RequestWithTimeout, res : Response, next : NextFunction) => {
    if (req.timedout) {
        // Send a specific response for timeout errors
        console.log('Request timed out!');
        if (req.body.locations) {
            error(`Request to ${req.body.service} timed out for location ${req.body.locations.lat},${req.body.locations.lon}`);
        } else {
            error(`Request timed out for unknown location`);
        }
        return res.status(503).send({ details: `Service unavailable: Request to ${req.body.service} exceeded timeout` });
    }
    // Handle other types of errors
    next(err);
});

interface BitlyResponse {
    message : string
    groups: Array<{
        guid: number
    }>
}
interface BitlyLinkResponse {
    message: string
    link? : string
}
const getBitlyShortenedUrl = (accessToken : string, longUrl : string) => {
    return fetch(`https://api-ssl.bitly.com/v4/groups`, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        }
    }).then(response => {
        if (response.ok) {
            return response.json() as Promise<BitlyResponse>;
        }
        throw Error(`Bitly groupid fetch failed with ${response.status} ${response.statusText}`);
    }
    ).
        then((responseJson : BitlyResponse) => {
            if (!responseJson.groups) {
                throw Error(`Bitly is probably mad at authentication for some reason; failed with message ${responseJson.message}`);
            }
            const groupID = responseJson.groups[0].guid;

            return fetch('https://api-ssl.bitly.com/v4/shorten', {
                method: "POST",
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    "long_url": longUrl,
                    "group_guid": groupID
                })
            }).then(response => {
                return response.json() as Promise<BitlyLinkResponse>
            }).
                then((responseJson : BitlyLinkResponse) => {
                    if (responseJson.link) {
                        return { error: null, url: responseJson.link };
                    }
                    throw Error(`Bitly link creation failed with: ${responseJson.message} ${JSON.stringify(responseJson)}`);
                })
        }).
        catch(error => ({ error: error.toString(), url: null }));
};

app.post('/bitly', async (req : Request, res: Response) => {
    const longUrl = req.body.longUrl;
    const { error, url } = await getBitlyShortenedUrl(bitly_token, longUrl);
    res.json({ error, url })
});

interface Short_IO_Response {
    originalURL: string
    path: string
    shortURL: string
}

const getShortIoUrl = async (accessToken: string, longUrl: string, title?: string) => {
    // TODO: temporary for troubleshooting
    // info(`Short.io shortening ${longUrl}`);
    const short_io_domain = 'go.randoplan.com';
    const options = {
        method: 'POST',
        url: 'https://api.short.io/links',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            Authorization: accessToken
        },
        data: {
            skipQS: false,
            archived: false,
            allowDuplicates: false,
            originalURL: longUrl,
            cloaking: false,
            domain: short_io_domain,
            ttl: DateTime.now().plus({days: 10}).toISO(),
            title: title
        }
    };
    try {
        const short_io_reply : AxiosResponse<Short_IO_Response> = await axios.request(options).
        catch((err : any) => {
            console.log(`Short.io returned error ${err}`)
            error(`Short.io for ${longUrl} returned error ${err}`);
            throw err
        })
        // TODO: temporary for troubleshooting
        // info(`Short.io returned ${short_io_reply.data.shortURL} for ${longUrl}`);
        return {error: null, url: short_io_reply.data.shortURL}
    } catch (err : any) {
        error(`Short.io returned error ${err}`);
        return {error: err.message, url: null}
    }
}

app.post('/short_io', async (req : Request, res: Response) => {
    const longUrl = req.body.longUrl;
    const title = req.body.title;
    const { error, url } = await getShortIoUrl(short_io_key, longUrl, title);
    res.json({ error, url })
});

const getStravaAuthUrl = (baseUrl : string, state: string) => {
    if (baseUrl === 'http://localhost:8080') {
        process.env.STRAVA_REDIRECT_URI = baseUrl + '/stravaAuthReply';
    }
    else {
        process.env.STRAVA_REDIRECT_URI = 'https://www.randoplan.com/stravaAuthReply';
    }
    const authorizationUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=auto&scope=${'activity:read_all,read_all'}&state=${encodeURIComponent(state)}`;
    return authorizationUrl;
};

interface StravaToken {
    body: {
        access_token: string
        refresh_token: string
        expires_at: string
        message: string
        errors: Array<{resource:string, field:string, code:string}>
    }
    statusCode: number
    statusMessage: string
}

const getStravaToken = async (code : string) => {
    // process.env.STRAVA_ACCESS_TOKEN = 'fake';
    logger.info(`Getting Strava OAuth token from code ${code}`);
    try {
        const tokenResponse = await axios.post('https://www.strava.com/api/v3/oauth/token', null, {
                params: {
                    client_id: process.env.STRAVA_CLIENT_ID,
                    client_secret: process.env.STRAVA_API_KEY,
                    code: code,
                    grant_type: 'authorization_code'
                }
        });
        console.log(`token was ${JSON.stringify(tokenResponse.data)}`)
        return tokenResponse.data;
    } catch (error : any) {
        warn('Error exchanging authorization code:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/* const insertFeatureRecord = (record, featureName, user : string) => {
    return datastore.save({
        key: datastore.key([
            featureName,
            user
        ]),
        data: record
    });
};
 */
const remote_randoplan_uri='https://www.randoplan.com/rwgpsAuthReply';
const local_randoplan_uri='http://localhost:8080/rwgpsAuthReply';

app.get('/rwgpsAuthReq', (req: Request, res : Response) => {
    const isLocal = req.socket.localAddress === req.socket.remoteAddress;
    console.log(`Auth request is ${isLocal ? 'local' : 'remote'}`);
    const randoplan_uri = isLocal ? local_randoplan_uri : remote_randoplan_uri
    const state = req.query.state;
    if (state === undefined) {
        res.status(400).json({ 'status': 'Missing OAuth keys for RideWithGPS auth' });
        return;
    }
    const rwgpsBaseOAuth = 'https://ridewithgps.com/oauth/authorize';
    const oauth_client = process.env.RWGPS_OAUTH_CLIENT_ID;
    const rwgpsUrl = `${rwgpsBaseOAuth}?client_id=${oauth_client}&redirect_uri=${randoplan_uri}&response_type=code&state=${state}`;
    Sentry.addBreadcrumb({category:'rwgps', level:'info', message: rwgpsUrl})
    res.redirect(rwgpsUrl);
});

const getRwgpsTokenFromCode = async (code : string, randoplan_uri: string) => {
    Sentry.addBreadcrumb({category:'rwgps', level:'info', message: code})
    let response = await axios.post('https://ridewithgps.com/oauth/token.json',{
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.RWGPS_OAUTH_CLIENT_ID,
        client_secret: process.env.RWGPS_OAUTH_SECRET,
        redirect_uri: randoplan_uri
    }).catch((error: any) => {
        Sentry.captureException(error, {tags: {where:'Fetching Ride with GPS token', code: code}})
    });
    if (response !== undefined) {
        return response.data.access_token;
    }
    return null;
};

app.get('/rwgpsAuthReply', async (req: Request, res : Response) => {
    const isLocal = req.socket.localAddress === req.socket.remoteAddress;
    const randoplan_uri = isLocal ? local_randoplan_uri : remote_randoplan_uri
    const state = req.query.state;
    let restoredState;// = {rwgpsToken:''};
    if (state && typeof state === 'string' && state !== '') {
        try {
            restoredState = querystring.parse(decodeURIComponent(state.slice(1)));
        } catch (error) {
            Sentry.captureMessage(`error in state restored from RWGPS:${error} ${decodeURIComponent(state)}`)
        }
    }
    if (req.query.code && typeof req.query.code === 'string') {
        const token = await getRwgpsTokenFromCode(req.query.code, randoplan_uri);
        if (restoredState) {
            restoredState.rwgpsToken = token;
        } else {
            restoredState = {rwgpsToken : token}
        }
        res.redirect(url.format('/?') + querystring.stringify(restoredState));
    } else {
        if (restoredState) {
            res.redirect(url.format('/?') + querystring.stringify(restoredState));
        } else {
            res.redirect(url.format('/'));
        }
    }
});

app.get('/stravaAuthReq', (req : Request, res : Response) => {
    const state = req.query.state;
    if (!state || typeof state !== 'string') {
        res.status(400).json({ 'status': 'Missing OAuth state from Strava' });
        return;
    }
/*     try {
        let restoredState = JSON.parse(decodeURIComponent(state.replace(/\+/g, " ")));
        insertFeatureRecord({
            timestamp: new Date(),
            routeNumber: restoredState.rwgpsRoute === undefined ? null : restoredState.rwgpsRoute
        },
            "strava");
    } catch (error) {
        res.status(400).json({'status':`${error} : Invalid OAuth state ${state}`});
        return;
    }
 */    const baseUrl = url.format({
        protocol: req.protocol,
        host: req.get('host')
    });
    Sentry.addBreadcrumb({category:'strava', level:'info', message: state})
    logger.info(`Getting Strava authorization ${baseUrl} ${JSON.stringify(state)}`);
    res.redirect(getStravaAuthUrl(baseUrl, state));

});

app.get('/stravaAuthReply', async (req : Request, res : Response) => {
    console.log(JSON.stringify(req.query))
    const code = req.query.code;
    let error = req.query.error;
    const scope = req.query.scope
    if (error === undefined && code === undefined) {
        error = 'Strava authentication denied';
    }
    const state = req.query.state;
    interface RestoredState {
        strava_activity: string | undefined
        strava_access_token: string
        strava_refresh_token: string
        strava_token_expires_at: string
        strava_error: string | undefined
        [index:string]:any
    }
    let restoredState = {} as RestoredState;
    if (state && typeof state === 'string' && state !== '') {
        restoredState = JSON.parse(decodeURIComponent(state));
    }
    if (error === undefined && typeof code === "string") {
        console.log(`Requesting Strava token exchange with code ${code} and scope ${scope}`)
        process.env.STRAVA_CLIENT_SECRET = process.env.STRAVA_API_KEY;
        getStravaToken(code).then(token => {
            restoredState.strava_access_token = token.access_token;
            restoredState.strava_refresh_token = token.refresh_token;
            restoredState.strava_token_expires_at = token.expires_at;   
            delete restoredState.strava_error 
            res.redirect(url.format('/?') + querystring.stringify(restoredState));
        }).catch(err => {
            Sentry.captureMessage(`got bad Strava auth reply ${err.message}`); 
            restoredState.strava_error = error = err.message
            res.redirect(url.format('/?') + querystring.stringify(restoredState));
        })
    }
    else {
        restoredState.strava_activity = undefined;
        if (typeof error === 'string') restoredState.strava_error = error;
        res.redirect(url.format('/?') + querystring.stringify(restoredState));
    }
});

app.get('/refreshStravaToken', async (req: Request, res : Response) => {
    const refreshToken = req.query.refreshToken;
    if (typeof refreshToken !== 'string' || refreshToken === 'null') {
        res.status(400).json({ 'status': 'Bad call to refresh Strava token' });
        return;
    }
    process.env.STRAVA_CLIENT_SECRET = process.env.STRAVA_API_KEY;

    try {
        const refreshResponse = await axios.post('https://www.strava.com/api/v3/oauth/token', null, {
            params: {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_API_KEY,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }
        });

        const refreshResult = refreshResponse.data;
        res.status(200).json(refreshResult);    
    } catch (err : any) {
        res.status(err.statusCode).json(err.error)
    }
});

app.get('/', (req : Request, res : Response) => {
    let title = 'RandoPlan - Weather and AQI for Randonnées and Brevets';
    if (Object.keys(req.query).length > 0) {
        console.log(`request query ${JSON.stringify(req.query)}`);
        if (Object.keys(req.query).includes('name') && typeof req.query.name === 'string') {
            title = `Forecast for ${req.query.name}`;
        }
    }
    const ejsVariables = {
        'maps_key': process.env.MAPS_KEY,
        'timezone_api_key': process.env.TIMEZONE_API_KEY,
        'bitly_token': process.env.BITLY_TOKEN,
        'sentry_trace_sample_rate': process.env.SENTRY_TRACE_SAMPLE_RATE,
        'sentry_app_id': process.env.SENTRY_APP_ID,
        'version': process.env.npm_package_version,
        'preloaded_state': '',
        'reactDom': '',
        delimiter: '?',
        title: title
    };
    try {
        res.set("Document-Policy", "js-profiling");
        res.render('index', ejsVariables)
    } catch (err) {
        Sentry.captureException(err, {tags: {where:'Top level rendering'}})
    }
});

app.get('/visualize', (req : Request, res : Response) => {
    const ejsVariables = {
        'maps_key': process.env.MAPS_KEY,
        'version': process.env.npm_package_version,
        delimiter: '?'
    };
    if (Object.keys(req.query).length > 0) {
        console.log(`request query ${JSON.stringify(req.query)}`);
    }
    try {
        res.render('vis_index', ejsVariables)
    } catch (err) {
        Sentry.captureException(err, {tags: {where:'Top level rendering'}})
    }
});

/* const makeFeatureRecord = (response) => {
    // Create a visit record to be stored in the database
    console.info(`${response.data.user.email} used the feature`);
    return {
        timestamp: new Date(),
        email: response.data.user.email,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name
    };
}
 */
interface FavoritesReply {
    results: Array<{
        favid: string
        type: string
        [index:string]:any
    }>
    [index:string]:any
}

axiosRetry(axiosInstance, {
    retries: 5,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: { response: { status: any; }, message: string, code:string }) => {
        const isNetworkError = error.message === 'Network Error' || (error.code && error.code === 'ECONNABORTED') || !error.response;
        return isNetworkError;    
    },
    onRetry: (retryCount: number, error: any, requestConfig: { url: string; }) => {
        warn(`pinned route axios retry count ${retryCount} for ${requestConfig.url}`);
    },
    onMaxRetryTimesExceeded: (err: any) => {
        warn(`last pinned route axios error after retrying was ${err}`)
    }
});

app.get('/pinned_routes', async (req : Request, res : Response) => {
    const rwgpsApiKey = process.env.RWGPS_API_KEY;
    const token = req.query.token;
    if (token === undefined || token === 'undefined' || typeof token !== 'string') {
        res.status(400).json("{'status': 'Missing authentication token'}");
        return;
    }
    if (rwgpsApiKey === undefined) {
        res.status(500).json({ 'details': 'Missing rwgps API key' });
        return;
    }

    const customHeaders: AxiosRequestConfig['headers'] = {
    'Authorization':`Bearer ${token}`,
    'x-rwgps-api-key':rwgpsApiKey,
    'x-rwgps-auth-token':token
    };

    const userInfoHeaders: AxiosRequestConfig['headers'] = {
    'Authorization':`Bearer ${token}`
    };

    interface RwgpsSyncType {
        action : string,
        datetime: string,
        item_id : number,
        item_type : 'route'|'trip',
        item_url : string,
        item_user_id : number
    }
    interface RwgpsSyncMeta {
        rwgps_datetime: string,
        next_sync_url: string
    }
    type RwgpsSync = {
        items: RwgpsSyncType[],
        meta: RwgpsSyncMeta
    }
    interface ErrorResponse {
        error: string
    }
    interface FavoriteMapValue {
        id: number,
        associated_object_id: string,
        associated_object_type: string
    }
    let options = {headers: customHeaders};
    let syncUrl = `https://ridewithgps.com/api/v1/sync.json?since=1970-01-01&assets=routes,trips`;
    const syncResponse = await axiosInstance.get<RwgpsSync>(syncUrl, options).catch(((error : AxiosError) => {
        if (error.response && isAxiosError(error) && error.response.data) {
            Sentry.captureMessage(`Error fetching pinned routes for ${req.query.token} ${(error.response.data as ErrorResponse).error}`);
            res.status(error.response.status).json((error.response.data as ErrorResponse).error);    
        } else {
            Sentry.captureMessage(`Error fetching pinned routes for ${req.query.token} ${error.response}`);
            res.status(500).json(error.response)
        }
    }));
    if (!syncResponse) {
            Sentry.captureMessage("No favorites returned from Ride with GPS sync call")
            res.status(401).json("No favorites returned from Ride with GPS sync call")
            return
    }
    const filteredResponse = syncResponse.data.items.filter((item : RwgpsSyncType) => item.action === 'added');
    const favoritesMap = new Map<string,FavoriteMapValue>(filteredResponse.map((fav : RwgpsSyncType) => {
        return [fav.item_id.toString(), {id:fav.item_id,
            associated_object_id:fav.item_url.replace('https://ridewithgps.com/api/v1/routes/', '').replace('https://ridewithgps.com/api/v1/trips/', '').replace('.json',''), 
            associated_object_type:fav.item_type, key:fav.item_id}]
        }));

    // keep this older code to get the names without having to fetch all the data from every route
    let userInfoOptions = {headers: userInfoHeaders};
    try {
        let url = `https://ridewithgps.com/users/current.json`;
        interface RwgpsUserInfo {
            user: {
                id: string
                email: string
            }
            data: {
                error: string;
            };
            status: number;
        }
        //@ts-ignore
        const response = await axiosInstance.get<RwgpsUserInfo>(url, userInfoOptions).catch((error: AxiosError) => {
            if (error.response && isAxiosError(error) && error.response.data) {
                Sentry.captureMessage(`Error fetching pinned routes for ${req.query.token} ${(error.response.data as ErrorResponse).error}`);
                res.status(error.response.status).json((error.response.data as ErrorResponse).error);    
            } else {
                Sentry.captureMessage(`Error fetching pinned routes for ${req.query.token} ${error.response}`);
                res.status(500).json(error.response)
            }
        });
        if (response === undefined) {
            return;
        }
        // insertFeatureRecord(makeFeatureRecord(response), "pinned", response.data.user.email);
        const favoritesReply = await axiosInstance.get<FavoritesReply>(`https://ridewithgps.com/users/${response.data.user.id}/favorites.json?version=2&apikey=${rwgpsApiKey}`, userInfoOptions).
        catch((error : AxiosError) => {
            Sentry.captureMessage(`Favorites error ${error}`)
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                res.status(401).json(error.toString());
            }
        });
        if (!favoritesReply) {
            Sentry.captureMessage("No favorites returned from Ride with GPS")
            res.status(401).json("No favorites returned from Ride with GPS")
            return
        }

        const favorites = favoritesReply.data.results.map(fav => {
            const matchingFav = favoritesMap.get(fav[fav.type].id.toString());
            if (matchingFav) {
                return {
                    ...matchingFav, name:fav[fav.type].name,
                }
            }
        });
        res.status(200).json(favorites);
    } catch (err : any) {
        if (err !== undefined) {
            Sentry.captureException(err, {tags: {where:'Fetching pinned routes'}})
            if (err.response !== undefined) {
                res.status(err.response.status).json(err.response.data);
            } else {
                res.status(500).json(err);
            }
        }
    }

});

/* const getFeatureVisits = (featureName : string) => {
    const query = datastore
        .createQuery(featureName)
        //    .filter('__key__', '=', datastore.key(featureName)
        .order('timestamp', { descending: true });

    return datastore.runQuery(query);
};
 */
/* app.get('/queryfeature', cors(), async (req : Request, res : Response) => {
    if (req.query.feature === undefined) {
        res.status(400).send("Missing feature name");
        return;
    }
    const [entities] = await getFeatureVisits(req.query.feature);
    const visits = entities.map(
        entity => JSON.stringify({
            "Time": entity.timestamp, "Email": entity.email, "FirstName": entity.first_name,
            "LastName": entity.last_name, "Route": entity.routeNumber
        })
    );
    res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send(`[\n${visits.join(',\n')}]`)
        .end();
});
 */
export default app;
