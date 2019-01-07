"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../../shared/config.js");
const misc_js_1 = require("../../shared/misc.js");
const SQL_1 = require("../../shared/SQL");
const APICall_1 = require("./APICall");
const constants = require("../../shared/constants");
const updateQueue_js_1 = require("../../shared/updateQueue.js");
const readonly = (config_js_1.default.serverPin == null);
async function sendQueue() {
    await updateQueue_js_1.default();
    logger.log('queue', misc_js_1.inspect `sending Queue`);
    if (readonly) {
        logger.log('warning', misc_js_1.inspect `Read-only mode -> aborting sendQueue`);
        return;
    }
    const queue = await SQL_1.SqlAll("SELECT * FROM queue;", []);
    if (queue.length === 0) {
        logger.log('queue', misc_js_1.inspect `No queue!`);
        return;
    }
    let entriesByServer = {};
    for (let q of queue) {
        if (!entriesByServer[q.server])
            entriesByServer[q.server] = [];
        entriesByServer[q.server].push(q);
    }
    await Promise.all(Object.values(entriesByServer).map((entriesForServer) => (async () => {
        let server = entriesForServer[0].server;
        let serverinf = await SQL_1.SqlGet("SELECT * FROM servers WHERE uid=?;", [server]);
        logger.log('queue', misc_js_1.inspect `sending queue for ${serverinf}`);
        if (serverinf.version !== 2) {
            logger.log('queue', misc_js_1.inspect `entries for server ${serverinf.address}:${serverinf.port} will be ignored, because it's version is ${serverinf.version} not ${2}`);
            return;
        }
        let data = await SQL_1.SqlAll(`SELECT ${constants.peerProperties} FROM teilnehmer WHERE uid IN (${entriesForServer.map(x => '?').join(', ')});`, entriesForServer.map(x => x.message));
        let res = await APICall_1.default('PUT', serverinf.address, serverinf.port, '/admin/entries', data);
        logger.log('debug', misc_js_1.inspect `${res}`);
        await SQL_1.SqlRun(`DELETE FROM queue WHERE uid IN (${entriesForServer.map(x => '?').join(', ')});`, entriesForServer.map(x => x.uid));
    })()));
}
exports.default = sendQueue;
