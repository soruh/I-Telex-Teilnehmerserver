"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../SHARED/config.js");
const util = require("util");
const timers_1 = require("../BINARYSERVER/timers");
const nodemailer = require("nodemailer");
const misc_js_1 = require("../SHARED/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
const binaryServer_js_1 = require("./binaryServer.js");
const cleanUp_js_1 = require("./cleanUp.js");
const createLogger_js_1 = require("../SHARED/createLogger.js");
const SQL_js_1 = require("../SHARED/SQL.js");
function logInitilisation(message) {
    process.stdout.write(`${new Date().toISOString().replace(/[TZ]*/, " ")}${' '.repeat(11)}\x1b[041minit\x1b[000m: ${message}\n`);
}
function createWinstonLogger() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            createLogger_js_1.default(config_js_1.default.binaryserverLoggingLevel, config_js_1.default.binaryserverLog, config_js_1.default.binaryserverErrorLog, config_js_1.default.logBinaryserverToConsole, {
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
                },
            });
        }
        catch (err) {
            logInitilisation(misc_js_1.inspect `createWinstonLogger: \x1b[031mfail\x1b[000m`);
            throw (err);
        }
        logInitilisation(misc_js_1.inspect `createWinstonLogger: \x1b[032mdone\x1b[000m`);
    });
}
function listenBinaryserver() {
    return new Promise((resolve, reject) => {
        binaryServer_js_1.default.listen(config_js_1.default.binaryPort, function () {
            logInitilisation(misc_js_1.inspect `listenBinaryserver: \x1b[032mdone\x1b[000m`);
            resolve();
        });
    });
}
function startTimeouts() {
    return new Promise((resolve, reject) => {
        timers_1.TimeoutWrapper(FullQuery_js_1.default, config_js_1.default.fullQueryInterval);
        timers_1.TimeoutWrapper(sendQueue_js_1.default, config_js_1.default.queueSendInterval);
        timers_1.TimeoutWrapper(cleanUp_js_1.default, config_js_1.default.cleanUpInterval);
        // TimeoutWrapper(updateQueue, config.updateQueueInterval);
        logInitilisation(misc_js_1.inspect `startTimeouts: \x1b[032mdone\x1b[000m`);
        resolve();
    });
}
function connectToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield SQL_js_1.connectToDb();
        }
        catch (err) {
            logInitilisation(misc_js_1.inspect `connectToDatabase: \x1b[031mfail\x1b[000m`);
            throw (err);
        }
        logInitilisation(misc_js_1.inspect `connectToDatabase: \x1b[032mdone\x1b[000m`);
    });
}
function setupEmailTransport() {
    return new Promise((resolve, reject) => {
        if (config_js_1.default.eMail.useTestAccount) {
            nodemailer.createTestAccount(function (err, account) {
                if (err) {
                    logInitilisation(misc_js_1.inspect `setupEmailTransport: \x1b[031mfail\x1b[000m`);
                    logger.log('error', misc_js_1.inspect `${err}`);
                    global.transporter = {
                        sendMail: function sendMail() {
                            logger.log('error', misc_js_1.inspect `can't send mail after Mail error`);
                        },
                        options: {
                            host: "Failed to get test Account",
                        },
                    };
                    reject(err);
                }
                else {
                    logInitilisation(misc_js_1.inspect `setupEmailTransport: \x1b[032mdone\x1b[000m`);
                    global.transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false,
                        auth: {
                            user: account.user,
                            pass: account.pass,
                        },
                    });
                    resolve();
                }
            });
        }
        else {
            global.transporter = nodemailer.createTransport(config_js_1.default.eMail.account);
            logInitilisation(misc_js_1.inspect `setupEmailTransport: \x1b[032mdone\x1b[000m`);
            resolve();
        }
    });
}
Promise.all([createWinstonLogger(), setupEmailTransport(), connectToDatabase(), startTimeouts(), listenBinaryserver()])
    .then(() => {
    if (config_js_1.default.serverPin == null)
        logger.log('warning', misc_js_1.inspect `Starting in read-only mode!`);
    FullQuery_js_1.default();
})
    .catch(err => {
    logger.log('error', misc_js_1.inspect `error in startup sequence: ${err}`);
});
// write uncaught exceptions to all logs
process.on('uncaughtException', (err) => __awaiter(this, void 0, void 0, function* () {
    logger.log('error', misc_js_1.inspect `uncaught exception ${err}`);
    yield misc_js_1.sendEmail('uncaughtException', {
        exception: util.inspect(err),
        date: misc_js_1.printDate(),
        timeZone: misc_js_1.getTimezone(new Date()),
    });
    if (config_js_1.default.exitOnUncaughtException)
        process.exit(1);
}));
