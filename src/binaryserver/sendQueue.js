"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../shared/config.js");
const constants = require("../shared/constants.js");
const connect_js_1 = require("./connect.js");
const misc_js_1 = require("../shared/misc.js");
const SQL_1 = require("../shared/SQL");
const updateQueue_js_1 = require("../shared/updateQueue.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
async function sendQueue() {
    await updateQueue_js_1.default();
    logger.log('debug', misc_js_1.inspect `sending Queue`);
    if (readonly) {
        logger.log('warning', misc_js_1.inspect `Read-only mode -> aborting sendQueue`);
        return;
    }
    const queue = await SQL_1.SqlAll("SELECT * FROM queue;", []);
    if (queue.length === 0) {
        logger.log('debug', misc_js_1.inspect `No queue!`);
        return;
    }
    let entriesByServer = {};
    for (let q of queue) {
        if (!entriesByServer[q.server])
            entriesByServer[q.server] = [];
        entriesByServer[q.server].push(q);
    }
    await Promise.all(Object.values(entriesByServer).map((entriesForServer) => (() => new Promise(async (resolve, reject) => {
        try {
            let server = entriesForServer[0].server;
            let serverinf = await SQL_1.SqlGet("SELECT * FROM servers WHERE uid=?;", [server]);
            logger.log('debug', misc_js_1.inspect `sending queue for ${serverinf}`);
            if (serverinf.version !== 1) {
                logger.log('network', misc_js_1.inspect `entries for server ${serverinf.address}:${serverinf.port} will be ignored, because it's version is ${serverinf.version} not ${1}`);
                resolve();
                return;
            }
            let client = await connect_js_1.default({
                host: serverinf.address,
                port: serverinf.port,
            }, resolve);
            logger.log('verbose network', misc_js_1.inspect `connected to server ${serverinf.uid}: ${serverinf.address} on port ${serverinf.port}`);
            client.writebuffer = [];
            for (let entry of entriesForServer) {
                const message = await SQL_1.SqlGet("SELECT * FROM teilnehmer where uid=?;", [entry.message]);
                if (!message) {
                    logger.log('debug', misc_js_1.inspect `entry does not exist`);
                    break;
                }
                let deleted = await SQL_1.SqlRun("DELETE FROM queue WHERE uid=?;", [entry.uid]);
                if (deleted.changes === 0) {
                    logger.log('warning', misc_js_1.inspect `could not delete queue entry ${entry.uid} from queue`);
                    break;
                }
                logger.log('debug', misc_js_1.inspect `deleted queue entry ${message.name} from queue`);
                client.writebuffer.push(message);
            }
            client.state = constants.states.RESPONDING;
            await client.sendPackage({
                type: 7,
                data: {
                    serverpin: config_js_1.default.serverPin,
                    version: 1,
                },
            });
        }
        catch (e) {
            logger.log('error', misc_js_1.inspect `error in sendQueue: ${e}`);
            resolve();
        }
    }))()));
}
exports.default = sendQueue;
