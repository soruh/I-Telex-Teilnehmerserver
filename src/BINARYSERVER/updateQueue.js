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
const misc_js_1 = require("../SHARED/misc.js");
const SQL_1 = require("../SHARED/SQL");
//#endregion
function updateQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        logger.log('debug', misc_js_1.inspect `updating Queue`);
        const changed = yield SQL_1.SqlAll("SELECT  * FROM teilnehmer WHERE changed = 1;", []);
        if (changed.length > 0) {
            logger.log('queue', misc_js_1.inspect `${changed.length} numbers to enqueue`);
            const servers = yield SQL_1.SqlAll("SELECT * FROM servers;", []);
            if (servers.length > 0) {
                for (const server of servers) {
                    for (const message of changed) {
                        const qentry = yield SQL_1.SqlGet("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid]);
                        if (qentry) {
                            yield SQL_1.SqlExec("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [misc_js_1.timestamp(), server.uid, message.uid]);
                            yield SQL_1.SqlExec("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
                            logger.log('queue', misc_js_1.inspect `enqueued: ${message.number}`);
                        }
                        else {
                            yield SQL_1.SqlExec("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, misc_js_1.timestamp()]);
                            yield SQL_1.SqlExec("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
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
    });
}
exports.default = updateQueue;
