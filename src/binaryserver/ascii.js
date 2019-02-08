"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../shared/config");
const util = require("util");
const dns = require("dns");
const ip = require("ip");
const misc_1 = require("../shared/misc");
const SQL_1 = require("../shared/SQL");
const serialEachPromise_1 = require("../shared/serialEachPromise");
async function asciiLookup(data, client) {
    const match = /q([0-9]+)/.exec(data.toString());
    const number = match[1];
    if (number && (!isNaN(parseInt(number)))) {
        logger.log('debug', misc_1.inspect `starting lookup for: ${number}`);
        try {
            let result = await SQL_1.SqlGet(`SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number]);
            if (!result) {
                let send = "";
                send += "fail\r\n";
                send += number + "\r\n";
                send += "unknown\r\n";
                send += "+++\r\n";
                client.socket.end(send, function () {
                    logger.log('debug', misc_1.inspect `Entry not found/visible`);
                    logger.log('debug', misc_1.inspect `sent:\n${send}`);
                });
            }
            else {
                let send = "";
                const res = result;
                send += "ok\r\n";
                send += res.number + "\r\n";
                send += res.name + "\r\n";
                send += res.type + "\r\n";
                if ([2, 4, 5].indexOf(res.type) > -1) {
                    send += res.ipaddress + "\r\n";
                }
                else if ([1, 3, 6].indexOf(res.type) > -1) {
                    send += res.hostname + "\r\n";
                } /* else if (res.type == 6) {
                    send += res.hostname + "\r\n";
                }*/
                else {
                    // send fail if entry has wrong type
                    send = "";
                    send += "fail\r\n";
                    send += number + "\r\n";
                    send += "wrong type\r\n";
                    send += "+++\r\n";
                    client.socket.end(send, function () {
                        logger.log('debug', misc_1.inspect `Entry had invalid type`);
                        logger.log('debug', misc_1.inspect `sent:\n${send}`);
                    });
                    return;
                }
                send += res.port + "\r\n";
                send += (res.extension || "-") + "\r\n";
                send += "+++\r\n";
                client.socket.end(send, function () {
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
        client.socket.end();
    }
}
exports.asciiLookup = asciiLookup;
async function checkIp(data, client) {
    if (config_1.default.doDnsLookups) {
        const arg = data.slice(1).toString().split("\n")[0].split("\r")[0];
        logger.log('debug', misc_1.inspect `checking if belongs to any participant`);
        let ipAddr = "";
        if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
            ipAddr = arg;
        }
        else {
            try {
                let { address, family, } = await util.promisify(dns.lookup)(arg);
                ipAddr = address;
                logger.log('debug', misc_1.inspect ` resolved to ${ipAddr}`);
            }
            catch (e) {
                client.socket.end("error\r\nnot a valid host or ip\r\n");
                logger.log('debug', misc_1.inspect `${e}`);
                return;
            }
        }
        if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
            try {
                let peers = await SQL_1.SqlAll("SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", []);
                let ipPeers = [];
                await serialEachPromise_1.default(peers, peer => new Promise((resolve, reject) => {
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
                    client.socket.end(`ok\r\n${matches.join("\r\n")}\r\n+++\r\n`);
                }
                else {
                    client.socket.end("fail\r\n+++\r\n");
                }
            }
            catch (err) {
                logger.log('error', misc_1.inspect `${err}`);
            }
        }
        else {
            client.socket.end("error\r\nnot a valid host or ip\r\n");
        }
    }
    else {
        client.socket.end("error\r\nthis server does not support this function\r\n");
    }
}
exports.checkIp = checkIp;
