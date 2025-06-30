process.on("uncaughtException", console.log);

require('dotenv/config');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const database = require('./database');
global.dann = {};

const api = require('./lib/api');
const sequelize = require('./lib/connection-db');

const app = express();

const basePathHTML = path.join(__dirname, 'public/html');
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public/assets')));
app.use(express.static(path.join(__dirname, 'public/css')));

app.use(api);

app.get('/sync', (req, res) => {
    sequelize.sync({ force: true });
    res.send({ message: "Database berhasil di sinkronkan!" })
})

app.get('*', (req, res, next) => {
    let { authKey } = req.query;
    if (req.path.startsWith('/api') && !authKey) return next()
    const requestedPath = req.path === '/' ? 'index.html' : req.path + '.html';
    const filePath = path.join(basePathHTML, requestedPath)
    fs.access(filePath, (err) => {
        if (err) {
            console.log(`Ngga ada filenya tot!! : ${requestedPath}`);
            return next();
        }
        res.sendFile(filePath);
    });
});

app.get('*', (_,r) => r.status(404).sendFile(path.join(basePathHTML, '404.html')));

app.listen(process.env.PORT || 3000, () => {
    console.log(`The server is now running in PORT ${process.env.PORT || 3000}`);
});

// bot(1);