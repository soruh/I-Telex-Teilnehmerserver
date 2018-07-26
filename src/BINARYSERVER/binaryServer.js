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
const net = require("net");
const config_js_1 = require("../SHARED/config.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const misc_js_1 = require("../SHARED/misc.js");
const logger = global.logger;
var binaryServer = net.createServer(function (connection) {
    var client = {
        name: misc_js_1.clientName(),
        connection: connection,
        state: constants.states.STANDBY,
        // handling: false,
        readbuffer: null,
        writebuffer: null,
        packages: []
    };
    logger.info(misc_js_1.inspect `client ${client.name} connected from ipaddress: ${connection.remoteAddress}`); //.replace(/^.*:/,'')
    connection.on('close', function () {
        if (client) {
            if (client.newEntries != null)
                logger.info(misc_js_1.inspect `recieved ${client.newEntries} new entries`);
            logger.info(misc_js_1.inspect `client ${client.name} disconnected!`);
            // clearTimeout(client.timeout);
            // logger.info(inspect`deleted connection `);
            client = null;
        }
    });
    connection.setTimeout(config_js_1.default.connectionTimeout);
    connection.on('timeout', function () {
        logger.info(misc_js_1.inspect `client ${client.name} timed out`);
        connection.end();
    });
    connection.on('error', function (err) {
        logger.error(misc_js_1.inspect `${err}`);
        connection.end();
    });
    connection.on('data', function (data) {
        if (client) {
            logger.verbose(misc_js_1.inspect `recieved data:${data}`);
            logger.verbose(misc_js_1.inspect `${data.toString().replace(/[^ -~]/g, "·")}`);
            if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
                logger.verbose(misc_js_1.inspect `serving ascii request`);
                ITelexCom.ascii(data, client);
            }
            else if (data[0] == 'c'.charCodeAt(0)) {
                misc_js_1.checkIp(data, client);
            }
            else {
                logger.verbose(misc_js_1.inspect `serving binary request`);
                logger.debug(misc_js_1.inspect `Buffer for client ${client.name}: ${client.readbuffer}`);
                logger.debug(misc_js_1.inspect `New Data for client ${client.name}: ${data}`);
                var [packages, rest] = ITelexCom.getCompletePackages(data, client.readbuffer);
                logger.debug(misc_js_1.inspect `New Buffer: ${rest}`);
                logger.debug(misc_js_1.inspect `complete Package(s): ${packages}`);
                client.readbuffer = rest;
                if (packages) {
                    client.packages = client.packages.concat(ITelexCom.decPackages(packages));
                    // let handleTimeout = function () {
                    // if (client.handling === false) {
                    // client.handling = true;
                    // if (client.timeout != null) {
                    // 	clearTimeout(client.timeout);
                    // 	client.timeout = null;
                    // }
                    serialEachPromise_js_1.default(client.packages, function (pkg, key) {
                        return __awaiter(this, void 0, void 0, function* () {
                            let msg = misc_js_1.inspect `handling package ${+key + 1}/${client.packages.length}`;
                            if (client.packages.length > 1) {
                                logger.info(msg);
                            }
                            else {
                                logger.verbose(msg);
                            }
                            return yield ITelexCom.handlePackage(pkg, client);
                        });
                    })
                        .then((res) => {
                        if (client)
                            client.packages.splice(0, res.length); //handled);
                        // client.handling = false;
                    })
                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                    // 	} else {
                    // 		client.timeout = setTimeout(handleTimeout, 10);
                    // 	}
                    // };
                    // handleTimeout();
                }
            }
        }
    });
});
binaryServer.on("error", err => logger.error(misc_js_1.inspect `server error: ${err}`));
exports.default = binaryServer;
