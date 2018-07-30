"use strict";

import * as path from "path";
import * as intl from "intl";
import * as mysql from "mysql";
import * as winston from "winston";
import config from '../SHARED/config.js';

declare global {
	namespace NodeJS {
		interface Global {
			sqlPool: mysql.Pool;
			transporter: MailTransporter;
			logger: winston.Logger;
		}
	}
}

{
	let getLoggingLevel = function getLoggingLevel(): string {
		if (typeof config.binaryserverLoggingLevel === "number") {
			let level = ( < any > Object).entries(winston.config.npm.levels).find(([, value]) => value == config.binaryserverLoggingLevel);
			if (level) return level[0];
		}
		if (typeof config.binaryserverLoggingLevel === "string") {
			if (winston.config.npm.levels.hasOwnProperty(config.binaryserverLoggingLevel))
				return config.binaryserverLoggingLevel;
		}
		console.log("valid logging levels are:");
		console.log(
			(<any>Object).entries(winston.config.npm.levels)
			.map(([key, value])=>`${value}/${key}${value==3?" - not used":""}`)
			.join("\n")
		);
		
		throw "invalid logging level";
	}
	let resolvePath = function resolvePath(pathToResolve: string): string {
		if (path.isAbsolute(pathToResolve)) return pathToResolve;
		return path.join(path.join(__dirname, "../.."), pathToResolve);
	}
	let transports = [];
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

	let formats = [];
	if(config.logDate) formats.push(winston.format.timestamp());
	if(!config.disableColors) formats.push(winston.format.colorize())
	// formats.push(getLine),
	let logPadding = config.disableColors?7:17;
	formats.push(winston.format.printf(info=>`${config.logDate?(info.timestamp.replace("T"," ").slice(0, -1)+" "):""}${(<any>info.level).padStart(logPadding)}: ${info.message}`));
	// formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));

	global.logger = winston.createLogger({
		level: getLoggingLevel(),
		format: winston.format.combine(...formats),
		exitOnError: false,
		transports //: transports
	});
}

import * as timers from "../BINARYSERVER/timers.js";
import colors from "../SHARED/colors.js";
import * as nodemailer from "nodemailer";
import {inspect, errorCounters} from "../SHARED/misc.js";
import getFullQuery from './FullQuery.js';
import sendQueue from './sendQueue.js';
// import updateQueue from './updateQueue.js';
import binaryServer from './binaryServer.js';
import cleanUp from "./cleanUp.js";

const logger = global.logger;

const readonly = (config.serverPin == null);

if (readonly) logger.warn(inspect`Starting in read-only mode!`);
colors.disable(config.disableColors);

const mySqlConnectionOptions = config['mySqlConnectionOptions'];

function init() {
	logger.warn(inspect`Initialising!`);
	binaryServer.listen(config.binaryPort, function () {
		logger.warn(inspect`server is listening on port ${config.binaryPort}`);

		timers.TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		// timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
		timers.TimeoutWrapper(sendQueue, config.queueSendInterval);
		timers.TimeoutWrapper(cleanUp, config.cleanUpInterval);
		getFullQuery();
	});
}

type MailTransporter = nodemailer.Transporter | {
	sendMail: (...rest: any[]) => void,
	options: {
		host: string
	}
}

global.sqlPool = mysql.createPool(mySqlConnectionOptions);
global.sqlPool.getConnection(function (err, connection) {
	if (err) {
		logger.error(inspect`Could not connect to database!`);
		throw err;
	} else {
		connection.release();
		logger.warn(inspect`Successfully connected to the database!`);
		if (config.eMail.useTestAccount) {
			nodemailer.createTestAccount(function (err, account) {
				if (err) {
					logger.error(inspect`${err}`);
					global.transporter = {
						sendMail: function sendMail() {
							logger.error(inspect`can't send mail after Mail error`);
						},
						options: {
							host: "Failed to get test Account"
						}
					};
				} else {
					logger.warn(inspect`Got email test account:\n${account}`);
					global.transporter = nodemailer.createTransport({
						host: 'smtp.ethereal.email',
						port: 587,
						secure: false, // true for 465, false for other ports
						auth: {
							user: account.user, // generated ethereal user
							pass: account.pass // generated ethereal password
						}
					});
				}
				init();
			});
		} else {
			global.transporter = nodemailer.createTransport(config.eMail.account);
			init();
		}
	}
});
