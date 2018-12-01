"use strict";
import config from '../SHARED/config.js';
import * as util from "util";
import * as winston from "winston";
import { TimeoutWrapper } from "../BINARYSERVER/timers";
import * as nodemailer from "nodemailer";
import {inspect, serverErrorCounters, printDate, sendEmail, getTimezone} from "../SHARED/misc.js";
import getFullQuery from './FullQuery.js';
import sendQueue from './sendQueue.js';
import binaryServer from './binaryServer.js';
import cleanUp from "./cleanUp.js";
import createLogger from "../SHARED/createLogger.js";
import { connectToDb } from '../SHARED/SQL.js';
import { loggingLevels } from '../SHARED/constants.js';

type MailTransporter = nodemailer.Transporter | {
	sendMail: (...rest: any[]) => void,
	options: {
		host: string
	}
};
declare global {
	namespace NodeJS {
		interface Global {
			transporter: MailTransporter;
		}
	}
	interface Buffer {
		readNullTermString:(string?, start?, end?)=>string;
	}
	interface ObjectConstructor {
		entries:(Object)=>Array<[string, any]>;
		values:(Object)=>any[];
	}
	interface String {
		padStart:(paddingSize:number, padWith?:string)=>string;
		padEnd:  (paddingSize:number, padWith?:string)=>string;
	}
	interface Symbol {
		description:string;
	}
	const transporter:MailTransporter;
	const logger:winston.Logger;
}

function logInitilisation(message:string){
	process.stdout.write(`${new Date().toISOString().replace(/[TZ]*/," ")}${' '.repeat(11)}\x1b[041minit\x1b[000m: ${message}\n`);
}

async function createWinstonLogger(){
	try{
		createLogger(
			config.binaryserverLoggingLevel,
			config.binaryserverLog,
			config.binaryserverErrorLog,
			config.logBinaryserverToConsole,
			loggingLevels.BIN,
		);
	}catch(err){
		logInitilisation(inspect`createWinstonLogger: \x1b[031mfail\x1b[000m`);
		throw(err);
	}
	logInitilisation(inspect`createWinstonLogger: \x1b[032mdone\x1b[000m`);
}
function listenBinaryserver() {
	return new Promise((resolve, reject)=>{
		binaryServer.listen(config.binaryPort, function() {
			logInitilisation(inspect`listenBinaryserver: \x1b[032mdone\x1b[000m`);
			resolve();
		});
	});
}
function startTimeouts(){
	return new Promise((resolve, reject)=>{
		TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		TimeoutWrapper(sendQueue, config.queueSendInterval);
		TimeoutWrapper(cleanUp, config.cleanUpInterval);
		// TimeoutWrapper(updateQueue, config.updateQueueInterval);
		logInitilisation(inspect`startTimeouts: \x1b[032mdone\x1b[000m`);
		resolve();
	});
}
async function connectToDatabase(){
	try{
		await connectToDb();
	}catch(err){
		logInitilisation(inspect`connectToDatabase: \x1b[031mfail\x1b[000m`);
		throw(err);
	}
	logInitilisation(inspect`connectToDatabase: \x1b[032mdone\x1b[000m`);
}
function setupEmailTransport(){
	return new Promise((resolve, reject)=>{
		if (config.eMail.useTestAccount) {
			nodemailer.createTestAccount(function(err, account) {
				if (err) {
					logInitilisation(inspect`setupEmailTransport: \x1b[031mfail\x1b[000m`);
					logger.log('error', inspect`${err}`);
					global.transporter = {
						sendMail: function sendMail() {
							logger.log('error', inspect`can't send mail after Mail error`);
						},
						options: {
							host: "Failed to get test Account",
						},
					};
					reject(err);
				} else {
					logInitilisation(inspect`setupEmailTransport: \x1b[032mdone\x1b[000m`);
					global.transporter = nodemailer.createTransport({
						host: 'smtp.ethereal.email',
						port: 587,
						secure: false, // true for 465, false for other ports
						auth: {
							user: account.user, // generated ethereal user
							pass: account.pass, // generated ethereal password
						},
					});
					resolve();
				}
			});
		} else {
			global.transporter = nodemailer.createTransport(config.eMail.account);
			logInitilisation(inspect`setupEmailTransport: \x1b[032mdone\x1b[000m`);
			resolve();
		}
	});
}

Promise.all([createWinstonLogger(), setupEmailTransport(), connectToDatabase(), startTimeouts(), listenBinaryserver()])
.then(()=>{
	if (config.serverPin == null) logger.log('warning', inspect`Starting in read-only mode!`);
	getFullQuery();
})
.catch(err=>{
	logger.log('error', inspect`error in startup sequence: ${err}`);
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
