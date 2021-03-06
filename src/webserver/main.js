"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../shared/config.js");
const util = require("util");
const http = require("http");
const misc_js_1 = require("../shared/misc.js");
const createLogger_js_1 = require("../shared/createLogger.js");
const SQL_js_1 = require("../shared/SQL.js");
const constants_js_1 = require("../shared/constants.js");
createLogger_js_1.default(config_js_1.default.webserverLoggingLevel, config_js_1.default.webserverLog, config_js_1.default.webserverErrorLog, config_js_1.default.logWebserverToConsole, constants_js_1.loggingLevels.WEB);
SQL_js_1.connectToDb();
const app_1 = require("./app");
const server = http.createServer(app_1.default);
server.on('error', error => {
    throw error;
});
server.listen(config_js_1.default.webServerPort, () => {
    let address = server.address();
    logger.log('warning', `Listening on ${typeof address === "string" ? 'pipe ' + address : 'port ' + address.port}`);
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
