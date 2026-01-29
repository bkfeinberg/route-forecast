//import * as Sentry from "@sentry/react";
import { init, feedbackIntegration, browserSessionIntegration, browserTracingIntegration,
     browserProfilingIntegration, replayIntegration, replayCanvasIntegration, 
     thirdPartyErrorFilterIntegration, setTag, logger, metrics, setContext, getGlobalScope } from '@sentry/react';
const { trace, debug, info, warn, error, fatal, fmt } = logger;

import { createRoot } from 'react-dom/client';
import ReactGA from "react-ga4";
import VersionContext from "../versionContext";
import LocationContext from '../locationContext';
import TopLevel from './topLevel';

let serviceWorkerInstalled = false;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data.type === 'info') {
            console.info(`Message from service worker: ${event.data.data}`);
            info(`Message from service worker: ${event.data.data}`);
        } else if (event.data.type === 'trace') {
            console.debug(`Message from service worker: ${event.data.data}`);
            trace(`Message from service worker: ${event.data.data}`);
        } else if (event.data.type === 'warning') {
            console.warn(`Message from service worker: ${event.data.data}`);
            warn(`Message from service worker: ${event.data.data}`);
        } else {
            console.error(`Message from service worker: ${event.data.data}`);
            error(`Message from service worker: ${event.data.data}`);
        }
        return;
    });

    setContext("serviceWorker", { installed: serviceWorkerInstalled });
    setTag("serviceWorkerInstalled", false);
    getGlobalScope().setAttributes({
        serviceWorkerInstalled: false
    });

    let serviceWorkerInstallationFailed = false;
    navigator.serviceWorker.register('/worker.js').then((registration) => {
        console.log(`Service worker registered! - ${registration.scope}`);
        serviceWorkerInstalled = true;
        metrics.count("install_successes", 1, {attributes:{registration:JSON.stringify(registration)}});
        setContext("serviceWorker", { installed: true });
        setTag("serviceWorkerInstalled", true);
        getGlobalScope().setAttributes({
            serviceWorkerInstalled: true
        });
        // reg.installing may or may not be set, depending on whether
        // a new SW was registered.
        registration.installing?.addEventListener('statechange', (event : Event) => {
        if (event.target && (event.target as ServiceWorker).state === 'redundant') {
            warn(`Service worker did not install correctly, was redundant`);
             serviceWorkerInstallationFailed = true;
             metrics.count("install_failures", 1, {attributes:{error:'Redundant'}});
        }});        
    }).catch((error) => { 
        warn(`Error registering service worker, while browser was ${navigator.onLine?'online':'offline'}: ${error}`);
        serviceWorkerInstallationFailed = true;
        metrics.count("install_failures", 1, {attributes:{error:error}});
    });

    navigator.serviceWorker.ready
        .then(registration => {
            // This code runs when an active service worker is ready to control clients
            console.log('An active service worker is ready and controlling the page.', registration);
            if (registration.active) {
                console.log(`Worker details:${registration.active.state} ${registration.active.scriptURL}`);
            }
            // Place code here that depends on the service worker being functional
            // (e.g., using postMessage or enabling offline features in your UI)
            if (serviceWorkerInstallationFailed) {
                info('Service Worker installed after previously failing to install.');
                metrics.count("install_successes", 1, {attributes:{registration:JSON.stringify(registration)}});
                metrics.count("install_failures", -1);
                setContext("serviceWorker", { installed: true });
                setTag("serviceWorkerInstalled", true);
                getGlobalScope().setAttributes({
                    serviceWorkerInstalled: true
                });
            } else {
                info('Service Worker ready check completed normally.');
            }
            serviceWorkerInstallationFailed = false
            serviceWorkerInstalled = true;
        })
        .catch(error => {
            warn(`Service Worker ready check failed with ${error}`);
            serviceWorkerInstallationFailed = true;
        });
}

window.addEventListener('online', (event) => {
    if (!serviceWorkerInstalled) {
        // retry installing service worker when back online
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/worker.js').then((registration) => {
                console.log(`Service worker registered on reconnect! - ${registration.scope}`);
                metrics.count("install_successes", 1, {attributes:{registration:registration}});
                serviceWorkerInstalled = true;
            }).catch((error) => {
                warn(`Error registering service worker on reconnect: ${error}`);
                metrics.count("install_failures", 1, {attributes:{error:error}});
            });
        }
    }
});


let script = document.scripts.namedItem('routeui')
if (!script || script == null) {
    <div>Script parameter is missing</div>
}
else {
    const sentry_app_id = script.getAttribute('sentry_app_id')
    const trace_sample_rate = script.getAttribute('sentry_trace_sample_rate')
    // console.log('NPM version : ' + process.env.npm_package_version)
    const allowedHosts = ['localhost', '127.0.0.1', 'Brians-MacBook-Pro.local'];
    const url = new URL(window.origin);
    if (!allowedHosts.includes(url.hostname)) {
        ReactGA.initialize("G-0R3J1W9ECC");
        if (sentry_app_id && sentry_app_id !== null) {
            init({
                dsn: 'https://ea4c472ff9054dab8c18d594b95d8da2@sentry.io/298059',
                _experiments: { enableLogs: true },
                environment: 'production',
                sendDefaultPii: true,
                ignoreErrors: [
                    "Non-Error exception captured",
                    "Non-Error promise rejection captured"
                ],
                // This enables automatic instrumentation (highly recommended), but is not
                // necessary for purely manual usage
                integrations: [
                    thirdPartyErrorFilterIntegration({
                        filterKeys: [sentry_app_id],
                        behaviour: "drop-error-if-exclusively-contains-third-party-frames"
                    }),
                    browserSessionIntegration(),
                    browserTracingIntegration(),
                    browserProfilingIntegration(),
                    replayIntegration({
                        maskAllText: false,
                        blockAllMedia: false,
                        maskAllInputs: false
                    }),
                    replayCanvasIntegration(),
                    feedbackIntegration({
                        autoInject: false
                    })
                ],
                // denyUrls: ["https://maps.googleapis"],
                // To set a uniform sample rate
                tracesSampleRate: Number.parseFloat(trace_sample_rate?trace_sample_rate:'0.1'),
                // profileSessionSampleRate: 0.3,
                // profileLifecycle: "trace",
                tracePropagationTargets: ["localhost", /^https:\/\/www\.randoplan\.com/],
                // This sets the sample rate to be 10%. You may want this to be 100% while
                // in development and sample at a lower rate in production
                replaysSessionSampleRate: 0.03,
                // If the entire session is not sampled, use the below sample rate to sample
                // sessions when an error occurs.
                replaysOnErrorSampleRate: 0.9,
                normalizeDepth: 5
            });
        }
    }

    const action = script.getAttribute('action');
    const maps_api_key = script.getAttribute('maps_api_key');
    const timezone_api_key = script.getAttribute('timezone_api_key');
    const bitly_token = script.getAttribute('bitly_token');
    let version = script.getAttribute('version');

    setTag('version', version)
    
    interface TopLevelProps {
        action: string, 
        maps_api_key: string,
         timezone_api_key: string, 
         bitly_token: string, 
         preloaded_state?: object
    }
    const render = (Component : React.FC<TopLevelProps>) => {
        const container = document.getElementById('content')
        if (!container) {
            return (<div>Missing root container for application</div>)
        }
        if (!action || !maps_api_key || !timezone_api_key || !bitly_token) {
            return (<div>Missing required configuration variables</div>)
        }
        if (!version) {
            version = '0.0.0'
        } else {
            ReactGA.set({'appName': 'randoplan'})
            ReactGA.set({'appVersion' : version})
            ReactGA.event('appVersion', {rpVersion: version})
        }
        const root = createRoot(container);
        root.render(
            <VersionContext.Provider value={version}>
                <LocationContext.Provider value={{ href: location.href, search: location.search, origin: location.origin }}>
                    <Component action={action} maps_api_key={maps_api_key} timezone_api_key={timezone_api_key} bitly_token={bitly_token} />
                </LocationContext.Provider>
            </VersionContext.Provider>
        )
    };

    render(TopLevel);
}
