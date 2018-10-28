"use strict";

import config from '../SHARED/config.js';
import * as util from "util";
import * as http from "http";
import { inspect, sendEmail } from "../SHARED/misc.js";

import createLogger from '../SHARED/createLogger.js';
import setupSQLPool from '../SHARED/setupSQLPool.js';
createLogger(
	config.RESTserverLoggingLevel,
	config.RESTserverLog,
	config.RESTserverErrorLog,
	config.logRESTserverToConsole,
	{
		levels:{
			"error": 0,
			"warning": 1,
			"others": 2,
			"public": 3,			
			"private": 4,
			"sql": 5,
			"verbose sql": 6,
			"debug": 7,
			"silly":8,
		},
		colors:{
			"error": "red",
			"warning": "yellow",
			"others": 'gray',
			"public": 'green',			
			"private": 'blue',
			"sql": 'cyan',
			"verbose sql": "cyan",
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
