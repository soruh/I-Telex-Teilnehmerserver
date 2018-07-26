"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
const constants = require("../BINARYSERVER/constants.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const misc_js_1 = require("../SHARED/misc.js");
//#endregion
const logger = global.logger;
function connect(onEnd, options) {
    return new Promise((resolve, reject) => {
        let serverkey = options.host + ":" + options.port;
        logger.info(misc_js_1.inspect `trying to connect to: ${serverkey}`);
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
                logger.info(misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.info(misc_js_1.inspect `server ${client.name} ended!`);
            // logger.info(inspect`deleted connection `);
            client = null;
            onEnd(client);
        });
        socket.on('timeout', () => {
            logger.warn(misc_js_1.inspect `server: ${serverkey} timed out`);
            // socket.emit("end");
            // socket.emit("error",new Error("timeout"));
            misc_js_1.increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
            socket.end();
        });
        socket.on('error', error => {
            if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
                logger.info(misc_js_1.inspect `server ${options} had an error`);
                misc_js_1.increaseErrorCounter(serverkey, error, error["code"]);
                logger.info(misc_js_1.inspect `server ${serverkey} could not be reached; errorCounter: ${misc_js_1.errorCounters[serverkey]}`);
            }
            else {
                logger.debug(misc_js_1.inspect `${error}`);
            }
            socket.end();
        });
        socket.on('data', (data) => {
            if (client) {
                logger.verbose(misc_js_1.inspect `recieved data: ${data}`);
                logger.verbose(misc_js_1.inspect `${data.toString().replace(/[^ -~]/g, "·")}`);
                try {
                    logger.debug(misc_js_1.inspect `Buffer for client ${client.name}: ${client.readbuffer}`);
                    logger.debug(misc_js_1.inspect `New Data for client ${client.name}: ${data}`);
                    var [packages, rest] = ITelexCom.getCompletePackages(data, client.readbuffer);
                    logger.debug(misc_js_1.inspect `New Buffer for client ${client.name}: ${rest}`);
                    logger.debug(misc_js_1.inspect `Packages for client ${client.name}: ${packages}`);
                    client.readbuffer = rest;
                    client.packages = client.packages.concat(ITelexCom.decPackages(packages));
                    // let handleTimeout = () => {
                    // logger.verbose(inspect`handling: ${client.handling}`);
                    // if (client.handling === false) {
                    // 	client.handling = true;
                    // 	if (client.handleTimeout != null) {
                    // 		clearTimeout(client.handleTimeout);
                    // 		client.handleTimeout = null;
                    // 	}
                    serialEachPromise_js_1.default(client.packages, (pkg, key) => new Promise((resolve, reject) => {
                        {
                            let msg = `handling package ${+key + 1}/${Object.keys(client.packages).length}`;
                            if (Object.keys(client.packages).length > 1) {
                                logger.info(misc_js_1.inspect `${msg}`);
                            }
                            else {
                                logger.verbose(misc_js_1.inspect `${msg}`);
                            }
                        }
                        ITelexCom.handlePackage(pkg, client)
                            .then(() => {
                            client.packages.splice(+key, 1);
                            resolve();
                        })
                            .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                    }))
                        .then(() => {
                        // client.handling = false;
                    })
                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                    // } else {
                    // 	if (client.handleTimeout == null) {
                    // 		client.handleTimeout = setTimeout(handleTimeout, 10);
                    // 	}
                    // }
                    // };
                    // handleTimeout();
                }
                catch (e) {
                    logger.error(misc_js_1.inspect `${e}`);
                }
            }
        });
        socket.connect(options, () => {
            logger.info(misc_js_1.inspect `connected to: ${options} as server ${client.name}`);
            misc_js_1.resetErrorCounter(serverkey);
            resolve(client);
        });
    });
}
exports.default = connect;
