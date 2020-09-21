/*
 *  Copyright (C) 2020 Inderjit Gill <email@indy.io>
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

// set this to true when deploying, false when developing js
var useCache = true;

var CACHE_NAME = "civil-20200921b";

var precacheConfig = [
  "/index.html",
  "/js/index.js",
  "/wasm.js",
  "/wasm_bg.wasm",
  "/civil-base.css",
  "/tufte.css",
  "/civil-form.css",
  "/civil.css",
  "/apple-touch-icon.png",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/fonts/et-book-display-italic-old-style-figures/et-book-display-italic-old-style-figures.woff",
  "/fonts/et-book-roman-line-figures/et-book-roman-line-figures.woff",
  "/fonts/NothingYouCouldDo-Regular.ttf",
  "/fonts/Bitter/Bitter-Regular.ttf"
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

    // hackishly remove fuckery with urls
    //
    // when refreshing from a page such as /ideas/568 the /index.html page will be loaded from
    // cache. Even though that page contains a href path such as "/civil.css" for some fucking
    // reason this will be requested as "/ideas/civil.css". Therefore we now need this hacky
    // function to remove the fucking /ideas/ part of the url when making requests for resources
    // specified in the index.html file, even though those fucking resources are fucking
    // specified with absolute paths.
    //
    url = hackRemoveDeckPaths(url);

    var isCached = urlsToCache.has(url);

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
    }
  }
});

function hackRemoveDeckPaths(dpath) {
  if (dpath.endsWith("css") ||
      dpath.endsWith("js") ||
      dpath.endsWith("png") ||
      dpath.endsWith("wasm") ||
      dpath.endsWith("ttf") ||
      dpath.endsWith("woff")) {
    dpath = dpath.replace(/ideas\//, '');
    dpath = dpath.replace(/publications\//, '');
    dpath = dpath.replace(/people\//, '');
    dpath = dpath.replace(/events\//, '');
  }
  return dpath;
}
