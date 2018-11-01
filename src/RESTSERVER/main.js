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
createLogger_js_1.default(config_js_1.default.RESTserverLoggingLevel, config_js_1.default.RESTserverLog, config_js_1.default.RESTserverErrorLog, config_js_1.default.logRESTserverToConsole, {
    levels: {
        "error": 0,
        "warning": 1,
        "admin": 2,
        "private": 3,
        "public": 4,
        "others": 5,
        "sql": 6,
        "verbose sql": 7,
        "debug": 8,
        "silly": 9,
    },
    colors: {
        "error": "red",
        "warning": "yellow",
        "admin": "magenta",
        "private": "blue",
        "public": "green",
        "others": "gray",
        "sql": "cyan",
        "verbose sql": "cyan",
        "debug": "bold",
    },
});
SQL_js_1.connectToDb();
const app_1 = require("./app");
const server = http.createServer(app_1.default);
server.on('error', error => {
    throw error;
});
server.listen(config_js_1.default.RESTServerPort, () => {
    let address = server.address();
    logger.log('warning', `Listening on ${typeof address === "string" ? 'pipe ' + address : 'port ' + address.port}`);
});
// write uncaught exceptions to all logs
process.on('uncaughtException', (err) => __awaiter(this, void 0, void 0, function* () {
    logger.log('error', misc_js_1.inspect `uncaught exception ${err}`);
    yield misc_js_1.sendEmail('uncaughtException', {
        exception: util.inspect(err),
    });
    if (config_js_1.default.exitOnUncaughtException)
        process.exit(1);
}));