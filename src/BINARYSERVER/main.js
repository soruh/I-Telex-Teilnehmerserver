"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const util = require("util");
const mysql = require("mysql");
const winston = require("winston");
const config_js_1 = require("../COMMONMODULES/config.js");
{
    let getLoggingLevel = function getLoggingLevel() {
        if (typeof config_js_1.default.loggingVerbosity === "number") {
            let level = Object.entries(winston.config.npm.levels).find(([, value]) => value == config_js_1.default.loggingVerbosity);
            if (level)
                return level[0];
        }
        if (typeof config_js_1.default.loggingVerbosity === "string") {
            if (winston.config.npm.levels.hasOwnProperty(config_js_1.default.loggingVerbosity))
                return config_js_1.default.loggingVerbosity;
        }
        console.log("valid logging levels are:");
        console.log(Object.entries(winston.config.npm.levels)
            .map(([key, value]) => `${value}/${key}`)
            .join("\n"));
        throw "invalid logging level";
    };
    let resolvePath = function resolvePath(pathToResolve) {
        if (path.isAbsolute(pathToResolve))
            return pathToResolve;
        return path.join(path.join(__dirname, "../.."), pathToResolve);
    };
    let transports = [];
    if (config_js_1.default.binaryserverLog)
        transports.push(new winston.transports.File({
            filename: resolvePath(config_js_1.default.binaryserverLog)
        }));
    if (config_js_1.default.binaryserverErrorLog)
        transports.push(new winston.transports.File({
            filename: resolvePath(config_js_1.default.binaryserverErrorLog),
            level: 'error'
        }));
    if (config_js_1.default.logBinaryserverToConsole)
        transports.push(new winston.transports.Console({}));
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
    if (!config_js_1.default.disableColors)
        formats.push(winston.format.colorize());
    // formats.push(getLine),
    let logPadding = config_js_1.default.disableColors ? 7 : 17;
    formats.push(winston.format.printf(info => `${info.timestamp.replace("T", " ").slice(0, -1)} ${info.level.padStart(logPadding)}: ${info.message}`));
    // formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));
    global.logger = winston.createLogger({
        level: getLoggingLevel(),
        format: winston.format.combine(...formats),
        exitOnError: false,
        transports //: transports
    });
}
//#region imports
const timers = require("../BINARYSERVER/timers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const nodemailer = require("nodemailer");
const misc = require("../BINARYSERVER/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
// import updateQueue from './updateQueue.js';
const binaryServer_js_1 = require("./binaryServer.js");
//#endregion
const logger = global.logger;
const readonly = (config_js_1.default.serverPin == null);
if (readonly)
    logger.warn(`${colors_js_1.default.FgMagenta}Starting in read-only mode!${colors_js_1.default.Reset}`);
colors_js_1.default.disable(config_js_1.default.disableColors);
const mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
function init() {
    logger.warn(colors_js_1.default.FgMagenta + "Initialising!" + colors_js_1.default.Reset);
    binaryServer_js_1.default.listen(config_js_1.default.binaryPort, function () {
        logger.warn(colors_js_1.default.FgMagenta + "server is listening on port " + colors_js_1.default.FgCyan + config_js_1.default.binaryPort + colors_js_1.default.Reset);
        timers.TimeoutWrapper(FullQuery_js_1.default, config_js_1.default.fullQueryInterval);
        // timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
        timers.TimeoutWrapper(sendQueue_js_1.default, config_js_1.default.queueSendInterval);
        FullQuery_js_1.default();
    });
}
global.sqlPool = mysql.createPool(mySqlConnectionOptions);
global.sqlPool.getConnection(function (err, connection) {
    if (err) {
        logger.error(colors_js_1.default.FgRed + "Could not connect to database!" + colors_js_1.default.Reset);
        throw err;
    }
    else {
        connection.release();
        logger.warn(colors_js_1.default.FgMagenta + "Successfully connected to the database!" + colors_js_1.default.Reset);
        if (config_js_1.default.eMail.useTestAccount) {
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
                }
                else {
                    logger.warn(colors_js_1.default.FgMagenta + "Got email test account:\n" + colors_js_1.default.FgCyan + util.inspect(account) + colors_js_1.default.Reset);
                    global.transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false,
                        auth: {
                            user: account.user,
                            pass: account.pass // generated ethereal password
                        }
                    });
                }
                init();
            });
        }
        else {
            global.transporter = nodemailer.createTransport(config_js_1.default.eMail.account);
            init();
        }
    }
});
if (config_js_1.default.printServerErrorsOnExit) {
    let exitHandler = function exitHandler(options, err) {
        if (options.cleanup) {
            logger.error("exited with code: " + err);
            logger.error(`serverErrors:\n${util.inspect(misc.errorCounters)}`);
        }
        else {
            logger.error(util.inspect(err));
        }
        if (options.exit)
            process.exit(options.code);
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
