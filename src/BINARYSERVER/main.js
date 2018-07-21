"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const util = require("util");
const mysql = require("mysql");
const timers = require("../BINARYSERVER/timers.js");
const config_js_1 = require("../COMMONMODULES/config.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const nodemailer = require("nodemailer");
const misc = require("../BINARYSERVER/misc.js");
const FullQuery_js_1 = require("./FullQuery.js");
const sendQueue_js_1 = require("./sendQueue.js");
// import updateQueue from './updateQueue.js';
const binaryServer_js_1 = require("./binaryServer.js");
//#endregion
const cv = config_js_1.default.cv;
const readonly = (config_js_1.default.serverPin == null);
if (readonly)
    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgMagenta}Starting in read-only mode!${colors_js_1.default.Reset}`);
colors_js_1.default.disable(config_js_1.default.disableColors);
const mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
function init() {
    if (cv(0))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Initialising!" + colors_js_1.default.Reset);
    binaryServer_js_1.default.listen(config_js_1.default.binaryPort, function () {
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "server is listening on port " + colors_js_1.default.FgCyan + config_js_1.default.binaryPort, colors_js_1.default.Reset);
        timers.TimeoutWrapper(FullQuery_js_1.default, config_js_1.default.fullQueryInterval);
        // timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
        timers.TimeoutWrapper(sendQueue_js_1.default, config_js_1.default.queueSendInterval);
        FullQuery_js_1.default();
    });
}
global.sqlPool = mysql.createPool(mySqlConnectionOptions);
global.sqlPool.getConnection(function (err, connection) {
    if (err) {
        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, "Could not connect to database!", colors_js_1.default.Reset);
        throw err;
    }
    else {
        connection.release();
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Successfully connected to the database!" + colors_js_1.default.Reset);
        if (config_js_1.default.eMail.useTestAccount) {
            nodemailer.createTestAccount(function (err, account) {
                if (err) {
                    logWithLineNumbers_js_1.lle(err);
                    global.transporter = {
                        sendMail: function sendMail() {
                            logWithLineNumbers_js_1.lle("can't send mail after Mail error");
                        },
                        options: {
                            host: "Failed to get test Account"
                        }
                    };
                }
                else {
                    if (cv(0))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Got email test account:\n" + colors_js_1.default.FgCyan + util.inspect(account) + colors_js_1.default.Reset);
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
if (cv(3)) {
    let exitHandler = function exitHandler(options, err) {
        if (options.cleanup) {
            logWithLineNumbers_js_1.lle("exited with code: " + err);
            logWithLineNumbers_js_1.lle(`serverErrors:\n${util.inspect(misc.serverErrors, { depth: null })}`);
        }
        else {
            logWithLineNumbers_js_1.lle(err);
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
    process.on('SIGUSR1', exitHandler.bind(null, {
        exit: true,
        code: -3
    }));
    process.on('SIGUSR2', exitHandler.bind(null, {
        exit: true,
        code: -4
    }));
}
