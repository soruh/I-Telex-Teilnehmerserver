"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const favicon = require("serve-favicon");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const path = require("path");
const colors_js_1 = require("../SHARED/colors.js");
const config_js_1 = require("../SHARED/config.js");
const misc_js_1 = require("../SHARED/misc.js");
const index_js_1 = require("./routes/index.js");
const logger = global.logger;
global.sqlPool = mysql.createPool(config_js_1.default.mySqlConnectionOptions);
const sqlPool = global.sqlPool;
sqlPool.getConnection(function (err, connection) {
    if (err) {
        logger.log('error', misc_js_1.inspect `could not connect to database!`);
        throw err;
    }
    else {
        logger.log('warning', misc_js_1.inspect `connected to database!`);
        connection.release();
    }
});
let app = express();
// view engine setup
app.set('views', path.join(__dirname, '../WEBSERVER/views'));
app.set('view engine', 'pug');
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
// app.use(morgan('dev'));
// app.use(morgan('tiny'));
// app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))
/*
app.use(morgan(function (tokens, req, res) {
    if (config.cv(2) || tokens.url(req, res) == "/") {
        let status = tokens.status(req, res)||"500";
        let color;
        switch (+status[0]) {
            case 1:
                color = colors.FgYellow;
                break;
            case 2:
                color = colors.FgGreen;
                break;
            case 3:
                color = colors.FgCyan;
                break;
            case 4:
            case 5:
            default:
                color = colors.FgRed;
        }
        let method = tokens.method(req, res);
        return [
            req["_remoteAddress"].padEnd(16),
            (
                method == "GET" ?
                colors.FgGreen:
                colors.FgCyan
            )+
            (<any>method).padEnd(4)+
            colors.Reset,

            color + (<any>status).padEnd(3) + colors.Reset,
            tokens.url(req, res).replace(/\//g, colors.FgLightBlack + "/" + colors.Reset)
        ].join(' ');
    }
}));
*/
app.use((req, res, next) => {
    let status = res.statusCode.toString() || "500";
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
    let message = [
        (req.connection.remoteAddress.replace("::ffff:", "") || "UNKNOWN").padEnd(16),
        (req.method === "GET" ?
            colors_js_1.default.FgGreen :
            colors_js_1.default.FgCyan) +
            req.method.padEnd(4) +
            colors_js_1.default.Reset,
        color + status.padEnd(3) + colors_js_1.default.Reset,
        req.url.replace(/\//g, colors_js_1.default.FgLightBlack + "/" + colors_js_1.default.Reset),
    ].join(' ');
    if (req.url === "/") {
        logger.log('http', misc_js_1.inspect `${message}`);
    }
    else {
        logger.log('verbose http', misc_js_1.inspect `${message}`);
    }
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../WEBSERVER/public')));
app.use('/', index_js_1.default);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err["status"] = 404;
    next(err);
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = err;
    logger.log('error', misc_js_1.inspect `${err}`);
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
exports.default = app;
