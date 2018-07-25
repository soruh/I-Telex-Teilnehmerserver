"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const serialEachPromise_js_1 = require("../COMMONMODULES/serialEachPromise.js");
const connect_js_1 = require("./connect.js");
const misc_js_1 = require("./misc.js");
const updateQueue_js_1 = require("./updateQueue.js");
const util_1 = require("util");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
const logger = global.logger;
function sendQueue() {
    return updateQueue_js_1.default()
        .then(() => new Promise((resolve, reject) => {
        logger.verbose(colors_js_1.default.FgMagenta + "sending " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.Reset);
        if (readonly) {
            logger.verbose(colors_js_1.default.FgYellow + "Read-only mode -> aborting " + colors_js_1.default.FgCyan + "sendQueue" + colors_js_1.default.Reset);
            resolve();
        }
        else {
            misc_js_1.SqlQuery("SELECT * FROM teilnehmer;")
                .then(function (teilnehmer) {
                misc_js_1.SqlQuery("SELECT * FROM queue;")
                    .then(function (queue) {
                    if (queue.length > 0) {
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
                                    logger.verbose(colors_js_1.default.FgCyan + util_1.inspect(serverinf) + colors_js_1.default.Reset);
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
                                            logger.info(colors_js_1.default.FgGreen + 'connected to server ' + server[0].server + ': ' + serverinf.addresse + " on port " + serverinf.port + colors_js_1.default.Reset);
                                            client.writebuffer = [];
                                            serialEachPromise_js_1.default(server, serverdata => new Promise((resolve, reject) => {
                                                logger.verbose(colors_js_1.default.FgCyan + util_1.inspect(serverdata) + colors_js_1.default.Reset);
                                                var existing = null;
                                                for (let t of teilnehmer) {
                                                    if (t.uid == serverdata.message) {
                                                        existing = t;
                                                    }
                                                }
                                                if (existing) {
                                                    misc_js_1.SqlQuery("DELETE FROM queue WHERE uid=?;", [serverdata.uid])
                                                        .then(function (res) {
                                                        if (res.affectedRows > 0) {
                                                            client.writebuffer.push(existing); //TODO
                                                            logger.info(colors_js_1.default.FgGreen + "deleted queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgGreen + " from queue" + colors_js_1.default.Reset);
                                                            resolve();
                                                        }
                                                        else {
                                                            logger.info(colors_js_1.default.FgRed + "could not delete queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgRed + " from queue" + colors_js_1.default.Reset);
                                                            resolve();
                                                        }
                                                    })
                                                        .catch(logger.error);
                                                }
                                                else {
                                                    logger.verbose(colors_js_1.default.FgRed + "entry does not exist" + colors_js_1.default.FgCyan + colors_js_1.default.Reset);
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
                                                .catch(logger.error);
                                        })
                                            .catch(logger.error);
                                        // } else {
                                        // 	logger.warn(colors.FgYellow + "already connected to server " + server[0].server + colors.Reset);
                                        // 	resolve();
                                        // }
                                    }
                                    catch (e) {
                                        logger.error(colors_js_1.default.FgRed + util_1.inspect(e) + colors_js_1.default.Reset);
                                        resolve();
                                    }
                                }
                                else {
                                    misc_js_1.SqlQuery("DELETE FROM queue WHERE server=?;", [server[0].server])
                                        .then(resolve)
                                        .catch(logger.error);
                                }
                            })
                                .catch(logger.error);
                        }))
                            .then(() => {
                            resolve();
                        })
                            .catch(logger.error);
                    }
                    else {
                        logger.verbose(colors_js_1.default.FgYellow + "No queue!" + colors_js_1.default.Reset);
                        resolve();
                    }
                })
                    .catch(logger.error);
            })
                .catch(logger.error);
        }
    }));
}
exports.default = sendQueue;
