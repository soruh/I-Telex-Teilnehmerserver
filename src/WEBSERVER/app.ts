"use strict";

import * as winston from "winston";
import config from '../SHARED/config.js';
import * as path from "path";
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
	let customLevels = {
		levels:{
			"error": 0,
			"warning": 1,
			"sql": 2,
			"http": 3,			
			"verbose sql": 4,
			"verbose http": 5,
			"debug": 6,
			"silly":7,
		},
		colors:{
			"error": "red",
			"warning": "yellow",
			"sql": "green",
			"http": "cyan",
			"verbose sql": "green",
			"verbose http": "blue",
			"debug": "magenta",
			"silly": "bold",
		},
	};
	let getLoggingLevel = ():string => {
		if (typeof config.webserverLoggingLevel === "number") {
			let level = ( Object as any).entries(customLevels.levels).find(([, value]) => value === config.webserverLoggingLevel);
			if (level) return level[0];
		}
		if (typeof config.webserverLoggingLevel === "string") {
			if (customLevels.levels.hasOwnProperty(config.webserverLoggingLevel))
				return config.webserverLoggingLevel;
		}
		// tslint:disable:no-console
		console.log("valid logging levels are:");
		console.log(
			(Object as any).entries(customLevels.levels)
			.map(([key, value])=>`${value}/${key}`)
			.join("\n")
		);
		// tslint:enable:no-console

		throw new Error("invalid logging level");
	};
	let resolvePath = (pathToResolve: string): string => {
		if (path.isAbsolute(pathToResolve)) return pathToResolve;
		return path.join(path.join(__dirname, "../.."), pathToResolve);
	};
	let transports = [];
	if (config.webserverLog) transports.push(
		new winston.transports.File({
			filename: resolvePath(config.webserverLog),
		})
	);
	if (config.webserverErrorLog) transports.push(
		new winston.transports.File({
			filename: resolvePath(config.webserverErrorLog),
			level: 'error',
		})
	);
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
	if(config.logDate) formats.push(winston.format.timestamp());
	if(!config.disableColors) formats.push(winston.format.colorize());
	// formats.push(getLine),
	let logPadding = config.disableColors?12:22;
	formats.push(winston.format.printf(info=>`${config.logDate?(info.timestamp.replace("T"," ").slice(0, -1)+" "):""}${(info.level as any).padStart(logPadding)}: ${info.message}`));
	// formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));

	winston.addColors(customLevels.colors);
	global.logger = winston.createLogger({
		level: getLoggingLevel(),
		levels: customLevels.levels,
		format: winston.format.combine(...formats),
		exitOnError: false,
		transports, // : transports
	});
}

import * as express from "express";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";


import colors from "../SHARED/colors.js";

import { inspect } from "../SHARED/misc.js";
import index from "./routes/index.js";

const logger = global.logger;

let app = express();

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
		(req.connection.remoteAddress.replace("::ffff:","") as any||"UNKNOWN").padEnd(16),
		(
			req.method === "GET" ?
			colors.FgGreen:
			colors.FgCyan
		)+
		(req.method as any).padEnd(4)+
		colors.Reset,

		color + (status as any).padEnd(3) + colors.Reset,
		req.url.replace(/\//g, colors.FgLightBlack + "/" + colors.Reset),
	].join(' ');
	
	if (req.url === "/") {
		logger.log('http', inspect`${message}`);
	}else{
		logger.log('verbose http', inspect`${message}`);
	}
	next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../WEBSERVER/public')));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	let err = new Error('Not Found');
	err["status"] = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development

	res.locals.message = err.message;
	res.locals.error = err;
	logger.log('error', inspect`${err}`);

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

export default app;
