"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
//import * as favicon from "serve-favicon";
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
var app = express();
// view engine setup
app.set('views', path.join(__dirname, '../WEBSERVER/views'));
app.set('view engine', 'pug');
// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
// app.use(logger('tiny'));
// app.use(logger(':method :url :status :res[content-length] - :response-time ms'))
if (config_js_1.default.loggingVerbosity > 0)
    app.use(logger(function (tokens, req, res) {
        if (config_js_1.default.loggingVerbosity > 1 || tokens.url(req, res) == "/") {
            let status = tokens.status(req, res);
            let color;
            switch (+status[0]) {
                case 1:
                    color = colors_js_1.default.FgYellow;
                    break;
                case 2:
                    color = colors_js_1.default.FgGreen;
                    break;
                case 3:
                    color = colors_js_1.default.FgCyan;
                    break;
                case 4:
                case 5:
                default:
                    color = colors_js_1.default.FgRed;
            }
            let method = tokens.method(req, res);
            return [
                req["_remoteAddress"],
                (method == "GET" ? colors_js_1.default.FgGreen : colors_js_1.default.FgCyan) + method + colors_js_1.default.Reset + (method == "GET" ? " " : ""),
                color + status + colors_js_1.default.Reset,
                tokens.url(req, res).replace(/\//g, colors_js_1.default.Dim + "/" + colors_js_1.default.Reset)
            ].join(' ');
        }
    }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../WEBSERVER/public')));
app.use('/', require(path.join(__dirname, '../WEBSERVER/routes/index')));
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err["status"] = 404;
    next(err);
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = config_js_1.default.loggingVerbosity > 1 ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
exports.default = app;
