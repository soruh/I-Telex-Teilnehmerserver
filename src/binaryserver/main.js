"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../shared/config.js");
const util = require("util");
const timers_1 = require("../binaryserver/timers");
const nodemailer = require("nodemailer");
const misc_js_1 = require("../shared/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
const binaryServer_js_1 = require("./binaryServer.js");
const cleanUp_js_1 = require("./cleanUp.js");
const createLogger_js_1 = require("../shared/createLogger.js");
const SQL_js_1 = require("../shared/SQL.js");
const constants_js_1 = require("../shared/constants.js");
function logInitilisation(message) {
    process.stdout.write(`${new Date().toISOString().replace(/[TZ]*/, " ")}${' '.repeat(11)}\x1b[041minit\x1b[000m: ${message}\n`);
}
async function createWinstonLogger() {
    try {
        createLogger_js_1.default(config_js_1.default.binaryserverLoggingLevel, config_js_1.default.binaryserverLog, config_js_1.default.binaryserverErrorLog, config_js_1.default.logBinaryserverToConsole, constants_js_1.loggingLevels.BIN);
    }
    catch (err) {
        logInitilisation(misc_js_1.inspect `createWinstonLogger: \x1b[031mfail\x1b[000m`);
        throw (err);
    }
    logInitilisation(misc_js_1.inspect `createWinstonLogger: \x1b[032mdone\x1b[000m`);
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
async function connectToDatabase() {
    try {
        await SQL_js_1.connectToDb();
    }
    catch (err) {
        logInitilisation(misc_js_1.inspect `connectToDatabase: \x1b[031mfail\x1b[000m`);
        throw (err);
    }
    logInitilisation(misc_js_1.inspect `connectToDatabase: \x1b[032mdone\x1b[000m`);
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
process.on('uncaughtException', async (err) => {
    logger.log('error', misc_js_1.inspect `uncaught exception ${err}`);
    await misc_js_1.sendEmail('uncaughtException', {
        exception: util.inspect(err),
        date: misc_js_1.printDate(),
        timeZone: misc_js_1.getTimezone(new Date()),
    });
    if (config_js_1.default.exitOnUncaughtException)
        process.exit(1);
});
