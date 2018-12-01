"use strict";

import config from '../SHARED/config.js';
import * as util from "util";
import * as http from "http";
import { inspect, sendEmail, getTimezone, printDate } from "../SHARED/misc.js";

import createLogger from '../SHARED/createLogger.js';
import { connectToDb } from '../SHARED/SQL.js';
import { loggingLevels } from '../SHARED/constants.js';

createLogger(
	config.webserverLoggingLevel,
	config.webserverLog,
	config.webserverErrorLog,
	config.logWebserverToConsole,
	loggingLevels.WEB
);

connectToDb();

import app from './app';

const server = http.createServer(app);

server.on('error', error=>{
	throw error;
});
server.listen(config.webServerPort, ()=>{
	let address = server.address();
	logger.log('warning', `Listening on ${typeof address === "string"?'pipe '+address:'port '+address.port}`);
});

// write uncaught exceptions to all logs
process.on('uncaughtException', async err=>{
	logger.log('error', inspect`uncaught exception ${err}`);
	await sendEmail('uncaughtException', {
		exception: util.inspect(err),
		date: printDate(),
		timeZone: getTimezone(new Date()),
	});
	if(config.exitOnUncaughtException) process.exit(1);
});
