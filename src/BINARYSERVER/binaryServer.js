"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
// import colors from "../SHARED/colors.js";
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const misc_js_1 = require("../SHARED/misc.js");
const logger = global.logger;
var binaryServer = net.createServer(function (socket) {
    var client = {
        name: misc_js_1.clientName(),
        connection: socket,
        ipAddress: socket.remoteAddress.replace(/^.*:/, ''),
        state: constants.states.STANDBY,
        writebuffer: [],
    };
    logger.info(misc_js_1.inspect `client ${client.name} connected from ipaddress: ${client.ipAddress}`); //.replace(/^.*:/,'')
    var chunker = new ITelexCom.ChunkPackages();
    socket.pipe(chunker);
    socket.setTimeout(config_js_1.default.connectionTimeout);
    var listeningForAscii = true;
    var listeningForBinary = true;
    var asciiListener = (data) => {
        if (client) {
            logger.verbose(misc_js_1.inspect `recieved data:${data}`);
            logger.verbose(misc_js_1.inspect `${data.toString().replace(/[^ -~]/g, "·")}`);
            let nonBinary = false;
            if (String.fromCharCode(data[0]) == 'q' && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
                logger.verbose(misc_js_1.inspect `serving ascii request`);
                ITelexCom.ascii(data, client);
                nonBinary = true;
            }
            else if (String.fromCharCode(data[0]) == 'c') {
                misc_js_1.checkIp(data, client);
                nonBinary = true;
            }
            if (nonBinary && listeningForBinary) {
                socket.unpipe(chunker);
                // chunker.end();
                chunker.destroy();
                chunker = null;
                listeningForBinary = false;
            }
        }
    };
    var binaryListener = (pkg) => {
        if (client) {
            if (listeningForAscii) {
                socket.removeListener("data", asciiListener);
                listeningForAscii = false;
            }
            logger.verbose(misc_js_1.inspect `recieved package: ${pkg}`);
            logger.verbose(misc_js_1.inspect `${pkg.toString().replace(/[^ -~]/g, "·")}`);
            ITelexCom.handlePackage(ITelexCom.decPackage(pkg), client)
                .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
        }
    };
    socket.on('data', asciiListener);
    chunker.on('data', binaryListener);
    socket.on('close', function () {
        if (client) {
            if (client.newEntries != null)
                logger.info(misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.info(misc_js_1.inspect `client ${client.name} disconnected!`);
            // clearTimeout(client.timeout);
            client = null;
        }
    });
    socket.on('timeout', function () {
        logger.info(misc_js_1.inspect `client ${client.name} timed out`);
        socket.end();
    });
    socket.on('error', function (err) {
        logger.error(misc_js_1.inspect `${err}`);
        socket.end();
    });
});
binaryServer.on("error", err => logger.error(misc_js_1.inspect `server error: ${err}`));
exports.default = binaryServer;
