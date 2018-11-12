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
const config_js_1 = require("../../SHARED/config.js");
const misc_js_1 = require("../../SHARED/misc.js");
const SQL_1 = require("../../SHARED/SQL");
const APICall_1 = require("./APICall");
const constants = require("../../SHARED/constants");
const updateQueue_js_1 = require("../../SHARED/updateQueue.js");
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
        yield Promise.all(Object.values(entriesByServer).map((entriesForServer) => (() => __awaiter(this, void 0, void 0, function* () {
            let server = entriesForServer[0].server;
            let serverinf = yield SQL_1.SqlGet("SELECT * FROM servers WHERE uid=?;", [server]);
            logger.log('debug', misc_js_1.inspect `sending queue for ${serverinf}`);
            if (serverinf.version !== 2) {
                logger.log('debug', misc_js_1.inspect `entries for server ${serverinf.address}:${serverinf.port} will be ignored, because it's version is ${serverinf.version} not ${2}`);
                return;
            }
            let data = yield SQL_1.SqlAll(`SELECT ${constants.peerProperties} FROM teilnehmer WHERE uid IN (${entriesForServer.map(x => '?').join(', ')});`, entriesForServer.map(x => x.message));
            let res = yield APICall_1.default('PUT', serverinf.address, serverinf.port, '/admin/entries', data);
            logger.log('warning', misc_js_1.inspect `${res}`);
            yield SQL_1.SqlRun(`DELETE FROM queue WHERE uid IN (${entriesForServer.map(x => '?').join(', ')});`, entriesForServer.map(x => x.uid));
        }))()));
    });
}
exports.default = sendQueue;
