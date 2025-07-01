const { Router } = require("express");

const bot = require("../controllers/bot");
const auth = require("../controllers/auth");
const voucher = require("../controllers/voucher");
const package = require("../controllers/package");
const token = require("../controllers/token");
const user = require("../controllers/user");
const schedule = require("../controllers/schedule");

const app = Router()

app.post('/api/:type?/:cmd?/:id?', voucher);
app.post('/api/:type?/:cmd?/:id?', bot);
app.post('/api/:type?/:cmd?/:id?', auth);
app.post('/api/:type?/:cmd?/:id?', package);
app.post('/api/:type?/:cmd?/:id?', token);
app.post('/api/:type?/:cmd?/:id?', user);
app.post('/api/:type?/:cmd?/:id?', schedule);

module.exports = app;