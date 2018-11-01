"use strict";

import config from '../SHARED/config.js';
import * as util from "util";
import * as http from "http";
import { inspect, sendEmail } from "../SHARED/misc.js";

import createLogger from '../SHARED/createLogger.js';
import { connectToDb } from '../SHARED/SQL.js';
createLogger(
	config.RESTserverLoggingLevel,
	config.RESTserverLog,
	config.RESTserverErrorLog,
	config.logRESTserverToConsole,
	{
		levels:{
			"error": 0,
			"warning": 1,
			"admin": 2,
			"private": 3,
			"public": 4,			
			"others": 5,
			"sql": 6,
			"verbose sql": 7,
			"debug": 8,
			"silly":9,
		},
		colors:{
			"error": "red",
			"warning": "yellow",
			"admin": "magenta",
			"private": "blue",
			"public": "green",
			"others": "gray",
			"sql": "cyan",
			"verbose sql": "cyan",
			"debug": "bold",
		},
	}
);
connectToDb();

import app from './app';

const server = http.createServer(app);

server.on('error', error=>{
	throw error;
});

server.listen(config.RESTServerPort, ()=>{
	let address = server.address();
	logger.log('warning', `Listening on ${typeof address === "string"?'pipe '+address:'port '+address.port}`);
});

// write uncaught exceptions to all logs
process.on('uncaughtException', async err=>{
	logger.log('error', inspect`uncaught exception ${err}`);
	await sendEmail('uncaughtException', {
		exception: util.inspect(err),
	});
	if(config.exitOnUncaughtException) process.exit(1);
});
