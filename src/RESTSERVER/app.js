"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const index_1 = require("./routes/public/index");
const index_2 = require("./routes/private/index");
const logger = global.logger;
const misc_js_1 = require("../SHARED/misc.js");
const httpLogger_1 = require("../SHARED/httpLogger");
let app = express();
app.use(httpLogger_1.default.bind(null, (message, req, res) => {
    if (/^\/private/.test(req.url)) {
        logger.log('private', message);
    }
    else if (/^\/public/.test(req.url)) {
        logger.log('public', message);
    }
    else {
        logger.log('others', message);
    }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', function (req, res, next) {
    res.end('<!DOCTYPE html>This is a rest API.<br/>For Documentation please visit<br/><a href="https://github.com/soruh/I-Telex-Teilnehmerserver/">https://github.com/soruh/I-Telex-Teilnehmerserver/</a>');
    // TODO write documentation
});
app.use('/public', index_1.default);
app.use('/private', index_2.default);
// catch 404 and forward to error handler
app.use(function notFound(req, res, next) {
    let err = new Error('Not Found');
    err["status"] = 404;
    next(err);
});
// error handler
app.use(function errorHandler(err, req, res, next) {
    if (err.status !== 404) {
        logger.log('error', misc_js_1.inspect `${err}`);
    }
    if (!err.status) {
        err.status = 500;
        err.message = "Internal Server Error";
    }
    res.status(err.status);
    res.end(`${err.status} (${err.message})`);
});
// console.log(app._router.stack);
exports.default = app;
