function loadPhotos()
{
  fetch("/api/photos")
    .then(function(res) {
        return res.json()
    })
    .then(function(photos) {
        let rowEl
        const itemTemplate = document.getElementById("list-item-template").innerHTML

        for (var i = 0; i < photos.length; i++) {
            var photo = photos[i]

            const el = document.createElement("div")
            el.innerHTML = itemTemplate

            el.className = "col-sm-3"
            
            const titleEl = el.getElementsByClassName("title-link")[0]
            titleEl.innerHTML = photo.title
            titleEl.href = "photo.html?id=" + photo.id

            const commentsEl = el.getElementsByClassName("comment-count")[0]
            commentsEl.innerHTML = photo.comments.length

            const imageLinkEl = el.getElementsByClassName("image-link")[0]
            const imageEl = el.getElementsByClassName("image")[0]
            imageLinkEl.href = "photo.html?id=" + photo.id
            imageEl.src = photo.image

            if (i % 4 === 0) {
                if (rowEl) {
                    document.getElementById("photos").appendChild(rowEl)
                }

                rowEl = document.createElement("div")
                rowEl.className = "row"
            }

            rowEl.appendChild(el)
        }

        if (rowEl) {
            document.getElementById("photos").appendChild(rowEl)
        }
    })
}

function loadPhoto() {
    var photoId = getParameterByName("id") 
    fetch("/api/photos/" + photoId)
        .then(function(res) {
            return res.json()
        })
        .then(function(photo) {
            const titleEl = document.getElementById("title")
            const imgEl = document.getElementById("image")
            const submitBtnEl = document.getElementById("submitCommentButton")
            titleEl.innerHTML = photo.title
            imgEl.src = photo.image
            submitBtnEl.onclick = () => { 
                submitComment(photoId)
            }

            photo.comments.forEach(function(comment) {
                loadComment(comment, false)
            })
        })
}

function submitComment(photoId) {
    const textEl = document.getElementById("comment-text-input")                

    const record = {
        photoId: photoId,
        text: textEl.value,
        time: new Date()
    }

    createComment(record).then(function(comment) {
        loadComment(comment, true)
        textEl.value = ""
    })
}

function loadComment(comment, isSyncing) {
    const commentTemplate = document.getElementById("comment-template").innerHTML

    const el = document.createElement("div")
    el.innerHTML = commentTemplate

    const commentPanelEl = el.getElementsByClassName("comment")[0]
    const timeEl = el.getElementsByClassName("comment-time")[0]
    const commentEl = el.getElementsByClassName("comment-text")[0]
    const statusEl = el.getElementsByClassName("comment-status")[0]

    if (typeof comment.time === "string") {
        comment.time = new Date(comment.time)
    }
    timeEl.innerHTML = 
        comment.time.getMonth() + "/" + comment.time.getDate() + "/"
        + comment.time.getYear() + " " + comment.time.getHours() + ":"
        + comment.time.getMinutes() + ":" + comment.time.getSeconds()
    commentEl.innerHTML = comment.text
    if (isSyncing) {
        statusEl.innerHTML = "posting..."
        commentPanelEl.className += " panel-default"
        el.setAttribute("commentid", "c" + comment.id)
    } else {
        commentPanelEl.className += " panel-primary"
        el.setAttribute("commentid", comment.id)
    }

    document.getElementById("comments").appendChild(el)
}

function commentDoneSyncing(clientId, comment) {
    var container = document.getElementById("comments")

    for (var i = 0; i < container.childNodes.length; i++) {
        var el = container.childNodes[i]
        if (el.getAttribute("commentid") === "c" + clientId) {
            const timeEl = el.getElementsByClassName("comment-time")[0]
            const commentEl = el.getElementsByClassName("comment-text")[0]
            const statusEl = el.getElementsByClassName("comment-status")[0]
            const panelEl = el.getElementsByClassName("comment")[0]

            comment.time = new Date(comment.time)
            statusEl.innerHTML = ""
            timeEl.innerHTML = 
                comment.time.getMonth() + "/" + comment.time.getDate() + "/"
                + comment.time.getYear() + " " + comment.time.getHours() + ":"
                + comment.time.getMinutes() + ":" + comment.time.getSeconds()
            panelEl.className = panelEl.className.replace(" panel-default", " panel-primary")
            el.setAttribute("commentid", comment.id)
        }
    }
}

function createPhoto(body) {
    fetch("/api/photos", { method: "POST", body: body })
        .then(function(res) {
            loadPhotos()
        })
}

function createComment(record) {
    return openDb().then(function(db) {
        return db.comments.add(record)
    }).then(function(items) {
        return navigator.serviceWorker.ready.then(function(swRegistration) {
            return swRegistration.sync.register("newComment-" + items[0].id);
        }).then(function() {
            return items[0]
        })
    })

    //return fetch("/api/photos/" + photoId + "/comments", { method: "POST", body: record })
}

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href
    }
    name = name.replace(/[\[\]]/g, "\\$&")
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url)
    if (!results) return null
    if (!results[2]) return ""
    return decodeURIComponent(results[2].replace(/\+/g, " "))
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

function isOnline () {
  var connectionStatus = document.getElementById("connectionStatus")

  if (navigator.onLine){
    connectionStatus.style.display = "none"
  } else {
    connectionStatus.style.display = ""
  }
}

function spawnNotification(theBody,theIcon,theTitle) {
  var options = {
      body: theBody,
      icon: theIcon
  }
  var n = new Notification(theTitle,options);
}

window.addEventListener("load", function() {
    if ("serviceWorker" in navigator) {
    
        // Set up a listener for messages posted from the service worker.
        navigator.serviceWorker.addEventListener("message", function(event) {
            console.log("Message received %o", event)
            commentDoneSyncing(event.data.clientId, event.data.comment)
        })

        navigator.serviceWorker.register("/sw.js").then(function(registration) {
            // Registration was successful
            console.log("ServiceWorker registration successful with scope: ", registration.scope)
            return navigator.serviceWorker.ready
        }).catch(function(err) {
            // registration failed
            console.log("ServiceWorker registration failed: ", err)
        })
    }

    if ("Notification" in window) {
        if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function(result) {
                console.log("Notification permission result %o", result);
            });
        }
    }
    
    window.addEventListener("online", isOnline)
    window.addEventListener("offline", isOnline)
    isOnline()
});
