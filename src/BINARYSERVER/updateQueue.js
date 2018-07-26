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
// import config from '../SHARED/config.js';
const colors_js_1 = require("../SHARED/colors.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const misc_js_1 = require("../SHARED/misc.js");
//#endregion
const logger = global.logger;
function updateQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgMagenta}updating ${colors_js_1.default.FgCyan}Queue${colors_js_1.default.Reset}`);
            misc_js_1.SqlQuery("SELECT  * FROM teilnehmer WHERE changed = 1;")
                .then(function (changed) {
                if (changed.length > 0) {
                    logger.info(misc_js_1.inspect `${colors_js_1.default.FgCyan}${changed.length}${colors_js_1.default.FgGreen} numbers to enqueue${colors_js_1.default.Reset}`);
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
                                        logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgGreen}enqueued: ${colors_js_1.default.FgCyan}${message.number}${colors_js_1.default.Reset}`);
                                        //})
                                        //.catch(err=>{logger.error(inspect`${err}`)});
                                    })
                                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                                }
                                else if (qentry.length == 0) {
                                    misc_js_1.SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
                                        .then(function () {
                                        //SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgGreen}enqueued: ${colors_js_1.default.FgCyan}${message.number}${colors_js_1.default.Reset}`);
                                        //})
                                        //.catch(err=>{logger.error(inspect`${err}`)});
                                    })
                                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                                }
                                else {
                                    logger.error(misc_js_1.inspect `duplicate queue entry!`);
                                    misc_js_1.SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
                                        .then(() => misc_js_1.SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)]))
                                        .then(() => {
                                        //SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgGreen}enqueued: ${colors_js_1.default.FgCyan}message.number${colors_js_1.default.Reset}`);
                                        //})
                                        //.catch(err=>{logger.error(inspect`${err}`)});
                                    })
                                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                                }
                            })
                                .catch(err => { logger.error(misc_js_1.inspect `${err}`); })))
                                .then(() => {
                                logger.info(misc_js_1.inspect `${colors_js_1.default.FgGreen}finished enqueueing${colors_js_1.default.Reset}`);
                                logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgGreen}reseting changed flags...${colors_js_1.default.Reset}`);
                                return misc_js_1.SqlQuery(`UPDATE teilnehmer SET changed = 0 WHERE uid=?${" or uid=?".repeat(changed.length - 1)};`, changed.map(entry => entry.uid));
                            })
                                .then(() => {
                                logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgGreen}reset ${colors_js_1.default.FgCyan}${changed.length}${colors_js_1.default.FgGreen} changed flags.${colors_js_1.default.Reset}`);
                                //sendQueue();
                                resolve();
                            })
                                .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                        }
                        else {
                            logger.warn(misc_js_1.inspect `${colors_js_1.default.FgYellow}No configured servers -> aborting ${colors_js_1.default.FgCyan}updateQueue${colors_js_1.default.Reset}`);
                            resolve();
                        }
                    })
                        .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
                }
                else {
                    logger.verbose(misc_js_1.inspect `${colors_js_1.default.FgYellow}no numbers to enqueue${colors_js_1.default.Reset}`);
                    resolve();
                }
            })
                .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
        });
    });
}
exports.default = updateQueue;
