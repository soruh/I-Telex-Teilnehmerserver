"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
// import colors from "../SHARED/colors.js";
const constants = require("../SHARED/constants.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const misc_js_1 = require("../SHARED/misc.js");
const handles_js_1 = require("./handles.js");
//#endregion
// tslint:disable-next-line:no-empty
function connect(options, onClose = () => { }) {
    return new Promise((resolve, reject) => {
        const serverkey = options.host + ":" + options.port;
        logger.log('verbose network', misc_js_1.inspect `trying to connect to server at ${serverkey}`);
        const socket = new net.Socket();
        const chunker = new ITelexCom.ChunkPackages();
        socket.pipe(chunker);
        let client = {
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
                logger.log('verbose network', misc_js_1.inspect `${pkg.toString().replace(/\u0000/g, '–').replace(/[^ -~–]/g, "·")}`);
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
            misc_js_1.increaseErrorCounter('server', serverkey, "TIMEOUT");
            socket.end();
        });
        socket.on('error', (error) => {
            if (error.code === "ECONNRESET") {
                logger.log('warning', misc_js_1.inspect `server ${client.name} reset the connection`);
            }
            else if (error.code === "EPIPE") {
                logger.log('warning', misc_js_1.inspect `tried to write data to a closed socket`);
            }
            else {
                logger.log('debug', misc_js_1.inspect `${error}`);
                logger.log('network', misc_js_1.inspect `server ${client.name} had an error`);
                misc_js_1.increaseErrorCounter('server', serverkey, error["code"]);
            }
        });
        socket.once('connect', () => {
            {
                let ipAddress = misc_js_1.normalizeIp(socket.remoteAddress);
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
            misc_js_1.resetErrorCounter('server', serverkey);
            resolve(client);
        });
        socket.setTimeout(config_js_1.default.connectionTimeout);
        socket.connect(options);
    });
}
exports.default = connect;
