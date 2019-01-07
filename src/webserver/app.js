"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const misc_js_1 = require("../shared/misc.js");
const index_js_1 = require("./routes/index.js");
const httpLogger_js_1 = require("../shared/httpLogger.js");
const logger = global.logger;
let app = express();
// view engine setup
app.set('views', path.join(__dirname, '../webserver/views'));
app.set('view engine', 'pug');
app.use(httpLogger_js_1.default.bind(null, (message, req, res) => {
    if (req.originalUrl === '/') {
        logger.log('http', message);
    }
    else {
        logger.log('verbose http', message);
    }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
// hide impressum_template.html
app.get("/html/impressum_template.html", function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});
// print message if no impressum was configured
app.get("/html/impressum.html", function (req, res, next) {
    if (fs.existsSync(path.join(__dirname, '../webserver/public', 'html/impressum.html'))) {
        next();
    }
    else {
        res.status(200);
        res.write('<!DOCTYPE html><meta charset="utf-8">');
        res.end("Der Websitebetreiber stellt kein Impressum zur Verfügung.");
    }
});
app.use(express.static(path.join(__dirname, '../webserver/public')));
app.use('/', index_js_1.default);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err["status"] = 404;
    next(err);
});
app.use(function errorHandler(err, req, res, next) {
    if (!(err instanceof Error))
        err = new Error(err);
    if (err.status !== 404) {
        logger.log('error', misc_js_1.inspect `${err}`);
    }
    if (!err.status) {
        err.status = 500;
        err.message = "Internal Server Error";
    }
    res.status(err.status);
    res.locals.error = err;
    res.locals.message = err.message;
    res.render('error');
});
exports.default = app;
