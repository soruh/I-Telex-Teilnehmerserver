"use strict";
//#region imports
import * as util from 'util';
import * as mysql from "mysql";
import * as timers from "../BINARYSERVER/timers.js";
import config from '../COMMONMODULES/config.js';
import {ll, lle} from "../COMMONMODULES/logWithLineNumbers.js";
import colors from "../COMMONMODULES/colors.js";
import * as nodemailer from "nodemailer";
import * as misc from "../BINARYSERVER/misc.js";
import getFullQuery from './FullQuery.js';
import sendQueue from './sendQueue.js';
// import updateQueue from './updateQueue.js';
import binaryServer from './binaryServer.js';

//#endregion

const cv = config.cv;
const readonly = (config.serverPin == null);

if (readonly) ll(`${colors.FgMagenta}Starting in read-only mode!${colors.Reset}`);
colors.disable(config.disableColors);

const mySqlConnectionOptions = config['mySqlConnectionOptions'];





function init() {
	if (cv(0)) ll(colors.FgMagenta + "Initialising!" + colors.Reset);
	binaryServer.listen(config.binaryPort, function () {
		if (cv(0)) ll(colors.FgMagenta + "server is listening on port " + colors.FgCyan + config.binaryPort, colors.Reset);

		timers.TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		// timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
		timers.TimeoutWrapper(sendQueue, config.queueSendInterval);
		getFullQuery();
	});
}

type MailTransporter = nodemailer.Transporter|{
	sendMail: (...rest:any[])=>void,
	options: {
		host: string
	}
}

declare global {
    namespace NodeJS {
      interface Global {
		sqlPool:mysql.Pool;
		transporter:MailTransporter;
      }
    }
  }

global.sqlPool = mysql.createPool(mySqlConnectionOptions);
global.sqlPool.getConnection(function (err, connection) {
	if (err) {
		lle(colors.FgRed, "Could not connect to database!", colors.Reset);
		throw err;
	} else {
		connection.release();
		if (cv(0)) ll(colors.FgMagenta + "Successfully connected to the database!" + colors.Reset);
		if (config.eMail.useTestAccount) {
			nodemailer.createTestAccount(function (err, account) {
				if (err) {
					lle(err);
					global.transporter = {
						sendMail: function sendMail() {
							lle("can't send mail after Mail error");
						},
						options: {
							host: "Failed to get test Account"
						}
					};
				} else {
					if (cv(0)) ll(colors.FgMagenta + "Got email test account:\n" + colors.FgCyan + util.inspect(account) + colors.Reset);
					global.transporter =nodemailer.createTransport({
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

if (cv(3)) {
	let exitHandler = function exitHandler(options, err) {
		if (options.cleanup){
			lle("exited with code: "+err);
			lle(`serverErrors:\n${util.inspect(misc.serverErrors,{depth:null})}`);
		}else{
			lle(err);
		}
		if(options.exit) process.exit(options.code);
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
	process.on('SIGUSR1', exitHandler.bind(null, {
		exit: true,
		code: -3
	}));
	process.on('SIGUSR2', exitHandler.bind(null, {
		exit: true,
		code: -4
	}));
}