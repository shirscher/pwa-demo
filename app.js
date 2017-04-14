const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db.js');

const app = express();
app.use(express.static('public'));

const jsonParser = bodyParser.json();

db.load().then(() => {
    app.get('/api/photos', (req, res) => {
        db.getPhotos()
            .then(photos => {
                res.send(photos);
            });
    });

    app.post('/api/photos', jsonParser, (req, res) => {
        db.createPhoto(req.body)
            .then((photo) => {
                res.send(photo);
            });
    });

    app.get('/api/photos/:id', (req, res) => {
        db.getPhoto(req.params.id)
            .then(photo => {
                if (photo) {
                    res.send(photo);
                }
                else {
                    res.sendStatus(404);
                }
            });
    });

    app.get('/api/photos/:id/comments', (req, res) => {
        db.getPhoto(req.params.id)
            .then(photo => {
                if (photo) {
                    res.send(photo.comments);
                }
                else {
                    res.sendStatus(404);
                }
            });
    });

    app.post('/api/photos/:id/comments', jsonParser, (req, res) => {
        db.createComment(req.params.id, req.body)
            .then((comment) => {
                res.send(comment);
            });
    });

    app.listen(5858, () => {
        console.log('App listening on port 5858')
    });
});

