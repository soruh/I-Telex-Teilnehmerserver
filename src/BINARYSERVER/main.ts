"use strict";
import config from '../SHARED/config.js';
import * as util from "util";
import * as mysql from "mysql";
import * as winston from "winston";
import * as timers from "../BINARYSERVER/timers.js";
import * as nodemailer from "nodemailer";
import {inspect, sendEmail} from "../SHARED/misc.js";
import getFullQuery from './FullQuery.js';
import sendQueue from './sendQueue.js';
import binaryServer from './binaryServer.js';
import cleanUp from "./cleanUp.js";
import createLogger from "../SHARED/createLogger.js";
import setupSQLPool from '../SHARED/setupSQLPool.js';

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
	const sqlPool:mysql.Pool;
	const transporter:MailTransporter;
	const logger:winston.Logger;
}

async function createWinstonLogger(){
	process.stdout.write(inspect`creating logger... `);
	try{
		createLogger(
			config.binaryserverLoggingLevel,
			config.binaryserverLog,
			config.binaryserverErrorLog,
			config.logBinaryserverToConsole,
			{
				levels:{
					"error": 0,
					"warning": 1,
					"sql": 2,
					"network": 3,			
					"verbose sql": 4,
					"verbose network": 5,
					"debug": 6,
					"queue": 7,
					"iTelexCom": 8,
					"silly":9,
				},
				colors:{
					"error": "red",
					"warning": "yellow",
					"sql": "green",
					"network": "cyan",
					"verbose sql": "green",
					"verbose network": "blue",
					"debug": "magenta",
					"queue": "gray",
					"iTelexCom": "underline",
					"silly": "bold",
				},
			}
		);
	}catch(err){
		process.stdout.write(inspect`fail\n`);
		throw(err);
	}
	process.stdout.write(inspect`done\n`);
}
function listenBinaryserver() {
	return new Promise((resolve, reject)=>{
		process.stdout.write(inspect`listen on port ${config.binaryPort}... `);
		binaryServer.listen(config.binaryPort, function() {
			process.stdout.write(inspect`done\n`);
			resolve();
		});
	});
}
function startTimeouts(){
	return new Promise((resolve, reject)=>{
		process.stdout.write(inspect`starting timeouts... `);
		timers.TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		timers.TimeoutWrapper(sendQueue, config.queueSendInterval);
		timers.TimeoutWrapper(cleanUp, config.cleanUpInterval);
		// timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
		process.stdout.write(inspect`done\n`);
		resolve();
	});
}
async function connectToDatabase(){
	process.stdout.write(inspect`connecting to database... `);
	try{
		await setupSQLPool(config.mySqlConnectionOptions);
	}catch(err){
		process.stdout.write(inspect`fail\n`);
		throw(err);
	}
	process.stdout.write(inspect`done\n`);
}
function setupEmailTransport(){
	return new Promise((resolve, reject)=>{
		process.stdout.write(inspect`setting up email transporter... `);
		if (config.eMail.useTestAccount) {
			process.stdout.write(inspect`\n  getting test account... `);
			nodemailer.createTestAccount(function(err, account) {
				if (err) {
					process.stdout.write(inspect`fail\n`);
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
					process.stdout.write(inspect`done\n`);
					process.stdout.write(inspect`  got test account:\n`+Object.entries(account).map(([key,value])=>inspect`     ${key}: ${value}`).join('\n')+'\n');
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
			process.stdout.write(inspect`done\n`);
			resolve();
		}
	});
}

createWinstonLogger()
.then(setupEmailTransport)
.then(connectToDatabase)
.then(startTimeouts)
.then(listenBinaryserver)
.then(()=>{
	const readonly = (config.serverPin == null);
	if (readonly) logger.log('warning', inspect`Starting in read-only mode!`);
})
.then(getFullQuery)
.catch(err=>{
	logger.log('error', inspect`error in startup sequence: ${err}`);
});

// write uncaught exceptions to all logs
process.on('uncaughtException', async err=>{
	logger.log('error', inspect`uncaught exception ${err}`);
	await sendEmail('uncaughtException', {
		exception: util.inspect(err),
	});
	if(config.exitOnUncaughtException) process.exit(1);
});
