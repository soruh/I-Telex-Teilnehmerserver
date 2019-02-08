"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const util = require("util");
const config_js_1 = require("../shared/config.js");
// import colors from "../shared/colors.js";
const ITelexCom = require("../binaryserver/ITelexCom.js");
const misc_js_1 = require("../shared/misc.js");
const ascii_js_1 = require("./ascii.js");
const handles_js_1 = require("./handles.js");
let binaryServer = net.createServer(function (socket) {
    let client = new misc_js_1.Client(socket);
    let asciiListener = (data) => {
        if (client) {
            let command = String.fromCharCode(data[0]);
            if (command === 'q' || command === 'c') {
                logger.log('network', misc_js_1.inspect `serving ascii request of type ${command}`);
                logger.log('verbose network', misc_js_1.inspect `request: ${util.inspect(data.toString())}`);
                if (command === 'q') {
                    ascii_js_1.asciiLookup(data, client);
                }
                else if (command === 'c') {
                    ascii_js_1.checkIp(data, client);
                }
            }
        }
    };
    let binaryListener = (pkg) => {
        if (client) {
            logger.log('verbose network', misc_js_1.inspect `recieved package: ${pkg}`);
            logger.log('verbose network', misc_js_1.inspect `${pkg.toString().replace(/\u0000/g, '–').replace(/[^ -~–]/g, "·")}`);
            handles_js_1.handlePackage(ITelexCom.decPackage(pkg), client)
                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
        }
    };
    socket.on('close', () => {
        if (client) {
            if (client.newEntries != null)
                logger.log('network', misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.log('network', misc_js_1.inspect `client ${client.name} disconnected!`);
            // clearTimeout(client.timeout);
            client = null;
        }
    });
    socket.on('timeout', () => {
        logger.log('network', misc_js_1.inspect `client ${client.name} timed out`);
        socket.end();
    });
    socket.on('error', (error) => {
        if (error.code === "ECONNRESET") {
            logger.log('warning', misc_js_1.inspect `client ${client.name} reset the socket`);
        }
        else if (error.code === "EPIPE") {
            logger.log('warning', misc_js_1.inspect `tried to write data to a closed socket`);
        }
        else {
            logger.log('error', misc_js_1.inspect `${error}`);
        }
        socket.end();
    });
    const chunker = new ITelexCom.ChunkPackages();
    socket.once('data', asciiListener);
    socket.pipe(chunker);
    chunker.on('data', binaryListener);
    socket.setTimeout(config_js_1.default.connectionTimeout);
    {
        let ipAddress = misc_js_1.normalizeIp(socket.remoteAddress);
        if (ipAddress) {
            client.ipAddress = ipAddress.address;
            client.ipFamily = ipAddress.family;
        }
        else {
            logger.log('error', misc_js_1.inspect `client: ${client.name} had no ipAddress and was disconected`);
            client.socket.destroy();
        }
    }
    logger.log('network', misc_js_1.inspect `client ${client.name} connected from ipaddress: ${client.ipAddress}`); // .replace(/^.*:/,'')
});
binaryServer.on("error", err => logger.log('error', misc_js_1.inspect `server error: ${err}`));
exports.default = binaryServer;
