"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
// import colors from "../SHARED/colors.js";
const constants = require("../BINARYSERVER/constants.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const misc_js_1 = require("../SHARED/misc.js");
const handles_js_1 = require("./handles.js");
//#endregion
function connect(options, onClose = () => { }) {
    return new Promise((resolve, reject) => {
        let serverkey = options.host + ":" + options.port;
        logger.log('verbose network', misc_js_1.inspect `trying to connect to server at ${serverkey}`);
        var socket = new net.Socket();
        var chunker = new ITelexCom.ChunkPackages();
        socket.pipe(chunker);
        var client = {
            name: misc_js_1.clientName(),
            connection: socket,
            ipAddress: null,
            ipFamily: null,
            state: constants.states.STANDBY,
            writebuffer: [],
            sendPackage: misc_js_1.sendPackage,
        };
        chunker.on('data', (pkg) => {
            if (client) {
                logger.log('verbose network', misc_js_1.inspect `recieved package: ${pkg}`);
                logger.log('verbose network', misc_js_1.inspect `${pkg.toString().replace(/[^ -~]/g, "·")}`);
                handles_js_1.handlePackage(ITelexCom.decPackage(pkg), client)
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
            }
        });
        socket.on('close', () => {
            if (client.newEntries != null)
                logger.log('verbose network', misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.log('network', misc_js_1.inspect `server ${client.name} disconnected!`);
            client = null;
            onClose();
        });
        socket.on('timeout', () => {
            logger.log('warning', misc_js_1.inspect `server: ${client.name} timed out`);
            // socket.emit("end");
            // socket.emit("error",new Error("timeout"));
            misc_js_1.increaseErrorCounter(serverkey, client ? client.state : null, "TIMEOUT");
            socket.end();
        });
        socket.on('error', error => {
            if (error["code"] != "ECONNRESET") {
                logger.log('debug', misc_js_1.inspect `${error}`);
                logger.log('network', misc_js_1.inspect `server ${client.name} had an error`);
                misc_js_1.increaseErrorCounter(serverkey, client ? client.state : null, error["code"]);
            }
            else {
                logger.log('silly', misc_js_1.inspect `${error}`);
            }
        });
        socket.once('connect', () => {
            {
                let ipA = socket.remoteAddress;
                let ipB = socket._getpeername();
                ipB = ipB ? ipB.address : null;
                if (ipA) {
                    logger.log('debug', misc_js_1.inspect `socket.remoteAddress: ${ipA} socket._getpeername(): ${ipB}`);
                }
                else {
                    logger.log('error', misc_js_1.inspect `socket.remoteAddress: ${ipA} socket._getpeername(): ${ipB}`);
                }
                let ipAddress = misc_js_1.normalizeIp(ipA || ipB);
                if (ipAddress) {
                    client.ipAddress = ipAddress.address;
                    client.ipFamily = ipAddress.family;
                }
                else {
                    logger.log('error', misc_js_1.inspect `server: ${client.name} had no ipAddress and was disconected`);
                    socket.destroy();
                }
            }
            logger.log('network', misc_js_1.inspect `connected to server at ${serverkey} as ${client.name}`);
            misc_js_1.resetErrorCounter(serverkey);
            resolve(client);
        });
        socket.setTimeout(config_js_1.default.connectionTimeout);
        socket.connect(options);
    });
}
exports.default = connect;
