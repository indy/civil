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

console.log("hi from sw");

// set this to false when deploying, true when developing js
var devMode = true;

var CACHE_NAME = "civil-20201107c";

var precacheConfig = [
  "/apple-touch-icon.png",
  "/civil-base.css",
  "/civil-form.css",
  "/civil.css",
  "/index.html",

  "/js/App.js",
  "/js/AppState.js",
  "/js/CivilUtils.js",
  "/js/JsUtils.js",
  "/js/Net.js",
  "/js/eras.js",
  "/js/graphPhysics.js",
  "/js/index.js",
  "/js/StateProvider.js",
  "/js/svgIcons.js",
  "/js/WasmInterfaceProvider.js",
  "/js/components/CivilSelect.js",
  "/js/components/DeckManager.js",
  "/js/components/Graph.js",
  "/js/components/GraphSection.js",
  "/js/components/Ideas.js",
  "/js/components/ImageWidget.js",
  "/js/components/ListSections.js",
  "/js/components/ListingLink.js",
  "/js/components/Login.js",
  "/js/components/Note.js",
  "/js/components/People.js",
  "/js/components/PointForm.js",
  "/js/components/Publications.js",
  "/js/components/QuickFind.js",
  "/js/components/RollableSection.js",
  "/js/components/Search.js",
  "/js/components/SectionLinkBack.js",
  "/js/components/Timelines.js",

  "/tufte.css",
  "/wasm.js",
  "/wasm_bg.wasm",
  "/lib/preact/hooks.js",
  "/lib/preact/htm.js",
  "/lib/preact/mod.js",
  "/lib/preact/preact.js",
  "/lib/preact/preact-router.js",
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

    var isCached = urlsToCache.has(url);

    if (devMode && isCached)
      return;

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
