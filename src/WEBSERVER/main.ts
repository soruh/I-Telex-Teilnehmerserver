"use strict";

import * as winston from "winston";
import config from '../SHARED/config.js';
import * as path from "path";
import { Pool } from "mysql";
import * as http from "http";
import { inspect } from "../SHARED/misc.js";

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
			let level = Object.entries(customLevels.levels).find(([, value]) => value === config.webserverLoggingLevel);
			if (level) return level[0];
		}
		if (typeof config.webserverLoggingLevel === "string") {
			if (customLevels.levels.hasOwnProperty(config.webserverLoggingLevel))
				return config.webserverLoggingLevel;
		}
		// tslint:disable:no-console
		console.log("valid logging levels are:");
		console.log(
			Object .entries(customLevels.levels)
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
	formats.push(winston.format.printf(info=>`${config.logDate?(info.timestamp.replace("T"," ").slice(0, -1)+" "):""}${info.level.padStart(logPadding)}: ${info.message}`));
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

const server = http.createServer(app);

server.on('error', error=>{
	throw error;
});
server.listen(config.webServerPort, ()=>{
	logger.log('warning', inspect`Listening on ${server.address()}`);
});
