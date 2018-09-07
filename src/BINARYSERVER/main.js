"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_js_1 = require("../SHARED/colors.js");
const config_js_1 = require("../SHARED/config.js");
const path = require("path");
const mysql = require("mysql");
const winston = require("winston");
const timers = require("../BINARYSERVER/timers.js");
const nodemailer = require("nodemailer");
const misc_js_1 = require("../SHARED/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
// import updateQueue from './updateQueue.js';
const binaryServer_js_1 = require("./binaryServer.js");
const cleanUp_js_1 = require("./cleanUp.js");
colors_js_1.default.disable(config_js_1.default.disableColors);
const readonly = (config_js_1.default.serverPin == null);
if (readonly)
    logger.log('warning', misc_js_1.inspect `Starting in read-only mode!`);
global.sqlPool = mysql.createPool(config_js_1.default.mySqlConnectionOptions);
function createLogger() {
    return new Promise((resolve, reject) => {
        var customLevels = {
            levels: {
                "error": 0,
                "warning": 1,
                "sql": 2,
                "network": 3,
                "verbose sql": 4,
                "verbose network": 5,
                "debug": 6,
                "queue": 7,
                "iTelexCom": 8,
                "silly": 9,
            },
            colors: {
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
        };
        // let customLevels = winston.config.npm;
        var getLoggingLevel = function getLoggingLevel() {
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
        var resolvePath = function resolvePath(pathToResolve) {
            if (path.isAbsolute(pathToResolve))
                return pathToResolve;
            return path.join(path.join(__dirname, "../.."), pathToResolve);
        };
        var transports = [];
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
        var formats = [];
        if (config_js_1.default.logDate)
            formats.push(winston.format.timestamp());
        if (!config_js_1.default.disableColors)
            formats.push(winston.format.colorize());
        // formats.push(getLine),
        var levelPadding = Math.max(...Object.keys(customLevels.colors).map(x => x.length));
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
        resolve();
    });
}
function listenBinaryserver() {
    return new Promise((resolve, reject) => {
        process.stdout.write(misc_js_1.inspect `listen on port ${config_js_1.default.binaryPort}... `);
        binaryServer_js_1.default.listen(config_js_1.default.binaryPort, function () {
            process.stdout.write(misc_js_1.inspect `done\n`);
            resolve();
        });
    });
}
function startTimeouts() {
    return new Promise((resolve, reject) => {
        process.stdout.write(misc_js_1.inspect `starting timeouts... `);
        timers.TimeoutWrapper(FullQuery_js_1.default, config_js_1.default.fullQueryInterval);
        timers.TimeoutWrapper(sendQueue_js_1.default, config_js_1.default.queueSendInterval);
        timers.TimeoutWrapper(cleanUp_js_1.default, config_js_1.default.cleanUpInterval);
        // timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
        process.stdout.write(misc_js_1.inspect `done\n`);
        resolve();
    });
}
function connectToDatabase() {
    return new Promise((resolve, reject) => {
        process.stdout.write(misc_js_1.inspect `connecting to database... `);
        global.sqlPool.getConnection(function (err, connection) {
            if (err) {
                process.stdout.write(misc_js_1.inspect `fail\n`);
                logger.log('error', misc_js_1.inspect `${err}`);
                reject(err);
            }
            else {
                connection.release();
                process.stdout.write(misc_js_1.inspect `done\n`);
                resolve();
            }
        });
    });
}
function setupEmailTransport() {
    return new Promise((resolve, reject) => {
        process.stdout.write(misc_js_1.inspect `setting up email transporter... `);
        if (config_js_1.default.eMail.useTestAccount) {
            process.stdout.write(misc_js_1.inspect `\n  getting test account... `);
            nodemailer.createTestAccount(function (err, account) {
                if (err) {
                    process.stdout.write(misc_js_1.inspect `fail\n`);
                    logger.log('error', misc_js_1.inspect `${err}`);
                    global.transporter = {
                        sendMail: function sendMail() {
                            logger.log('error', misc_js_1.inspect `can't send mail after Mail error`);
                        },
                        options: {
                            host: "Failed to get test Account"
                        }
                    };
                    reject(err);
                }
                else {
                    process.stdout.write(misc_js_1.inspect `done\n`);
                    process.stdout.write(misc_js_1.inspect `  got test account:\n` + Object.entries(account).map(([key, value]) => misc_js_1.inspect `     ${key}: ${value}`).join('\n') + '\n');
                    global.transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false,
                        auth: {
                            user: account.user,
                            pass: account.pass // generated ethereal password
                        }
                    });
                    resolve();
                }
            });
        }
        else {
            global.transporter = nodemailer.createTransport(config_js_1.default.eMail.account);
            process.stdout.write(misc_js_1.inspect `done\n`);
            resolve();
        }
    });
}
createLogger()
    .then(setupEmailTransport)
    .then(connectToDatabase)
    .then(startTimeouts)
    .then(listenBinaryserver)
    .then(FullQuery_js_1.default)
    .catch(err => {
    logger.log('error', misc_js_1.inspect `error in initialisation: ${err}`);
});
//write uncaught exceptions to all logs
process.on('uncaughtException', err => {
    logger.log('error', misc_js_1.inspect `uncaught exception ${err}`);
    process.exit();
});
