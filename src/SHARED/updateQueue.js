"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_js_1 = require("./misc.js");
const SQL_1 = require("./SQL");
async function updateQueue() {
    logger.log('debug', misc_js_1.inspect `updating Queue`);
    const changed = await SQL_1.SqlAll("SELECT  * FROM teilnehmer WHERE changed = 1;", [], true);
    if (changed.length > 0) {
        logger.log('queue', misc_js_1.inspect `${changed.length} numbers to enqueue`);
        const servers = await SQL_1.SqlAll("SELECT * FROM servers;", []);
        if (servers.length > 0) {
            for (const server of servers) {
                for (const message of changed) {
                    const qentry = await SQL_1.SqlGet("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid]);
                    if (qentry) {
                        await SQL_1.SqlRun("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [misc_js_1.timestamp(), server.uid, message.uid]);
                        await SQL_1.SqlRun("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
                        logger.log('queue', misc_js_1.inspect `enqueued: ${message.number}`);
                    }
                    else {
                        await SQL_1.SqlRun("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, misc_js_1.timestamp()]);
                        await SQL_1.SqlRun("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
                        logger.log('queue', misc_js_1.inspect `enqueued: ${message.number}`);
                    }
                }
            }
        }
        else {
            logger.log('warning', misc_js_1.inspect `No configured servers -> aborting updateQueue`);
        }
    }
    else {
        logger.log('queue', misc_js_1.inspect `no numbers to enqueue`);
    }
}
exports.default = updateQueue;
