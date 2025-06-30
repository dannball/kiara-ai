const { Router } = require("express");

const bot = require("../controllers/bot");
const auth = require("../controllers/auth");
const voucher = require("../controllers/voucher");

const app = Router()

app.post('/api/:type?/:cmd?/:id?', voucher);
app.post('/api/:type?/:cmd?/:id?', bot);
app.post('/api/:type?/:cmd?/:id?', auth);

module.exports = app;