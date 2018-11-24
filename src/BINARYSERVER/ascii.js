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
const config_1 = require("../SHARED/config");
const util = require("util");
const dns = require("dns");
const ip = require("ip");
const misc_1 = require("../SHARED/misc");
const SQL_1 = require("../SHARED/SQL");
const serialEachPromise_1 = require("../SHARED/serialEachPromise");
function asciiLookup(data, client) {
    return __awaiter(this, void 0, void 0, function* () {
        const match = /q([0-9]+)/.exec(data.toString());
        const number = match[1];
        if (number && (!isNaN(parseInt(number)))) {
            logger.log('debug', misc_1.inspect `starting lookup for: ${number}`);
            try {
                let result = yield SQL_1.SqlGet(`SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number]);
                if (!result) {
                    let send = "";
                    send += "fail\r\n";
                    send += number + "\r\n";
                    send += "unknown\r\n";
                    send += "+++\r\n";
                    client.connection.end(send, function () {
                        logger.log('debug', misc_1.inspect `Entry not found/visible`);
                        logger.log('debug', misc_1.inspect `sent:\n${send}`);
                    });
                }
                else {
                    let send = "";
                    let res = result;
                    send += "ok\r\n";
                    send += res.number + "\r\n";
                    send += res.name + "\r\n";
                    send += res.type + "\r\n";
                    if ([2, 4, 5].indexOf(res.type) > -1) {
                        send += res.ipaddress + "\r\n";
                    }
                    else if ([1, 3, 6].indexOf(res.type) > -1) {
                        send += res.hostname + "\r\n";
                    }
                    /* else if (res.type == 6) {
                        send += res.hostname + "\r\n";
                    }*/
                    else {
                        send += "ERROR\r\n";
                    }
                    send += res.port + "\r\n";
                    send += (res.extension || "-") + "\r\n";
                    send += "+++\r\n";
                    client.connection.end(send, function () {
                        logger.log('debug', misc_1.inspect `Entry found`);
                        logger.log('debug', misc_1.inspect `sent:\n${send}`);
                    });
                }
            }
            catch (err) {
                logger.log('error', misc_1.inspect `${err}`);
            }
        }
        else {
            client.connection.end();
        }
    });
}
exports.asciiLookup = asciiLookup;
function checkIp(data, client) {
    return __awaiter(this, void 0, void 0, function* () {
        if (config_1.default.doDnsLookups) {
            const arg = data.slice(1).toString().split("\n")[0].split("\r")[0];
            logger.log('debug', misc_1.inspect `checking if belongs to any participant`);
            let ipAddr = "";
            if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
                ipAddr = arg;
            }
            else {
                try {
                    let { address, family, } = yield util.promisify(dns.lookup)(arg);
                    ipAddr = address;
                    logger.log('debug', misc_1.inspect ` resolved to ${ipAddr}`);
                }
                catch (e) {
                    client.connection.end("error\r\nnot a valid host or ip\r\n");
                    logger.log('debug', misc_1.inspect `${e}`);
                    return;
                }
            }
            if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
                try {
                    let peers = yield SQL_1.SqlAll("SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", []);
                    let ipPeers = [];
                    yield serialEachPromise_1.default(peers, peer => new Promise((resolve, reject) => {
                        if ((!peer.ipaddress) && peer.hostname) {
                            // logger.log('debug', inspect`hostname: ${peer.hostname}`)
                            dns.lookup(peer.hostname, {}, function (err, address, family) {
                                // if (err) logger.log('debug', inspect`${err}`);
                                if (address) {
                                    ipPeers.push({
                                        peer,
                                        ipaddress: address,
                                    });
                                    // logger.log('debug', inspect`${peer.hostname} resolved to ${address}`);
                                }
                                resolve();
                            });
                        }
                        else if (peer.ipaddress && (ip.isV4Format(peer.ipaddress) || ip.isV6Format(peer.ipaddress))) {
                            // logger.log('debug', inspect`ip: ${peer.ipaddress}`);
                            ipPeers.push({
                                peer,
                                ipaddress: peer.ipaddress,
                            });
                            resolve();
                        }
                        else {
                            resolve();
                        }
                    }));
                    let matches = ipPeers.filter(peer => ip.isEqual(peer.ipaddress, ipAddr)).map(x => x.peer.name);
                    logger.log('debug', misc_1.inspect `matching peers: ${matches}`);
                    if (matches.length > 0) {
                        client.connection.end(`ok\r\n${matches.join("\r\n")}\r\n+++\r\n`);
                    }
                    else {
                        client.connection.end("fail\r\n+++\r\n");
                    }
                }
                catch (err) {
                    logger.log('error', misc_1.inspect `${err}`);
                }
            }
            else {
                client.connection.end("error\r\nnot a valid host or ip\r\n");
            }
        }
        else {
            client.connection.end("error\r\nthis server does not support this function\r\n");
        }
    });
}
exports.checkIp = checkIp;
