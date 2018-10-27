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
const setupSQLPool_js_1 = require("../SHARED/setupSQLPool.js");
createLogger_js_1.default(config_js_1.default.RESTserverLoggingLevel, config_js_1.default.RESTserverLog, config_js_1.default.RESTserverErrorLog, config_js_1.default.logRESTserverToConsole, {
    levels: {
        "error": 0,
        "warning": 1,
        "sql": 2,
        "http": 3,
        "verbose sql": 4,
        "verbose http": 5,
        "debug": 6,
        "silly": 7,
    },
    colors: {
        "error": "red",
        "warning": "yellow",
        "sql": "green",
        "http": "cyan",
        "verbose sql": "green",
        "verbose http": "blue",
        "debug": "magenta",
        "silly": "bold",
    },
});
setupSQLPool_js_1.default(config_js_1.default.mySqlConnectionOptions);
const app_1 = require("./app");
const server = http.createServer(app_1.default);
server.on('error', error => {
    throw error;
});
server.listen(config_js_1.default.RESTServerPort, () => {
    logger.log('warning', misc_js_1.inspect `Listening on ${server.address()}`);
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
