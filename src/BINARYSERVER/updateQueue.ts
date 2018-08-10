"use strict";
//#region imports
// import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from '../SHARED/serialEachPromise.js';
import {SqlQuery, inspect} from '../SHARED/misc.js';

//#endregion




async function updateQueue() {
	return new Promise((resolve, reject) => {
		logger.log('debug', inspect`updating Queue`);
		SqlQuery("SELECT  * FROM teilnehmer WHERE changed = 1;", [], true)
		.then(function (changed: ITelexCom.peerList) {
			if (changed.length > 0) {
				logger.log('queue', inspect`${changed.length} numbers to enqueue`);

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
													logger.log('queue', inspect`enqueued: ${message.number}`);
													//})
													//.catch(err=>{logger.log('error', inspect`${err}`)}); 
												})
												.catch(err=>{logger.log('error', inspect`${err}`)}); 
										} else if (qentry.length == 0) {
											SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
												.then(function () {
													//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
													//.then(function(){
													logger.log('queue', inspect`enqueued: ${message.number}`);
													//})
													//.catch(err=>{logger.log('error', inspect`${err}`)}); 
												})
												.catch(err=>{logger.log('error', inspect`${err}`)}); 
										} else {
											logger.log('error', inspect`duplicate queue entry!`);
											SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
												.then(() => SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)]))
												.then(() => {
													//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
													//.then(function(){
													logger.log('queue', inspect`enqueued: message.number`);
													//})
													//.catch(err=>{logger.log('error', inspect`${err}`)}); 
												})
												.catch(err=>{logger.log('error', inspect`${err}`)}); 
										}
									})
									.catch(err=>{logger.log('error', inspect`${err}`)})
								)
							)
							.then(() => {
								logger.log('queue', inspect`finished enqueueing`)
								logger.log('queue', inspect`reseting changed flags...`)
								return SqlQuery(`UPDATE teilnehmer SET changed = 0 WHERE uid=?${" or uid=?".repeat(changed.length-1)};`, changed.map(entry => entry.uid));
							})
							.then(() => {
								logger.log('queue', inspect`reset ${changed.length} changed flags.`);
								//sendQueue();
								resolve();
							})
							.catch(err=>{logger.log('error', inspect`${err}`)}); 
					} else {
						logger.log('warning', inspect`No configured servers -> aborting updateQueue`);
						resolve();
					}
				})
				.catch(err=>{logger.log('error', inspect`${err}`)}); 
			} else {
				logger.log('queue', inspect`no numbers to enqueue`);
				resolve();
			}
		})
		.catch(err=>{logger.log('error', inspect`${err}`)}); 
	});
}
export default updateQueue;