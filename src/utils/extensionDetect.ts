const requiredVersion = 1.0;
import {logger} from "@sentry/react";
const { trace, debug, info, warn, error, fatal, fmt } = logger;

declare global {
    interface Window { getRpExtVersion: any; }
}

declare namespace browser.runtime {
    export function sendMessage<M = any, R = any>(
        extensionId: string | undefined | null,
        message: M,
        responseCallback?: (response: R) => void,
    ): Promise<{version:number}>;
}

export const browserIsChrome = () => {
    var isChromium = window.chrome;
    var winNav = window.navigator;
    var vendorName = winNav.vendor;
    return isChromium !== null &&
        typeof isChromium !== "undefined" &&
        vendorName === "Google Inc."
};

export const browserIsFirefox = () => {
    return window.navigator.userAgent.match(/firefox|fxios/i);
};

export const browserIsSafari = () => {
    return window.navigator.userAgent.match(/Safari/i) && !window.navigator.userAgent.match(/Chrome/i) && !window.navigator.userAgent.match(/CriOS/)
}

/*global chrome*/
export const extensionIsInstalled = () => {
    if (browserIsChrome()) {
        if (chrome === undefined || chrome.runtime === undefined || chrome.runtime.sendMessage === undefined || typeof chrome.runtime.sendMessage !== "function") {
            return Promise.resolve(false);
        }
        return new Promise<boolean>((resolve => {
            chrome.runtime.sendMessage('bgodmjchmhnpgccglldbfddddignglep', { message: "version" },
            (reply) => {
                if (chrome.runtime.lastError) {
                    warn(chrome.runtime.lastError.message||'Unknown error when checking extension version');
                    resolve(false);
                }
                if (reply) {
                    if (reply.version) {
                        if (reply.version >= requiredVersion) {
                            resolve(true);
                        }
                    }
                }
                else {
                    resolve(false);
                }
                });
        }))
    } else if (browserIsFirefox()) {
        if (window.getRpExtVersion !== undefined) {
            const version = window.getRpExtVersion();
            return Promise.resolve(version >= requiredVersion);
        } else {
            return Promise.resolve(false);
        }
    } else if (browserIsSafari() && typeof browser !== "undefined" && browser.runtime !== undefined && typeof browser.runtime.sendMessage === "function")
    {
        return new Promise<boolean>(( resolve => {
            try {
                // eslint-disable-next-line no-undef
                browser.runtime.sendMessage(
                    "com.randoplan.extension.Extension (2B6A6N9QBQ)",
                    { message: "version" }).then(response => {
                        if (response && response.version) {
                            return resolve(response.version >= requiredVersion)
                        } else {
                            return resolve(false);
                        }
                    }).catch( error => {
                        console.error(error)
                        return resolve(false)
                    })
            } catch( error ) {
                console.error(error)
                return resolve(false)
            }
        }))
    }
    else {
        // for no known browser
        return Promise.resolve(false)
    }
}

/* 
function(response: { version: number; }) {
                    if (response && response.version) {
                        return resolve(response.version >= requiredVersion)
                    } else {
                        return resolve(false);
                    }
                })
                } catch (error) {
                    console.error(error)
                    return resolve(false)
                }
        })

        */
