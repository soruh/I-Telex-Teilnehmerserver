"use strict";
import colors from "../SHARED/colors.js";
import config from '../SHARED/config.js';
import * as path from "path";
import * as intl from "intl";
import * as mysql from "mysql";
import * as winston from "winston";
import * as timers from "../BINARYSERVER/timers.js";
import * as nodemailer from "nodemailer";
import {inspect, errorCounters} from "../SHARED/misc.js";
import getFullQuery from './FullQuery.js';
import sendQueue from './sendQueue.js';
// import updateQueue from './updateQueue.js';
import binaryServer from './binaryServer.js';
import cleanUp from "./cleanUp.js";

type MailTransporter = nodemailer.Transporter | {
	sendMail: (...rest: any[]) => void,
	options: {
		host: string
	}
}
declare global {
	namespace NodeJS {
		interface Global {
			sqlPool: mysql.Pool;
			transporter: MailTransporter;
			logger: winston.Logger;
		}
	}
	interface Buffer {
		readNullTermString:(string?, start?, end?)=>string;
	}
	interface ObjectConstructor {
		entries:(Object)=>Array<[string, any]>;
		values:(Object)=>Array<any>;
	}
	interface String {
		padStart:(paddingSize:number, padWith?:string)=>string;
		padEnd:  (paddingSize:number, padWith?:string)=>string;
	}
	const sqlPool:mysql.Pool;
	const transporter:MailTransporter;
	const logger:winston.Logger;
}

colors.disable(config.disableColors);
const readonly = (config.serverPin == null);
if (readonly) logger.log('warning', inspect`Starting in read-only mode!`);

global.sqlPool = mysql.createPool(config.mySqlConnectionOptions);

function createLogger(){
	return new Promise((resolve, reject)=>{
		var customLevels = {
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
			}
		}
		// let customLevels = winston.config.npm;
		var getLoggingLevel = function getLoggingLevel(): string {
			if (typeof config.binaryserverLoggingLevel === "number") {
				let level = Object.entries(customLevels.levels).find(([, value]) => value == config.binaryserverLoggingLevel);
				if (level) return level[0];
			}
			if (typeof config.binaryserverLoggingLevel === "string") {
				if (customLevels.levels.hasOwnProperty(config.binaryserverLoggingLevel))
					return config.binaryserverLoggingLevel;
			}
			console.log("valid logging levels are:");
			console.log(
				Object.entries(customLevels.levels)
				.map(([key, value])=>`${value}/${key}`)
				.join("\n")
			);
			
			throw "invalid logging level";
		}
		var resolvePath = function resolvePath(pathToResolve: string): string {
			if (path.isAbsolute(pathToResolve)) return pathToResolve;
			return path.join(path.join(__dirname, "../.."), pathToResolve);
		}
		var transports = [];
		if (config.binaryserverLog) transports.push(
			new winston.transports.File({
				filename: resolvePath(config.binaryserverLog)
			})
		);
		if (config.binaryserverErrorLog) transports.push(
			new winston.transports.File({
				filename: resolvePath(config.binaryserverErrorLog),
				level: 'error'
			})
		)
		if (config.logBinaryserverToConsole) transports.push(
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

		var formats = [];

		if(config.logDate) formats.push(winston.format.timestamp());
		if(!config.disableColors) formats.push(winston.format.colorize())
		// formats.push(getLine),
		var levelPadding = Math.max(...Object.keys(customLevels.colors).map(x=>x.length));
		formats.push(winston.format.printf(info=>
			`${
				config.logDate?(info.timestamp.replace("T"," ").replace("Z"," ")):""
			}${
				" ".repeat(levelPadding-info.level.replace(/\u001b\[\d{1,3}m/g,"").length)
			}${
				info.level
			}: ${
				info.message
			}`)
		);
		// formats.push(winston.format.printf(info => `${info.timestamp} ${info.level.padStart(17)} ${info.line}: ${info.message}`));

		winston.addColors(customLevels.colors);
		global.logger = winston.createLogger({
			// exceptionHandlers: transports,
			level: getLoggingLevel(),
			levels:customLevels.levels,
			format: winston.format.combine(...formats),
			transports //: transports
		});
		resolve();
	});
}
function listenBinaryserver() {
	return new Promise((resolve, reject)=>{
		process.stdout.write(inspect`listen on port ${config.binaryPort}... `);
		binaryServer.listen(config.binaryPort, function () {
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
function connectToDatabase(){
	return new Promise((resolve, reject)=>{
		process.stdout.write(inspect`connecting to database... `);
		global.sqlPool.getConnection(function (err, connection) {
			if (err) {
				process.stdout.write(inspect`fail\n`);
				logger.log('error', inspect`${err}`);
				reject(err);
			} else {
				connection.release();
				process.stdout.write(inspect`done\n`);
				resolve();
			}
		});
	});
}
function setupEmailTransport(){
	return new Promise((resolve, reject)=>{
		process.stdout.write(inspect`setting up email transporter... `);
		if (config.eMail.useTestAccount) {
			process.stdout.write(inspect`\n  getting test account... `);
			nodemailer.createTestAccount(function (err, account) {
				if (err) {
					process.stdout.write(inspect`fail\n`);
					logger.log('error', inspect`${err}`);
					global.transporter = {
						sendMail: function sendMail() {
							logger.log('error', inspect`can't send mail after Mail error`);
						},
						options: {
							host: "Failed to get test Account"
						}
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
							pass: account.pass // generated ethereal password
						}
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

createLogger()
.then(setupEmailTransport)
.then(connectToDatabase)
.then(startTimeouts)
.then(listenBinaryserver)
.then(getFullQuery)
.catch(err=>{
	logger.log('error', inspect`error in initialisation: ${err}`)
});

//write uncaught exceptions to all logs
process.on('uncaughtException', err=>{
	logger.log('error', inspect`uncaught exception ${err}`);
	process.exit();
});