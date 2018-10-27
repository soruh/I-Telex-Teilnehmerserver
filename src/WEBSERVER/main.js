"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const config_js_1 = require("../SHARED/config.js");
const path = require("path");
const http = require("http");
const misc_js_1 = require("../SHARED/misc.js");
{
    let customLevels = {
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
    };
    let getLoggingLevel = () => {
        if (typeof config_js_1.default.webserverLoggingLevel === "number") {
            let level = Object.entries(customLevels.levels).find(([, value]) => value === config_js_1.default.webserverLoggingLevel);
            if (level)
                return level[0];
        }
        if (typeof config_js_1.default.webserverLoggingLevel === "string") {
            if (customLevels.levels.hasOwnProperty(config_js_1.default.webserverLoggingLevel))
                return config_js_1.default.webserverLoggingLevel;
        }
        // tslint:disable:no-console
        console.log("valid logging levels are:");
        console.log(Object.entries(customLevels.levels)
            .map(([key, value]) => `${value}/${key}`)
            .join("\n"));
        // tslint:enable:no-console
        throw new Error("invalid logging level");
    };
    let resolvePath = (pathToResolve) => {
        if (path.isAbsolute(pathToResolve))
            return pathToResolve;
        return path.join(path.join(__dirname, "../.."), pathToResolve);
    };
    let transports = [];
    if (config_js_1.default.webserverLog)
        transports.push(new winston.transports.File({
            filename: resolvePath(config_js_1.default.webserverLog),
        }));
    if (config_js_1.default.webserverErrorLog)
        transports.push(new winston.transports.File({
            filename: resolvePath(config_js_1.default.webserverErrorLog),
            level: 'error',
        }));
    if (config_js_1.default.logWebserverToConsole)
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
    let formats = [];
    if (config_js_1.default.logDate)
        formats.push(winston.format.timestamp());
    if (!config_js_1.default.disableColors)
        formats.push(winston.format.colorize());
    // formats.push(getLine),
    let logPadding = config_js_1.default.disableColors ? 12 : 22;
    formats.push(winston.format.printf(info => `${config_js_1.default.logDate ? (info.timestamp.replace("T", " ").slice(0, -1) + " ") : ""}${info.level.padStart(logPadding)}: ${info.message}`));
    // formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));
    winston.addColors(customLevels.colors);
    global.logger = winston.createLogger({
        level: getLoggingLevel(),
        levels: customLevels.levels,
        format: winston.format.combine(...formats),
        exitOnError: false,
        transports,
    });
}
const logger = global.logger;
const app_1 = require("./app");
const server = http.createServer(app_1.default);
server.on('error', error => {
    throw error;
});
server.listen(config_js_1.default.webServerPort, () => {
    logger.log('warning', misc_js_1.inspect `Listening on ${server.address()}`);
});
