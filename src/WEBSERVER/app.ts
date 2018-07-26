"use strict";

import * as express from "express";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as path from "path";
import colors from "../SHARED/colors.js";

import config from '../SHARED/config.js';
import * as winston from "winston";
import { inspect } from "../SHARED/misc.js";
import { Pool } from "mysql";
declare global {
	namespace NodeJS {
		interface Global {
      logger: winston.Logger;
      sqlPool: Pool;
		}
	}
}
{
	let getLoggingLevel = function getLoggingLevel(): string {
		if (typeof config.webserverLoggingLevel === "number") {
			let level = ( < any > Object).entries(winston.config.npm.levels).find(([, value]) => value == config.webserverLoggingLevel);
			if (level) return level[0];
		}
		if (typeof config.webserverLoggingLevel === "string") {
			if (winston.config.npm.levels.hasOwnProperty(config.webserverLoggingLevel))
				return config.webserverLoggingLevel;
		}
		console.log("valid logging levels are:");
		console.log(
			(<any>Object).entries(winston.config.npm.levels)
			.map(([key, value])=>`${value}/${key}${value==3?" - not used":""}`)
			.join("\n")
		);
		
		throw "invalid logging level";
	}
	let resolvePath = function resolvePath(pathToResolve: string): string {
		if (path.isAbsolute(pathToResolve)) return pathToResolve;
		return path.join(path.join(__dirname, "../.."), pathToResolve);
	}
	let transports = [];
	if (config.webserverLog) transports.push(
		new winston.transports.File({
			filename: resolvePath(config.webserverLog)
		})
	);
	if (config.webserverErrorLog) transports.push(
		new winston.transports.File({
			filename: resolvePath(config.webserverErrorLog),
			level: 'error'
		})
	)
	if (config.logWebserverToConsole) transports.push(
		new winston.transports.Console({

		})
	);

	// let getLine = winston.format((info) => {
	// 	let line = new Error().stack.split("\n")[10];
	// 	if(line){
	// 		let file = line.split("(")[1];
	// 		if(file){
	// 			info.line = file.split("/").slice(-1)[0].slice(0, -1);
	// 		}
	// 	}
	// 	info.line = info.line||""
	// 	return info;
	// })();

	let formats = [];
	formats.push(winston.format.timestamp());
	if(!config.disableColors) formats.push(winston.format.colorize())
	// formats.push(getLine),
	let logPadding = config.disableColors?7:17;
	formats.push(winston.format.printf(info=>`${info.timestamp.replace("T"," ").slice(0, -1)} ${(<any>info.level).padStart(logPadding)}: ${info.message}`));
	// formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));

	global.logger = winston.createLogger({
		level: getLoggingLevel(),
		format: winston.format.combine(...formats),
		exitOnError: false,
		transports //: transports
	});
}

const logger = global.logger;
var app = express();

// view engine setup
app.set('views', path.join(__dirname,'../WEBSERVER/views'));
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
app.use((req, res, next)=>{
  let status:string = res.statusCode.toString()||"500";
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
  let message = [
    (<any>req.connection.remoteAddress.replace("::ffff:","")||"UNKNOWN").padEnd(16),
    (
      req.method == "GET" ?
      colors.FgGreen:
      colors.FgCyan
    )+
    (<any>req.method).padEnd(4)+
    colors.Reset,

    color + (<any>status).padEnd(3) + colors.Reset,
    req.url.replace(/\//g, colors.FgLightBlack + "/" + colors.Reset)
  ].join(' ');
  
  if (req.url == "/") {
    logger.info(inspect`${message}`);
  }else{
    logger.verbose(inspect`${message}`);
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
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
  res.locals.error = err;
  logger.error(inspect`${err}`);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;