"use strict";

import config from '../shared/config.js';
import * as util from "util";
import * as https from "https";
import { inspect, sendEmail, printDate, getTimezone } from "../shared/misc.js";
// import { TimeoutWrapper } from "../binaryserver/timers";

import createLogger from '../shared/createLogger.js';
import { connectToDb } from '../shared/SQL.js';
import { TimeoutWrapper } from '../shared/timers.js';

import getFullQuery from './sync/FullQuery';
import sendQueue from './sync/sendQueue';
import { loggingLevels } from '../shared/constants.js';

import * as nodemailer from "nodemailer";


createLogger(
	config.RESTserverLoggingLevel,
	config.RESTserverLog,
	config.RESTserverErrorLog,
	config.logRESTserverToConsole,
	loggingLevels.REST
);
connectToDb();


if (config.eMail.useTestAccount) {
	nodemailer.createTestAccount(function (err, account) {
		if (err) {
			logger.log('error', inspect`${err}`);
			global.transporter = {
				sendMail: function sendMail() {
					logger.log('error', inspect`can't send mail after Mail error`);
				},
				options: {
					host: "Failed to get test Account",
				},
			};
		} else {
			global.transporter = nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false, // true for 465, false for other ports
				auth: {
					user: account.user, // generated ethereal user
					pass: account.pass, // generated ethereal password
				},
			});
		}
	});
} else {
	global.transporter = nodemailer.createTransport(config.eMail.account);
}


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

server.on('error', error => {
	throw error;
});

server.listen(config.RESTServerPort, () => {
	let address = server.address();
	logger.log('warning', `Listening on ${typeof address === "string" ? 'pipe ' + address : 'port ' + address.port}`);
});

getFullQuery();
// sendQueue();

// write uncaught exceptions to all logs
process.on('uncaughtException', async err => {
	logger.log('error', inspect`uncaught exception ${err}`);
	await sendEmail('uncaughtException', {
		exception: util.inspect(err),
		date: printDate(),
		timeZone: getTimezone(new Date()),
	});
	if (config.exitOnUncaughtException) process.exit(1);
});
