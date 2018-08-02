"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const mysql = require("mysql");
const winston = require("winston");
const config_js_1 = require("../SHARED/config.js");
{
    let customLevels = {
        levels: {
            "error": 0,
            "warning": 1,
            "sql": 2,
            "network": 3,
            "verbose sql": 4,
            "verbose network": 5,
            "debug": 6,
            "iTelexCom": 7,
            "silly": 8,
        },
        colors: {
            "error": "red",
            "warning": "yellow",
            "sql": "green",
            "network": "cyan",
            "verbose sql": "green",
            "verbose network": "blue",
            "debug": "magenta",
            "iTelexCom": "underline",
            "silly": "bold",
        }
    };
    // let customLevels = winston.config.npm;
    let getLoggingLevel = function getLoggingLevel() {
        if (typeof config_js_1.default.binaryserverLoggingLevel === "number") {
            let level = Object.entries(customLevels.levels).find(([, value]) => value == config_js_1.default.binaryserverLoggingLevel);
            if (level)
                return level[0];
        }
        if (typeof config_js_1.default.binaryserverLoggingLevel === "string") {
            if (customLevels.levels.hasOwnProperty(config_js_1.default.binaryserverLoggingLevel))
                return config_js_1.default.binaryserverLoggingLevel;
        }
        console.log("valid logging levels are:");
        console.log(Object.entries(customLevels.levels)
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
    if (config_js_1.default.logDate)
        formats.push(winston.format.timestamp());
    if (!config_js_1.default.disableColors)
        formats.push(winston.format.colorize());
    // formats.push(getLine),
    let levelPadding = Math.max(...Object.keys(customLevels.colors).map(x => x.length));
    formats.push(winston.format.printf(info => `${config_js_1.default.logDate ? (info.timestamp.replace("T", " ").replace("Z", " ")) : ""}${" ".repeat(levelPadding - info.level.replace(/\u001b\[\d{1,3}m/g, "").length)}${info.level}: ${info.message}`));
    // formats.push(winston.format.printf(info => `${info.timestamp} ${info.level.padStart(17)} ${info.line}: ${info.message}`));
    winston.addColors(customLevels.colors);
    global.logger = winston.createLogger({
        // exceptionHandlers: transports,
        level: getLoggingLevel(),
        levels: customLevels.levels,
        format: winston.format.combine(...formats),
        transports //: transports
    });
}
const timers = require("../BINARYSERVER/timers.js");
const colors_js_1 = require("../SHARED/colors.js");
const nodemailer = require("nodemailer");
const misc_js_1 = require("../SHARED/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
// import updateQueue from './updateQueue.js';
const binaryServer_js_1 = require("./binaryServer.js");
const cleanUp_js_1 = require("./cleanUp.js");
const readonly = (config_js_1.default.serverPin == null);
if (readonly)
    logger.log('warning', misc_js_1.inspect `Starting in read-only mode!`);
colors_js_1.default.disable(config_js_1.default.disableColors);
const mySqlConnectionOptions = config_js_1.default.mySqlConnectionOptions;
function init() {
    logger.log('warning', misc_js_1.inspect `Initialising!`);
    binaryServer_js_1.default.listen(config_js_1.default.binaryPort, function () {
        logger.log('warning', misc_js_1.inspect `server is listening on port ${config_js_1.default.binaryPort}`);
        timers.TimeoutWrapper(FullQuery_js_1.default, config_js_1.default.fullQueryInterval);
        // timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
        timers.TimeoutWrapper(sendQueue_js_1.default, config_js_1.default.queueSendInterval);
        timers.TimeoutWrapper(cleanUp_js_1.default, config_js_1.default.cleanUpInterval);
        FullQuery_js_1.default();
    });
}
global.sqlPool = mysql.createPool(mySqlConnectionOptions);
global.sqlPool.getConnection(function (err, connection) {
    if (err) {
        logger.log('error', misc_js_1.inspect `${err}`);
        logger.log('error', misc_js_1.inspect `Could not connect to database!`);
        throw err;
    }
    else {
        connection.release();
        logger.log('warning', misc_js_1.inspect `Successfully connected to the database!`);
        if (config_js_1.default.eMail.useTestAccount) {
            nodemailer.createTestAccount(function (err, account) {
                if (err) {
                    logger.log('error', misc_js_1.inspect `${err}`);
                    logger.log('error', misc_js_1.inspect `Failed to get an email test Account`);
                    global.transporter = {
                        sendMail: function sendMail() {
                            logger.log('error', misc_js_1.inspect `can't send mail after Mail error`);
                        },
                        options: {
                            host: "Failed to get test Account"
                        }
                    };
                }
                else {
                    logger.log('warning', misc_js_1.inspect `Got an email test account:\n${account}`);
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
//write uncaught exceptions to all logs
process.on('uncaughtException', err => {
    logger.log('error', misc_js_1.inspect `uncaught exception ${err}`);
    process.exit();
});
