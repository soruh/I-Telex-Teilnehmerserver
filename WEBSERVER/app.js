"use strict";
const path = require('path');
const PWD = path.normalize(path.join(__dirname, '..'));
const express = require('express');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const colors = require(path.join(PWD, '/COMMONMODULES/colors.js'));
const config = require(path.join(PWD, '/COMMONMODULES/config.js'));


var app = express();

// view engine setup
app.set('views', path.join(PWD, '/WEBSERVER/views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//app.use(logger('dev'));
// app.use(logger('tiny'));
// app.use(logger(':method :url :status :res[content-length] - :response-time ms'))
if (config.get("loggingVerbosity") > 0) app.use(logger(function (tokens, req, res) {
  if (config.get("loggingVerbosity") > 1 || tokens.url(req, res) == "/") {
    let status = tokens.status(req, res);
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
      req._remoteAddress,
      (method == "GET" ? colors.FgGreen : colors.FgCyan) + method + colors.Reset + (method == "GET" ? " " : ""),
      color + status + colors.Reset,
      tokens.url(req, res).replace(/\//g, colors.Dim + "/" + colors.Reset)
    ].join(' ');
  }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(PWD, '/WEBSERVER/public')));

app.use('/', require(path.join(PWD, '/WEBSERVER/routes/index')));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = config.get("loggingVerbosity") > 1 ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;