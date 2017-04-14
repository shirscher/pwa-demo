self.importScripts("db.js")

var cacheVersion = 1
var currentCache = {
  offline: "offline-cache-v" + cacheVersion
}

self.addEventListener("install", function(event) {
  console.log("SW install")

  event.waitUntil(
    caches.open(currentCache.offline).then(function(cache) {
      return cache.addAll([
          "/",
          "/index.html",
          "/photo.html",
          "/offline.html",
          "/db.js",
          "/script.js",
          "/images/icon100.png",
          "/images/icon240.png"
      ])
    })
  )
})

self.addEventListener("activate", function(event) {
  console.log("SW activate")
})

self.addEventListener("fetch", function(event) {
    // request.mode = navigate isn't supported in all browsers
    // so include a check for Accept: text/html header.
    if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        // For all HTML page navigations attempt to retrieve the page from cache first

        if ((/photo\.html\?id=[0-9]+/).test(event.request.url)) {
            // Special case for photo.html, it will have an id=X query string, always serve up html page
            event.respondWith(caches.match("/photo.html")
                    .then(function (response) {
                        if (response) {
                            console.log("SW fetch - HTML cache hit %o", event.request)
                            return response
                        } else {
                            console.log("SW fetch - HTML cache miss %o", event.request)
                            return fetch(event.request)
                        }
                    })
                )
        } else {
            // For all other HTML pages look in cache first
            event.respondWith(caches.match(event.request)
                    .then(function (response) {
                        if (response) {
                            console.log("SW fetch - HTML cache hit %o", event.request)
                            return response
                        } else {
                            console.log("SW fetch - HTML cache miss %o", event.request)
                            return fetch(event.request)
                        }
                })
            )
        }
    } else if (event.request.method === "GET" && event.request.headers.get("accept").includes("image/*")) {
        // For images, add to cache if not there
        event.respondWith(caches.match(event.request)
            .then(function (response) {
                if (response) {
                    console.log("SW fetch - Image cache hit %o", event.request)
                    return response
                } else {
                    console.log("SW fetch - Image cache miss %o", event.request)
                    return fetch(event.request)
                        .then(function(response) {
                            caches.open(currentCache.offline).then(function(cache) {
                                cache.add(event.request)
                            }) // TODO: Don't return response until after caching complete?
                            return response
                        })
                        .catch(function(err) {
                            return caches.match("/images/icon240.png")
                                 .then(function (response) { 
                                     return response
                                 })
                        })
                }
            })
        )
    } else if (event.request.method === "GET" && event.request.url.indexOf("/api/") >= 0) {
        // For API calls fetch from network first and fall back to cache if necessary
        event.respondWith(fetch(event.request)
            .then(function(response) {
                console.log("SW fetch - API cache hit %o", event.request)
                caches.open(currentCache.offline).then(function(cache) {
                    cache.add(event.request)
                }) // TODO: Don't return response until after caching complete?
                return response
            })
            .catch(function(err) {
                return caches.match(event.request)
                    .then(function (response) { 
                        return response
                    })
            }))
    } else {
        // For all other requests just forward on to network fetch
        console.log("SW fetch %o", event.request)
        event.respondWith(caches.match(event.request)
            .then(function(response) {
                return response || fetch(event.request)
            })
        )
    }
})

self.addEventListener("message", function(event) {
    console.log("SW message %o", event)
})

self.addEventListener("sync", function(event) {
    console.log("SW Received sync %o", event)
    if (event.tag.substr(0, "newComment-".length) === "newComment-") {
        var id = event.tag.substr("newComment-".length)
        event.waitUntil(syncComment(id))
    }
})

function syncComment(id) {
    var db
    return openDb().then(function(d) {
        db = d
        return db.comments.get(parseInt(id))
    }).then(function(record) {
        if (record) {
            var url = "/api/photos/" + record.photoId + "/comments"
            console.log("Syncing comment %o to " + url, record)
            var data = JSON.stringify(record)
            return fetch(url, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                    },
                method: "POST", 
                body: data })
        } else {
            console.log("syncComment called with invalid ID " + id)
        }
    }).then(function(resp) {
        return resp.json()
    }).then(function(resp) {
        console.log("API response received: %o", resp)


        // Send notification
        self.registration.showNotification('Comment Posted!', {
            body: "Your comment has been posted"
        })

        // Send message to clients
        return self.clients.matchAll().then(function(clients) {
            clients.forEach(function(client) {
                client.postMessage({
                    action: "syncComment",
                    clientId: id,
                    comment: resp
                })
            })
        })
    }).then(function() {
        db.comments.delete(id)
    })
}

function openDb() {
    return db.open({
        server: "my-app",
        version: 1,
        schema: {
            comments: {
                key: {keyPath: "id", autoIncrement: true}
                //,
                // Optionally add indexes
                //indexes: {
                //    firstName: {},
                //    answer: {unique: true}
                //}
            }
        }
    })
}

