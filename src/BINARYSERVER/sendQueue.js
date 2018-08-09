"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../SHARED/config.js");
// import colors from "../SHARED/colors.js";
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const connect_js_1 = require("./connect.js");
const misc_js_1 = require("../SHARED/misc.js");
const updateQueue_js_1 = require("./updateQueue.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
function sendQueue() {
    return updateQueue_js_1.default()
        .then(() => new Promise((resolve, reject) => {
        logger.log('debug', misc_js_1.inspect `sending Queue`);
        if (readonly) {
            logger.log('warning', misc_js_1.inspect `Read-only mode -> aborting sendQueue`);
            return void resolve();
        }
        misc_js_1.SqlQuery("SELECT * FROM teilnehmer;", [], false)
            .then(function (teilnehmer) {
            misc_js_1.SqlQuery("SELECT * FROM queue;")
                .then(function (queue) {
                if (queue.length === 0) {
                    logger.log('debug', misc_js_1.inspect `No queue!`);
                    return void resolve();
                }
                var servers = {};
                for (let q of queue) {
                    if (!servers[q.server])
                        servers[q.server] = [];
                    servers[q.server].push(q);
                }
                serialEachPromise_js_1.default(Object.values(servers), (server) => new Promise((resolve, reject) => {
                    misc_js_1.SqlQuery("SELECT  * FROM servers WHERE uid=?;", [server[0].server])
                        .then(function (result2) {
                        if (result2.length == 1) {
                            var serverinf = result2[0];
                            logger.log('debug', misc_js_1.inspect `sending queue for ${serverinf}`);
                            try {
                                connect_js_1.default(resolve, {
                                    host: serverinf.addresse,
                                    port: +serverinf.port
                                })
                                    .then(client => {
                                    client.servernum = server[0].server;
                                    logger.log('verbose network', misc_js_1.inspect `connected to server ${server[0].server}: ${serverinf.addresse} on port ${serverinf.port}`);
                                    client.writebuffer = [];
                                    serialEachPromise_js_1.default(server, serverdata => new Promise((resolve, reject) => {
                                        var existing = null;
                                        for (let t of teilnehmer) {
                                            if (t.uid == serverdata.message) {
                                                existing = t;
                                                break;
                                            }
                                        }
                                        if (existing) {
                                            misc_js_1.SqlQuery("DELETE FROM queue WHERE uid=?;", [serverdata.uid])
                                                .then(function (res) {
                                                if (res.affectedRows > 0) {
                                                    client.writebuffer.push(existing);
                                                    logger.log('debug', misc_js_1.inspect `deleted queue entry ${existing.name} from queue`);
                                                    resolve();
                                                }
                                                else {
                                                    logger.log('warning', misc_js_1.inspect `could not delete queue entry ${existing.name} from queue`);
                                                    resolve();
                                                }
                                            })
                                                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                                        }
                                        else {
                                            logger.log('debug', misc_js_1.inspect `entry does not exist`);
                                            resolve();
                                        }
                                    }))
                                        .then(() => {
                                        client.connection.write(ITelexCom.encPackage({
                                            type: 7,
                                            data: {
                                                serverpin: config_js_1.default.serverPin,
                                                version: 1
                                            }
                                        }), () => {
                                            client.state = constants.states.RESPONDING;
                                            resolve();
                                        });
                                    })
                                        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                                })
                                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                            }
                            catch (e) {
                                logger.log('error', misc_js_1.inspect `${e}`);
                                resolve();
                            }
                        }
                        else {
                            misc_js_1.SqlQuery("DELETE FROM queue WHERE server=?;", [server[0].server])
                                .then(resolve)
                                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                        }
                    })
                        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                }))
                    .then(() => {
                    resolve();
                })
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
            })
                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
        })
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    }));
}
exports.default = sendQueue;
