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
const timers = require("../BINARYSERVER/timers.js");
const nodemailer = require("nodemailer");
const misc_js_1 = require("../SHARED/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
const binaryServer_js_1 = require("./binaryServer.js");
const cleanUp_js_1 = require("./cleanUp.js");
const createLogger_js_1 = require("../SHARED/createLogger.js");
const SQL_js_1 = require("../SHARED/SQL.js");
function createWinstonLogger() {
    return __awaiter(this, void 0, void 0, function* () {
        process.stdout.write(misc_js_1.inspect `creating logger... `);
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
            process.stdout.write(misc_js_1.inspect `fail\n`);
            throw (err);
        }
        process.stdout.write(misc_js_1.inspect `done\n`);
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
    return __awaiter(this, void 0, void 0, function* () {
        process.stdout.write(misc_js_1.inspect `connecting to database... `);
        try {
            yield SQL_js_1.connectToDb();
        }
        catch (err) {
            process.stdout.write(misc_js_1.inspect `fail\n`);
            throw (err);
        }
        process.stdout.write(misc_js_1.inspect `done\n`);
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
                            host: "Failed to get test Account",
                        },
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
                            pass: account.pass,
                        },
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
createWinstonLogger()
    .then(setupEmailTransport)
    .then(connectToDatabase)
    .then(startTimeouts)
    .then(listenBinaryserver)
    .then(() => {
    const readonly = (config_js_1.default.serverPin == null);
    if (readonly)
        logger.log('warning', misc_js_1.inspect `Starting in read-only mode!`);
})
    .then(FullQuery_js_1.default)
    .catch(err => {
    logger.log('error', misc_js_1.inspect `error in startup sequence: ${err}`);
});
// write uncaught exceptions to all logs
process.on('uncaughtException', (err) => __awaiter(this, void 0, void 0, function* () {
    logger.log('error', misc_js_1.inspect `uncaught exception ${err}`);
    yield sendEmail('uncaughtException', {
        exception: util.inspect(err),
    });
    if (config_js_1.default.exitOnUncaughtException)
        process.exit(1);
}));
