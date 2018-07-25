"use strict";
import * as path from "path";
import * as util from 'util';
import * as mysql from "mysql";
import * as winston from "winston";
import config from '../COMMONMODULES/config.js';

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
		if (typeof config.loggingVerbosity === "number") {
			let level = ( < any > Object).entries(winston.config.npm.levels).find(([, value]) => value == config.loggingVerbosity);
			if (level) return level[0];
		}
		if (typeof config.loggingVerbosity === "string") {
			if (winston.config.npm.levels.hasOwnProperty(config.loggingVerbosity))
				return config.loggingVerbosity;
		}
		console.log("valid logging levels are:");
		console.log(
			(<any>Object).entries(winston.config.npm.levels)
			.map(([key, value])=>`${value}/${key}`)
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
	formats.push(winston.format.timestamp());
	if(!config.disableColors) formats.push(winston.format.colorize())
	// formats.push(getLine),
	let logPadding = config.disableColors?7:17;
	formats.push(winston.format.printf(info=>`${info.timestamp.replace("T"," ").slice(0, -1)} ${(<any>info.level).padStart(logPadding)}: ${info.message}`));
	// formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));

	global.logger = winston.createLogger({
		level: getLoggingLevel(),
		format: winston.format.combine(...formats),
		exitOnError: false,
		transports //: transports
	});
}

//#region imports
import * as timers from "../BINARYSERVER/timers.js";
import colors from "../COMMONMODULES/colors.js";
import * as nodemailer from "nodemailer";
import * as misc from "../BINARYSERVER/misc.js";
import getFullQuery from './FullQuery.js';
import sendQueue from './sendQueue.js';
// import updateQueue from './updateQueue.js';
import binaryServer from './binaryServer.js';
//#endregion

const logger = global.logger;

const readonly = (config.serverPin == null);

if (readonly) logger.warn(`${colors.FgMagenta}Starting in read-only mode!${colors.Reset}`);
colors.disable(config.disableColors);

const mySqlConnectionOptions = config['mySqlConnectionOptions'];

function init() {
	logger.warn(colors.FgMagenta + "Initialising!" + colors.Reset);
	binaryServer.listen(config.binaryPort, function () {
		logger.warn(colors.FgMagenta + "server is listening on port " + colors.FgCyan + config.binaryPort + colors.Reset);

		timers.TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		// timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
		timers.TimeoutWrapper(sendQueue, config.queueSendInterval);
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
		logger.error(colors.FgRed + "Could not connect to database!" + colors.Reset);
		throw err;
	} else {
		connection.release();
		logger.warn(colors.FgMagenta + "Successfully connected to the database!" + colors.Reset);
		if (config.eMail.useTestAccount) {
			nodemailer.createTestAccount(function (err, account) {
				if (err) {
					logger.error(err);
					global.transporter = {
						sendMail: function sendMail() {
							logger.error("can't send mail after Mail error");
						},
						options: {
							host: "Failed to get test Account"
						}
					};
				} else {
					logger.warn(colors.FgMagenta + "Got email test account:\n" + colors.FgCyan + util.inspect(account) + colors.Reset);
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

if (config.printServerErrorsOnExit) {
	let exitHandler = function exitHandler(options, err) {
		if (options.cleanup) {
			logger.error("exited with code: " + err);
			logger.error(`serverErrors:\n${util.inspect(misc.errorCounters)}`);
		} else {
			logger.error(util.inspect(err));
		}
		if (options.exit) process.exit(options.code);
	};
	process.on('exit', exitHandler.bind(null, {
		cleanup: true
	}));
	process.on('SIGINT', exitHandler.bind(null, {
		exit: true,
		code: -1
	}));
	process.on('uncaughtException', exitHandler.bind(null, {
		exit: true,
		code: -2
	}));
	// process.on('SIGUSR1', exitHandler.bind(null, {
	// 	exit: true,
	// 	code: -3
	// }));
	// process.on('SIGUSR2', exitHandler.bind(null, {
	// 	exit: true,
	// 	code: -4
	// }));
}