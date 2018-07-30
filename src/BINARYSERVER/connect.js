"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
// import colors from "../SHARED/colors.js";
const constants = require("../BINARYSERVER/constants.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const misc_js_1 = require("../SHARED/misc.js");
//#endregion
const logger = global.logger;
function connect(onClose, options) {
    return new Promise((resolve, reject) => {
        let serverkey = options.host + ":" + options.port;
        logger.info(misc_js_1.inspect `trying to connect to: ${serverkey}`);
        var socket = new net.Socket();
        var chunker = new ITelexCom.ChunkPackages();
        socket.pipe(chunker);
        var client = {
            name: misc_js_1.clientName(),
            connection: socket,
            ipAddress: "",
            state: constants.states.STANDBY,
            writebuffer: [],
        };
        chunker.on('data', (pkg) => {
            if (client) {
                logger.verbose(misc_js_1.inspect `recieved package: ${pkg}`);
                logger.verbose(misc_js_1.inspect `${pkg.toString().replace(/[^ -~]/g, "·")}`);
                ITelexCom.handlePackage(ITelexCom.decPackage(pkg), client)
                    .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
            }
        });
        socket.on('close', () => {
            if (client.newEntries != null)
                logger.info(misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.info(misc_js_1.inspect `server ${client.name} disconnected!`);
            // logger.info(inspect`deleted connection `);
            client = null;
            onClose();
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
        });
        socket.once('connect', () => {
            client.ipAddress = socket.remoteAddress.replace(/^.*:/, '');
            logger.info(misc_js_1.inspect `connected to: ${options} as server ${client.name}`);
            misc_js_1.resetErrorCounter(serverkey);
            resolve(client);
        });
        socket.setTimeout(config_js_1.default.connectionTimeout);
        socket.connect(options);
    });
}
exports.default = connect;
