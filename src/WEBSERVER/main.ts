"use strict";

import config from '../SHARED/config.js';
import * as util from "util";
import * as http from "http";
import { inspect, sendEmail } from "../SHARED/misc.js";

import createLogger from '../SHARED/createLogger.js';
import setupSQLPool from '../SHARED/setupSQLPool.js';
createLogger(
	config.webserverLoggingLevel,
	config.webserverLog,
	config.webserverLog,
	config.logWebserverToConsole,
	{
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
	}
);
setupSQLPool(config.mySqlConnectionOptions);

import app from './app';

const server = http.createServer(app);

server.on('error', error=>{
	throw error;
});
server.listen(config.webServerPort, ()=>{
	logger.log('warning', inspect`Listening on ${server.address()}`);
});

// write uncaught exceptions to all logs
process.on('uncaughtException', async err=>{
	logger.log('error', inspect`uncaught exception ${err}`);
	await sendEmail('uncaughtException', {
		exception: util.inspect(err),
	});
	if(config.exitOnUncaughtException) process.exit(1);
});
