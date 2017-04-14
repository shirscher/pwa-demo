const fs = require('fs');

const db = {
    data: null,

    getPhotos: function() {
        var self = this;
        var promise = new Promise((resolve, reject) => {
            var photos = self.data.photos;
            resolve(photos);
        });
        return promise;
    },

    getPhoto: function(photoId) {
        var self = this;
        var promise = new Promise((resolve, reject) => {
            const photo = self.data.photos.filter(p => p.id == photoId);
            if (photo.length === 0) {
                resolve(null);
            }
            else {
                resolve(photo[0]);
            }
        });
        return promise;
    },

    createPhoto: function(photo) {
        var self = this;

        photo.id = self.data.photos.length;
        self.data.photos.push(photo);

        return self.save()
            .then(() => {
                return photo;
            });
    },

    createComment: function(photoId, comment) {
        var self = this;
        
        const photoIndex = self.data.photos
            .findIndex(p => p.id == photoId);
        if (photoIndex >= 0) {
            comment.id = self.data.photos[photoIndex].length;
            comment.time = new Date();
            self.data.photos[photoIndex].comments.push(comment);
            return self.save()
                .then(() => {
                    return comment;
                });
        } else {
            return new Promise((resolve, reject) => {
                resolve(null);
            });
        }
    },

    load: function() {
        var self = this;
        var promise = new Promise((resolve, reject) => {
            if (self.data) {
                resolve();
            } else {
                fs.readFile('data.json', (err, data) => {
                    self.data = JSON.parse(data);
                    resolve();
                });
            }
        });
        return promise;
    },

    save: function() {
        var self = this;
        var promise = new Promise((resolve, reject) => {
            fs.writeFile('data.json', JSON.stringify(self.data), (err) => {
                resolve();
                });
            });
        return promise;
    }
};


module.exports = db;