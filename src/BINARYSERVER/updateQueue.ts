"use strict";
//#region imports
import config from '../COMMONMODULES/config.js';
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import colors from "../COMMONMODULES/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from '../COMMONMODULES/serialEachPromise.js';
import { SqlQuery } from './misc.js';

//#endregion

const cv = config.cv;

async function updateQueue() {
	return new Promise((resolve, reject)=>{
		if (cv(2)) ll(colors.FgMagenta + "updating " + colors.FgCyan + "Queue" + colors.Reset);
		SqlQuery("SELECT  * FROM teilnehmer WHERE changed = 1;")
		.then(function (changed:ITelexCom.peerList) {
			if (changed.length > 0) {
				if (cv(2)) {
					var changed_numbers = [];
					for (let o of changed) {
						changed_numbers.push(o.number);
					}
					ll(colors.FgGreen + "numbers to enqueue:" + colors.FgCyan, changed_numbers, colors.Reset);
				}
				if (cv(1) && !cv(2)) ll(colors.FgCyan + changed.length + colors.FgGreen + " numbers to enqueue" + colors.Reset);

				SqlQuery("SELECT * FROM servers;")
				.then(function (servers:ITelexCom.serverList) {
					if (servers.length > 0) {
						serialEachPromise(servers, server => 
							serialEachPromise(changed, (message) =>
								SqlQuery("SELECT * FROM queue WHERE server = ? AND message = ?;" ,[server.uid, message.uid])
								.then(function (qentry:ITelexCom.queue) {
									if (qentry.length == 1) {
										SqlQuery("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;",[Math.floor(Date.now() / 1000),server.uid, message.uid])
										.then(function () {
											//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
											//.then(function(){
											if (cv(2)) ll(colors.FgGreen, "enqueued:", colors.FgCyan, message.number, colors.Reset);
											//})
											//.catch(lle);
										})
										.catch(lle);
									} else if (qentry.length == 0) {
										SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)",[server.uid, message.uid, Math.floor(Date.now() / 1000)])
										.then(function () {
											//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
											//.then(function(){
											if (cv(2)) ll(colors.FgGreen, "enqueued:", colors.FgCyan, message.number, colors.Reset);
											//})
											//.catch(lle);
										})
										.catch(lle);
									} else {
										lle("duplicate queue entry!");
										SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;",[server.uid, message.uid])
										.then(()=>SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)",[server.uid,message.uid,Math.floor(Date.now() / 1000)]))
										.then(()=>{
											//SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
											//.then(function(){
											if (cv(2)) ll(colors.FgGreen, "enqueued:", colors.FgCyan, message.number, colors.Reset);
											//})
											//.catch(lle);
										})
										.catch(lle);
									}
								})
								.catch(lle)
							)
						)
						.then(()=>{
							if (cv(1)) ll(colors.FgGreen + "finished enqueueing" + colors.Reset);
							if (cv(2)) ll(colors.FgGreen + "reseting changed flags..." + colors.Reset);
							return SqlQuery(`UPDATE teilnehmer SET changed = 0 WHERE uid=?${" or uid=?".repeat(changed.length-1)};`, changed.map(entry => entry.uid));
						})
						.then(()=>{
							if (cv(2)) ll(colors.FgGreen + "reset " + colors.FgCyan + changed.length + colors.FgGreen + " changed flags." + colors.Reset);
							//sendQueue();
							resolve();
						})
						.catch(lle);
					} else {
						ll(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "updateQueue" + colors.Reset);
						resolve();
					}
				})
				.catch(lle);
			} else {
				if (cv(2)) ll(colors.FgYellow + "no numbers to enqueue" + colors.Reset);
				resolve();
			}
		})
		.catch(lle);
	});
}
export default updateQueue;