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
//#region imports
const config_js_1 = require("../SHARED/config.js");
const constants = require("../SHARED/constants.js");
const connect_js_1 = require("./connect.js");
const misc_js_1 = require("../SHARED/misc.js");
const SQL_1 = require("../SHARED/SQL");
const updateQueue_js_1 = require("./updateQueue.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
function sendQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        yield updateQueue_js_1.default();
        logger.log('debug', misc_js_1.inspect `sending Queue`);
        if (readonly) {
            logger.log('warning', misc_js_1.inspect `Read-only mode -> aborting sendQueue`);
            return;
        }
        const queue = yield SQL_1.SqlAll("SELECT * FROM queue;", []);
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
        yield Promise.all(Object.values(entriesByServer).map(entriesForServer => (() => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                let server = entriesForServer[0].server;
                let serverinf = yield SQL_1.SqlGet("SELECT * FROM servers WHERE uid=?;", [server]);
                logger.log('debug', misc_js_1.inspect `sending queue for ${serverinf}`);
                let client = yield connect_js_1.default({
                    host: serverinf.addresse,
                    port: +serverinf.port,
                }, resolve);
                client.servernum = server;
                logger.log('verbose network', misc_js_1.inspect `connected to server ${serverinf.uid}: ${serverinf.addresse} on port ${serverinf.port}`);
                client.writebuffer = [];
                for (let entry of entriesForServer) {
                    const message = yield SQL_1.SqlGet("SELECT * FROM teilnehmer where uid=?;", [entry.message]);
                    if (!message) {
                        logger.log('debug', misc_js_1.inspect `entry does not exist`);
                        break;
                    }
                    let deleted = yield SQL_1.SqlExec("DELETE FROM queue WHERE uid=?;", [entry.uid]);
                    if (deleted.changes === 0) {
                        logger.log('warning', misc_js_1.inspect `could not delete queue entry ${entry.uid} from queue`);
                        break;
                    }
                    logger.log('debug', misc_js_1.inspect `deleted queue entry ${message.name} from queue`);
                    client.writebuffer.push(message);
                }
                client.state = constants.states.RESPONDING;
                yield client.sendPackage({
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
        })))()));
    });
}
exports.default = sendQueue;
