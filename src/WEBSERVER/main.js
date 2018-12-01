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
const http = require("http");
const misc_js_1 = require("../SHARED/misc.js");
const createLogger_js_1 = require("../SHARED/createLogger.js");
const SQL_js_1 = require("../SHARED/SQL.js");
const constants_js_1 = require("../SHARED/constants.js");
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
