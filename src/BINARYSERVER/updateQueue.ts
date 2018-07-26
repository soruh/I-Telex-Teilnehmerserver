"use strict";
//#region imports
// import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from '../SHARED/serialEachPromise.js';
import {SqlQuery, inspect} from '../SHARED/misc.js';

//#endregion


const logger = global.logger;

async function updateQueue() {
	return new Promise((resolve, reject) => {
		logger.verbose(inspect`${colors.FgMagenta}updating ${colors.FgCyan}Queue${colors.Reset}`);
		SqlQuery("SELECT  * FROM teilnehmer WHERE changed = 1;")
			.then(function (changed: ITelexCom.peerList) {
				if (changed.length > 0) {
					logger.info(inspect`${colors.FgCyan}${changed.length}${colors.FgGreen} numbers to enqueue${colors.Reset}`);

					SqlQuery("SELECT * FROM servers;")
						.then(function (servers: ITelexCom.serverList) {
							if (servers.length > 0) {
								serialEachPromise(servers, server =>
										serialEachPromise(changed, (message) =>
											SqlQuery("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
											.then(function (qentry: ITelexCom.queue) {
												if (qentry.length == 1) {
													SqlQuery("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [Math.floor(Date.now() / 1000), server.uid, message.uid])
														.then(function () {
															//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
															//.then(function(){
															logger.verbose(inspect`${colors.FgGreen}enqueued: ${colors.FgCyan}${message.number}${colors.Reset}`);
															//})
															//.catch(err=>{logger.error(inspect`${err}`)});
														})
														.catch(err=>{logger.error(inspect`${err}`)});
												} else if (qentry.length == 0) {
													SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
														.then(function () {
															//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
															//.then(function(){
															logger.verbose(inspect`${colors.FgGreen}enqueued: ${colors.FgCyan}${message.number}${colors.Reset}`);
															//})
															//.catch(err=>{logger.error(inspect`${err}`)});
														})
														.catch(err=>{logger.error(inspect`${err}`)});
												} else {
													logger.error(inspect`duplicate queue entry!`);
													SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
														.then(() => SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)]))
														.then(() => {
															//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
															//.then(function(){
															logger.verbose(inspect`${colors.FgGreen}enqueued: ${colors.FgCyan}message.number${colors.Reset}`);
															//})
															//.catch(err=>{logger.error(inspect`${err}`)});
														})
														.catch(err=>{logger.error(inspect`${err}`)});
												}
											})
											.catch(err=>{logger.error(inspect`${err}`)})
										)
									)
									.then(() => {
										logger.info(inspect`${colors.FgGreen}finished enqueueing${colors.Reset}`);
										logger.verbose(inspect`${colors.FgGreen}reseting changed flags...${colors.Reset}`);
										return SqlQuery(`UPDATE teilnehmer SET changed = 0 WHERE uid=?${" or uid=?".repeat(changed.length-1)};`, changed.map(entry => entry.uid));
									})
									.then(() => {
										logger.verbose(inspect`${colors.FgGreen}reset ${colors.FgCyan}${changed.length}${colors.FgGreen} changed flags.${colors.Reset}`);
										//sendQueue();
										resolve();
									})
									.catch(err=>{logger.error(inspect`${err}`)});
							} else {
								logger.warn(inspect`${colors.FgYellow}No configured servers -> aborting ${colors.FgCyan}updateQueue${colors.Reset}`);
								resolve();
							}
						})
						.catch(err=>{logger.error(inspect`${err}`)});
				} else {
					logger.verbose(inspect`${colors.FgYellow}no numbers to enqueue${colors.Reset}`);
					resolve();
				}
			})
			.catch(err=>{logger.error(inspect`${err}`)});
	});
}
export default updateQueue;