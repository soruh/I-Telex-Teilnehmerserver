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

const logger = global.logger;

import app from './app';
import * as http from "http";

const port = normalizePort(config.webServerPort.toString());
app.set('port', port);

const server = http.createServer(app);

server.on('error', onError);
server.listen(port, onListening);

function normalizePort(val) {
	const port = parseInt(val, 10);
	
	if (isNaN(port))  return val;
	if (port >= 0) return port;
	return false;
}

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	const bind = typeof port === 'string' ?
		'Pipe ' + port :
		'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			logger.log('error', `${bind} requires elevated privileges`);
			process.exit(1);
			break;
		case 'EADDRINUSE':
			logger.log('error', `${bind} is already in use`);
			process.exit(1);
			break;
		default:
			throw error;
	}
}


function onListening() {
	const addr = server.address();
	const bind = typeof addr === 'string' ?
		`pipe ${addr}` :
		`port ${addr.port}`;
	logger.log('warning','Listening on ' + bind);
}
