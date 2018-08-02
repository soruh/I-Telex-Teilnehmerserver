"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
// import colors from "../SHARED/colors.js";
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const misc_js_1 = require("../SHARED/misc.js");
const ascii_js_1 = require("./ascii.js");
const handles_js_1 = require("./handles.js");
var binaryServer = net.createServer(function (socket) {
    var client = {
        name: misc_js_1.clientName(),
        connection: socket,
        ipAddress: misc_js_1.normalizeIp(socket.remoteAddress),
        state: constants.states.STANDBY,
        writebuffer: [],
    };
    logger.log('network', misc_js_1.inspect `client ${client.name} connected from ipaddress: ${client.ipAddress}`); //.replace(/^.*:/,'')
    var chunker = new ITelexCom.ChunkPackages();
    socket.pipe(chunker);
    var asciiListener = (data) => {
        if (client) {
            logger.log('verbose network', misc_js_1.inspect `recieved data: ${data}`);
            logger.log('verbose network', misc_js_1.inspect `${data.toString().replace(/[^ -~]/g, "·")}`);
            if (String.fromCharCode(data[0]) == 'q' && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
                logger.log('verbose network', misc_js_1.inspect `serving ascii request`);
                ascii_js_1.asciiLookup(data, client);
            }
            else if (String.fromCharCode(data[0]) == 'c') {
                ascii_js_1.checkIp(data, client);
            }
        }
    };
    var binaryListener = (pkg) => {
        if (client) {
            logger.log('verbose network', misc_js_1.inspect `recieved package: ${pkg}`);
            logger.log('verbose network', misc_js_1.inspect `${pkg.toString().replace(/[^ -~]/g, "·")}`);
            handles_js_1.handlePackage(ITelexCom.decPackage(pkg), client)
                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
        }
    };
    socket.once('data', asciiListener);
    chunker.on('data', binaryListener);
    socket.on('close', function () {
        if (client) {
            if (client.newEntries != null)
                logger.log('network', misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.log('network', misc_js_1.inspect `client ${client.name} disconnected!`);
            // clearTimeout(client.timeout);
            client = null;
        }
    });
    socket.on('timeout', function () {
        logger.log('network', misc_js_1.inspect `client ${client.name} timed out`);
        socket.end();
    });
    socket.setTimeout(config_js_1.default.connectionTimeout);
    socket.on('error', function (err) {
        logger.log('error', misc_js_1.inspect `${err}`);
        socket.end();
    });
});
binaryServer.on("error", err => logger.log('error', misc_js_1.inspect `server error: ${err}`));
exports.default = binaryServer;
