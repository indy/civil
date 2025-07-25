/*
 *  Copyright (C) 2021 Inderjit Gill <email@indy.io>
 *
 *  This file is part of Civil
 *
 *  Civil is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Civil is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

// NOTE: Makefile will alter these variables when building a release build
var devMode = true;
var CACHE_NAME = "civil-2023060a";

var precacheConfig = [
    "/android-chrome-192x192.png",
    "/apple-touch-icon.png",
    "/favicon-16x16.png",
    "/favicon-32x32.png",

    "/civil_wasm.js",
    "/civil_wasm_bg.wasm",

    "/index.html",
    "/index.css",
    "/index.js",

    "/fonts/Caveat/Caveat-VariableFont_wght.ttf",

    "/fonts/Crimson/CrimsonPro-Italic-VariableFont_wght.ttf",
    "/fonts/Crimson/CrimsonPro-VariableFont_wght.ttf",

    "/fonts/Inter-Regular.ttf",
    "/fonts/Inter-SemiBold.ttf",

    "/fonts/orbitron/static/Orbitron-Bold.ttf",

    "/fonts/ShareTechMono-Regular.ttf",

    "/fonts/NotoSans/NotoSans-Regular.ttf",
    "/fonts/NotoSans/NotoSans-Italic.ttf",

    "/fonts/LibreBaskerville/LibreBaskerville-Regular.ttf",
    "/fonts/LibreBaskerville/LibreBaskerville-Italic.ttf",
    "/fonts/LibreBaskerville/LibreBaskerville-Bold.ttf",

    "/fonts/Essays1743/essays1743.bolditalic.ttf",
    "/fonts/Essays1743/essays1743.bold.ttf",
    "/fonts/Essays1743/essays1743.italic.ttf",
    "/fonts/Essays1743/essays1743.medium.ttf",

    "/fonts/Atkinson-Hyperlegible/Atkinson-Hyperlegible-Bold-102.ttf",
    "/fonts/Atkinson-Hyperlegible/Atkinson-Hyperlegible-BoldItalic-102.ttf",
    "/fonts/Atkinson-Hyperlegible/Atkinson-Hyperlegible-Italic-102.ttf",
    "/fonts/Atkinson-Hyperlegible/Atkinson-Hyperlegible-Regular-102.ttf",

    "/fonts/Fell/IMFeDPit29P.ttf",
    "/fonts/Fell/IMFeDPrm29P.ttf",
    "/fonts/Fell/IMFeDPsc29P.ttf",
    "/fonts/Fell/IMFeENit29P.ttf",
    "/fonts/Fell/IMFeENrm29P.ttf",
    "/fonts/Fell/IMFeENsc29P.ttf",
    "/fonts/Fell/IMFeFCit29P.ttf",
    "/fonts/Fell/IMFeFCrm29P.ttf",
    "/fonts/Fell/IMFeFCsc29P.ttf",
    "/fonts/Fell/IMFeFlow1.ttf",
    "/fonts/Fell/IMFeFlow2.ttf",
    "/fonts/Fell/IMFeGPit29P.ttf",
    "/fonts/Fell/IMFeGPrm29P.ttf",
    "/fonts/Fell/IMFeGPsc29P.ttf",
    "/fonts/Fell/IMFePIit29P.ttf",
    "/fonts/Fell/IMFePIrm29P.ttf",
    "/fonts/Fell/IMFePIsc29P.ttf",
    "/fonts/Fell/IMFeTLrm29.ttf"
];

var urlsToCache = new Set();

precacheConfig.forEach(asset => {
    var url = new URL(asset, self.location);
    urlsToCache.add(url.toString());
});

var ignoreUrlParametersMatching = [/^utm_/];

function cleanResponse(t) {
    return t.redirected
        ? ("body" in t ? Promise.resolve(t.body) : t.blob()).then(function (e) {
            return new Response(e, { headers: t.headers, status: t.status, statusText: t.statusText });
        })
    : Promise.resolve(t);
}

function stripIgnoredUrlParameters(e, n) {
    var t = new URL(e);
    return (
        (t.hash = ""),
        (t.search = t.search
         .slice(1)
         .split("&")
         .map(function (e) {
             return e.split("=");
         })
         .filter(function (t) {
             return n.every(function (e) {
                 return !e.test(t[0]);
             });
         })
         .map(function (e) {
             return e.join("=");
         })
         .join("&")),
        t.toString()
    );
}

function setOfCachedUrls(e) {
    return e
        .keys()
        .then(function (e) {
            return e.map(function (e) {
                return e.url;
            });
        })
        .then(function (e) {
            return new Set(e);
        });
}

self.addEventListener("install", function (e) {
    console.log("service-worker install");
    e.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(function (r) {
                return setOfCachedUrls(r).then(function (n) {
                    return Promise.all(
                        Array.from(urlsToCache).map(function (t) {
                            if (!n.has(t)) {
                                var e = new Request(t, { credentials: "same-origin" });
                                return fetch(e).then(function (e) {
                                    if (!e.ok) throw new Error("Request for " + t + " returned a response with status " + e.status);
                                    return cleanResponse(e).then(function (e) {
                                        console.log(`install: caching ${t}`);
                                        return r.put(t, e);
                                    });
                                });
                            } else {
                                console.log(`install: already cached ${t}`);
                            }
                        })
                    );
                });
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

self.addEventListener("activate", function (e) {
    console.log("service-worker activate");

    e.waitUntil(
        caches.keys().then(cacheNames => {
            return cacheNames.filter(cacheName => cacheName !== CACHE_NAME);
        }).then(cachesToDelete => {
            return Promise.all(cachesToDelete.map(cacheToDelete => {
                return caches.delete(cacheToDelete);
            }));
        }).then(() => self.clients.claim())
    );

    e.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(function (t) {
                return t.keys().then(function (e) {
                    return Promise.all(
                        e.map(function (e) {
                            if (!urlsToCache.has(e.url)) return t.delete(e);
                        })
                    );
                });
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

self.addEventListener("fetch", function (event) {
    if ("GET" === event.request.method || "HEAD" === event.request.method) {
        var url = stripIgnoredUrlParameters(event.request.url, ignoreUrlParametersMatching);

        var isCached = urlsToCache.has(url);

        if (devMode && isCached) {
            var headers = new Headers();
            headers.append('pragma', 'no-cache');
            headers.append('cache-control', 'no-cache');

            var init = {
                method: event.request.method,
                headers
            };

            return fetch(event.request, init);
        }

        if (!isCached && "navigate" === event.request.mode) {
            url = new URL("/index.html", self.location).toString();
            isCached = urlsToCache.has(url);
        }

        if (isCached) {
            event.respondWith(
                caches
                    .open(CACHE_NAME)
                    .then(function (cache) {
                        if (urlsToCache.has(url)) {
                            return cache.match(url).then(function (response) {
                                if (response) return response;
                                throw Error("The cached response that was expected is missing.");
                            });
                        }
                    })
                    .catch(function (err) {
                        console.warn('Couldn\'t serve response for "%s" from cache: %O', event.request.url, err);
                        return fetch(event.request);
                    })
            );
        } else {
            // check for a phantom request made by Chrome's debug
            let path = url.split("/").slice(3);
            if (path[0] !== "api" && path[0] !== "site.webmanifest" && path[0] !== "u") {
                // when opening Chromium's Developer Tools, there is a GET
                // request made for the current page. As Civil's router
                // re-writes the url this will result in a request to the server
                // for a location that it doesn't understand (e.g. to /ideas
                // when all of the requests to the server should be json calls
                // to locations like /api/ideas).
                //
                // this code detects these probable fake requests and returns a fake response
                //
                // to see this code activated:
                // 1. open a new tab in Chrome/Brave/Chromium etc
                // 2. navigate to a page like localhost:3002/ideas/2800
                // 3. open the developer tools pane
                //
                // opening the developer tools pane should result in one of
                // these phantom GET requests that this code should pick up and
                // then print some message to the console
                //
                console.log(`fake responding for Chrome Dev Pane's request for ${url}`);
                event.respondWith(
                    new Response("fake response for Chrome's Dev Tools", {
                        status: 200,
                        statusText: "OK",
                        headers: { "Content-Type": "text/plain" }
                    })
                )
            } else {
                // make the actual request to the server
            }

        }
    }
});
