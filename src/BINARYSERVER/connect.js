"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
const colors_js_1 = require("../SHARED/colors.js");
const constants = require("../BINARYSERVER/constants.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const misc_js_1 = require("../SHARED/misc.js");
//#endregion
const logger = global.logger;
function connect(onEnd, options) {
    return new Promise((resolve, reject) => {
        let serverkey = options.host + ":" + options.port;
        logger.info(colors_js_1.default.FgGreen + "trying to connect to:" + colors_js_1.default.FgCyan + serverkey + colors_js_1.default.Reset);
        var socket = new net.Socket();
        var client = {
            name: misc_js_1.clientName(),
            connection: socket,
            readbuffer: new Buffer(0),
            state: constants.states.STANDBY,
            packages: [],
            // handling: false,
            writebuffer: [],
        };
        socket.setTimeout(config_js_1.default.connectionTimeout);
        socket.on('end', () => {
            if (client.newEntries != null)
                logger.info(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${client.newEntries}${colors_js_1.default.FgGreen} new entries${colors_js_1.default.Reset}`);
            logger.info(colors_js_1.default.FgYellow + "server " + colors_js_1.default.FgCyan + client.name + colors_js_1.default.FgYellow + " ended!" + colors_js_1.default.Reset);
            // logger.info(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.name+colors.Reset}`);
            client = null;
            onEnd(client);
        });
        socket.on('timeout', () => {
            logger.warn(colors_js_1.default.FgRed + "server: " + colors_js_1.default.FgCyan + serverkey + colors_js_1.default.FgRed + " timed out" + colors_js_1.default.Reset);
            // socket.emit("end");
            // socket.emit("error",new Error("timeout"));
            misc_js_1.increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
            socket.end();
        });
        socket.on('error', error => {
            if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
                logger.info(misc_js_1.inspect `${colors_js_1.default.FgRed}server ${colors_js_1.default.FgCyan}${options}${colors_js_1.default.FgRed} had an error${colors_js_1.default.Reset}`);
                misc_js_1.increaseErrorCounter(serverkey, error, error["code"]);
                logger.info(`${colors_js_1.default.FgRed}server ${colors_js_1.default.FgCyan}${serverkey}${colors_js_1.default.FgRed} could not be reached; errorCounter: ${colors_js_1.default.FgCyan}${misc_js_1.errorCounters[serverkey]}${colors_js_1.default.Reset}`);
            }
            else {
                logger.debug(error);
            }
            socket.end();
        });
        socket.on('data', (data) => {
            if (client) {
                logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgGreen}recieved data: ${colors_js_1.default.FgCyan}${data}${colors_js_1.default.Reset}`);
                logger.verbose(colors_js_1.default.FgCyan + data.toString().replace(/[^ -~]/g, "·") + colors_js_1.default.Reset);
                try {
                    logger.debug(misc_js_1.inspect `${colors_js_1.default.FgGreen}Buffer for client ${colors_js_1.default.FgCyan}${client.name}${colors_js_1.default.FgGreen}: ${colors_js_1.default.FgCyan}${client.readbuffer}${colors_js_1.default.Reset}`);
                    logger.debug(misc_js_1.inspect `${colors_js_1.default.FgGreen}New Data for client ${colors_js_1.default.FgCyan}${client.name}${colors_js_1.default.FgGreen}: ${colors_js_1.default.FgCyan}${data}${colors_js_1.default.Reset}`);
                    var [packages, rest] = ITelexCom.getCompletePackages(data, client.readbuffer);
                    logger.debug(misc_js_1.inspect `${colors_js_1.default.FgGreen}New Buffer for client ${client.name}: ${colors_js_1.default.FgCyan}${rest}${colors_js_1.default.Reset}`);
                    logger.debug(misc_js_1.inspect `${colors_js_1.default.FgGreen}Packages for client ${client.name}: ${colors_js_1.default.FgCyan}${packages}${colors_js_1.default.Reset}`);
                    client.readbuffer = rest;
                    client.packages = client.packages.concat(ITelexCom.decPackages(packages));
                    // let handleTimeout = () => {
                    // logger.verbose(colors.FgGreen + "handling: " + colors.FgCyan + client.handling + colors.Reset);
                    // if (client.handling === false) {
                    // 	client.handling = true;
                    // 	if (client.handleTimeout != null) {
                    // 		clearTimeout(client.handleTimeout);
                    // 		client.handleTimeout = null;
                    // 	}
                    serialEachPromise_js_1.default(client.packages, (pkg, key) => new Promise((resolve, reject) => {
                        {
                            let msg = colors_js_1.default.FgGreen + "handling package " + colors_js_1.default.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors_js_1.default.Reset;
                            if (Object.keys(client.packages).length > 1) {
                                logger.info(msg);
                            }
                            else {
                                logger.verbose(msg);
                            }
                        }
                        ITelexCom.handlePackage(pkg, client)
                            .then(() => {
                            client.packages.splice(+key, 1);
                            resolve();
                        })
                            .catch(logger.error);
                    }))
                        .then(() => {
                        // client.handling = false;
                    })
                        .catch(logger.error);
                    // } else {
                    // 	if (client.handleTimeout == null) {
                    // 		client.handleTimeout = setTimeout(handleTimeout, 10);
                    // 	}
                    // }
                    // };
                    // handleTimeout();
                }
                catch (e) {
                    logger.error(misc_js_1.inspect `${colors_js_1.default.FgRed}${e}${colors_js_1.default.Reset}`);
                }
            }
        });
        socket.connect(options, () => {
            logger.info(misc_js_1.inspect `${colors_js_1.default.FgGreen}connected to: ${colors_js_1.default.FgCyan}${options}${colors_js_1.default.FgGreen} as server ${colors_js_1.default.FgCyan}${client.name}${colors_js_1.default.Reset}`);
            misc_js_1.resetErrorCounter(serverkey);
            resolve(client);
        });
    });
}
exports.default = connect;
