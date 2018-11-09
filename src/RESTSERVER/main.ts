"use strict";

import config from '../SHARED/config.js';
import * as util from "util";
import * as https from "https";
import { inspect, sendEmail, printDate, getTimezone } from "../SHARED/misc.js";
// import { TimeoutWrapper } from "../BINARYSERVER/timers";

import createLogger from '../SHARED/createLogger.js';
import { connectToDb } from '../SHARED/SQL.js';
import { TimeoutWrapper } from '../BINARYSERVER/timers.js';

import getFullQuery from './sync/FullQuery';
import sendQueue from './sync/sendQueue';

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
			"queue": 8,
			"debug": 9,
			"silly": 10,
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
			"queue": "gray",
			"debug": "magenta",
			"silly": 'bold',
		},
	}
);
connectToDb();

TimeoutWrapper(getFullQuery, config.fullQueryInterval);
TimeoutWrapper(sendQueue, config.queueSendInterval);



import app from './app';

const server = https.createServer({
	key: config.RESTKey,
	cert: config.RESTCert,
	
	rejectUnauthorized: true,
	requestCert: config.useClientCertificate,
	ca: [config.RESTCert],
}, app);

server.on('error', error=>{
	throw error;
});

server.listen(config.RESTServerPort, ()=>{
	let address = server.address();
	logger.log('warning', `Listening on ${typeof address === "string"?'pipe '+address:'port '+address.port}`);
});

getFullQuery();
// sendQueue();

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
