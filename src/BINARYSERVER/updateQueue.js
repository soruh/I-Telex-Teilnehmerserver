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
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const misc_js_1 = require("../SHARED/misc.js");
//#endregion
function updateQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            logger.log('debug', misc_js_1.inspect `updating Queue`);
            misc_js_1.SqlQuery("SELECT  * FROM teilnehmer WHERE changed = 1;", [], false)
                .then(function (changed) {
                if (changed.length > 0) {
                    logger.log('queue', misc_js_1.inspect `${changed.length} numbers to enqueue`);
                    misc_js_1.SqlQuery("SELECT * FROM servers;")
                        .then(function (servers) {
                        if (servers.length > 0) {
                            serialEachPromise_js_1.default(servers, server => serialEachPromise_js_1.default(changed, (message) => misc_js_1.SqlQuery("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
                                .then(function (qentry) {
                                if (qentry.length == 1) {
                                    misc_js_1.SqlQuery("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [Math.floor(Date.now() / 1000), server.uid, message.uid])
                                        .then(function () {
                                        //SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        logger.log('queue', misc_js_1.inspect `enqueued: ${message.number}`);
                                        //})
                                        //.catch(err=>{logger.log('error', inspect`${err}`)}); 
                                    })
                                        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                                }
                                else if (qentry.length == 0) {
                                    misc_js_1.SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
                                        .then(function () {
                                        //SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        logger.log('queue', misc_js_1.inspect `enqueued: ${message.number}`);
                                        //})
                                        //.catch(err=>{logger.log('error', inspect`${err}`)}); 
                                    })
                                        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                                }
                                else {
                                    logger.log('error', misc_js_1.inspect `duplicate queue entry!`);
                                    misc_js_1.SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
                                        .then(() => misc_js_1.SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)]))
                                        .then(() => {
                                        //SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        logger.log('queue', misc_js_1.inspect `enqueued: message.number`);
                                        //})
                                        //.catch(err=>{logger.log('error', inspect`${err}`)}); 
                                    })
                                        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                                }
                            })
                                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); })))
                                .then(() => {
                                logger.log('queue', misc_js_1.inspect `finished enqueueing`);
                                logger.log('queue', misc_js_1.inspect `reseting changed flags...`);
                                return misc_js_1.SqlQuery(`UPDATE teilnehmer SET changed = 0 WHERE uid=?${" or uid=?".repeat(changed.length - 1)};`, changed.map(entry => entry.uid));
                            })
                                .then(() => {
                                logger.log('queue', misc_js_1.inspect `reset ${changed.length} changed flags.`);
                                //sendQueue();
                                resolve();
                            })
                                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                        }
                        else {
                            logger.log('warning', misc_js_1.inspect `No configured servers -> aborting updateQueue`);
                            resolve();
                        }
                    })
                        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                }
                else {
                    logger.log('queue', misc_js_1.inspect `no numbers to enqueue`);
                    resolve();
                }
            })
                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
        });
    });
}
exports.default = updateQueue;
