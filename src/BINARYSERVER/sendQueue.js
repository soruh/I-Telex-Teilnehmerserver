"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../SHARED/config.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const connect_js_1 = require("./connect.js");
const misc_js_1 = require("../SHARED/misc.js");
const updateQueue_js_1 = require("./updateQueue.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
const logger = global.logger;
function sendQueue() {
    return updateQueue_js_1.default()
        .then(() => new Promise((resolve, reject) => {
        logger.verbose(misc_js_1.inspect `sending Queue`);
        if (readonly) {
            logger.verbose(misc_js_1.inspect `Read-only mode -> aborting sendQueue`);
            return void resolve();
        }
        misc_js_1.SqlQuery("SELECT * FROM teilnehmer;")
            .then(function (teilnehmer) {
            misc_js_1.SqlQuery("SELECT * FROM queue;")
                .then(function (queue) {
                if (queue.length === 0) {
                    logger.verbose(misc_js_1.inspect `No queue!`);
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
                            logger.verbose(misc_js_1.inspect `${serverinf}`);
                            try {
                                // var isConnected = false;
                                // for (let key in connections) {
                                // 	if (connections.has(key)) {
                                // 		var c = connections[key];
                                // 	}
                                // 	if (c.servernum == server[0].server) {
                                // 		var isConnected = true;
                                // 	}
                                // }
                                // let isConnected:client = connections.find(connection=>connection.servernum == server[0].server);
                                // if (!isConnected) {
                                connect_js_1.default(resolve, {
                                    host: serverinf.addresse,
                                    port: +serverinf.port
                                })
                                    .then(client => {
                                    client.servernum = server[0].server;
                                    logger.info(misc_js_1.inspect `connected to server ${server[0].server}: ${serverinf.addresse} on port ${serverinf.port}`);
                                    client.writebuffer = [];
                                    serialEachPromise_js_1.default(server, serverdata => new Promise((resolve, reject) => {
                                        logger.verbose(misc_js_1.inspect `${serverdata}`);
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
                                                    logger.info(misc_js_1.inspect `deleted queue entry ${existing.name} from queue`);
                                                    resolve();
                                                }
                                                else {
                                                    logger.warn(misc_js_1.inspect `could not delete queue entry ${existing.name} from queue`);
                                                    resolve();
                                                }
                                            })
                                                .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                                        }
                                        else {
                                            logger.verbose(misc_js_1.inspect `entry does not exist`);
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
                                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                                })
                                    .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                                // } else {
                                // 	logger.warn(inspect`already connected to server ${server[0].server}`);
                                // 	resolve();
                                // }
                            }
                            catch (e) {
                                logger.error(misc_js_1.inspect `${e}`);
                                resolve();
                            }
                        }
                        else {
                            misc_js_1.SqlQuery("DELETE FROM queue WHERE server=?;", [server[0].server])
                                .then(resolve)
                                .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                        }
                    })
                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                }))
                    .then(() => {
                    resolve();
                })
                    .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
            })
                .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
        })
            .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
    }));
}
exports.default = sendQueue;
