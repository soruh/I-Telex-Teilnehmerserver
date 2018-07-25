"use strict";
//#region imports
// import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from '../COMMONMODULES/serialEachPromise.js';
import {SqlQuery} from '../COMMONMODULES/misc.js';

//#endregion


const logger = global.logger;

async function updateQueue() {
	return new Promise((resolve, reject) => {
		logger.verbose(colors.FgMagenta + "updating " + colors.FgCyan + "Queue" + colors.Reset);
		SqlQuery("SELECT  * FROM teilnehmer WHERE changed = 1;")
			.then(function (changed: ITelexCom.peerList) {
				if (changed.length > 0) {
					logger.info(colors.FgCyan + changed.length + colors.FgGreen + " numbers to enqueue" + colors.Reset);

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
															logger.verbose(colors.FgGreen + "enqueued:" + colors.FgCyan + message.number + colors.Reset);
															//})
															//.catch(logger.error);
														})
														.catch(logger.error);
												} else if (qentry.length == 0) {
													SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
														.then(function () {
															//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
															//.then(function(){
															logger.verbose(colors.FgGreen + "enqueued:" + colors.FgCyan + message.number + colors.Reset);
															//})
															//.catch(logger.error);
														})
														.catch(logger.error);
												} else {
													logger.error("duplicate queue entry!");
													SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
														.then(() => SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)]))
														.then(() => {
															//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
															//.then(function(){
															logger.verbose(colors.FgGreen + "enqueued:" + colors.FgCyan + message.number + colors.Reset);
															//})
															//.catch(logger.error);
														})
														.catch(logger.error);
												}
											})
											.catch(logger.error)
										)
									)
									.then(() => {
										logger.info(colors.FgGreen + "finished enqueueing" + colors.Reset);
										logger.verbose(colors.FgGreen + "reseting changed flags..." + colors.Reset);
										return SqlQuery(`UPDATE teilnehmer SET changed = 0 WHERE uid=?${" or uid=?".repeat(changed.length-1)};`, changed.map(entry => entry.uid));
									})
									.then(() => {
										logger.verbose(colors.FgGreen + "reset " + colors.FgCyan + changed.length + colors.FgGreen + " changed flags." + colors.Reset);
										//sendQueue();
										resolve();
									})
									.catch(logger.error);
							} else {
								logger.warn(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "updateQueue" + colors.Reset);
								resolve();
							}
						})
						.catch(logger.error);
				} else {
					logger.verbose(colors.FgYellow + "no numbers to enqueue" + colors.Reset);
					resolve();
				}
			})
			.catch(logger.error);
	});
}
export default updateQueue;