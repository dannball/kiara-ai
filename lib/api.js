const { Router } = require("express");

const bot = require("../controllers/bot");
const auth = require("../controllers/auth");
const voucher = require("../controllers/voucher");
const package = require("../controllers/package");
const token = require("../controllers/token");
const user = require("../controllers/user");
const schedule = require("../controllers/schedule");

const app = Router()

// COde nya mengalir dari bot ke schedule
app.post(
    '/api/:type?/:cmd?/:id?', 
    package, 
    auth, 
    voucher, 
    token, 
    user, 
    bot, 
    schedule
);

module.exports = app;