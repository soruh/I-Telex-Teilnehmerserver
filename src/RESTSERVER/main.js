"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../SHARED/config.js");
const util = require("util");
const https = require("https");
const misc_js_1 = require("../SHARED/misc.js");
// import { TimeoutWrapper } from "../BINARYSERVER/timers";
const createLogger_js_1 = require("../SHARED/createLogger.js");
const SQL_js_1 = require("../SHARED/SQL.js");
const timers_js_1 = require("../BINARYSERVER/timers.js");
const FullQuery_1 = require("./sync/FullQuery");
const sendQueue_1 = require("./sync/sendQueue");
const constants_js_1 = require("../SHARED/constants.js");
createLogger_js_1.default(config_js_1.default.RESTserverLoggingLevel, config_js_1.default.RESTserverLog, config_js_1.default.RESTserverErrorLog, config_js_1.default.logRESTserverToConsole, constants_js_1.loggingLevels.REST);
SQL_js_1.connectToDb();
timers_js_1.TimeoutWrapper(FullQuery_1.default, config_js_1.default.fullQueryInterval);
timers_js_1.TimeoutWrapper(sendQueue_1.default, config_js_1.default.queueSendInterval);
const app_1 = require("./app");
const server = https.createServer({
    key: config_js_1.default.RESTKey,
    cert: config_js_1.default.RESTCert,
    rejectUnauthorized: true,
    requestCert: config_js_1.default.useClientCertificate,
    ca: [config_js_1.default.RESTCert],
}, app_1.default);
server.on('error', error => {
    throw error;
});
server.listen(config_js_1.default.RESTServerPort, () => {
    let address = server.address();
    logger.log('warning', `Listening on ${typeof address === "string" ? 'pipe ' + address : 'port ' + address.port}`);
});
FullQuery_1.default();
// sendQueue();
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
