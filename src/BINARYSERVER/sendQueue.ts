"use strict";
//#region imports

import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import serialEachPromise from '../SHARED/serialEachPromise.js';
import connect from './connect.js';
import {SqlQuery, inspect} from '../SHARED/misc.js';
import updateQueue from './updateQueue.js';

//#endregion


const readonly = (config.serverPin == null);
const logger = global.logger;

function sendQueue() {
	return updateQueue()
	.then(() => new Promise((resolve, reject) => {
		logger.verbose(inspect`${colors.FgMagenta}sending ${colors.FgCyan}Queue${colors.Reset}`);
		if (readonly) {
			logger.verbose(inspect`${colors.FgYellow}Read-only mode -> aborting ${colors.FgCyan}sendQueue${colors.Reset}`);
			return void resolve();
		}
		SqlQuery("SELECT * FROM teilnehmer;")
		.then(function (teilnehmer: ITelexCom.peerList) {
			SqlQuery("SELECT * FROM queue;")
			.then(function (queue: ITelexCom.queue) {
				if (queue.length === 0) {
					logger.verbose(inspect`${colors.FgYellow}No queue!${colors.Reset}`);
					return void resolve();
				}

				var servers: {
					[index: number]: ITelexCom.queueEntry[]
				} = {};
				for (let q of queue) {
					if (!servers[q.server]) servers[q.server] = [];
					servers[q.server].push(q);
				}
				serialEachPromise(( < any > Object).values(servers), (server: ITelexCom.queueEntry[]) =>
				new Promise((resolve, reject) => {
					SqlQuery("SELECT  * FROM servers WHERE uid=?;", [server[0].server])
					.then(function (result2: ITelexCom.serverList) {
						if (result2.length == 1) {
							var serverinf = result2[0];
							logger.verbose(inspect`${colors.FgCyan}${serverinf}${colors.Reset}`);
							try {
								// var isConnected = false;
								// for (let key in connections) {
								// 	if (connections.has(key)) {
								// 		var c = connections[key];
								// 	}
								// 	if (c.servernum == server[0].server) {
								// 		var isConnected = true;
								// 	}
								// }
								// let isConnected:client = connections.find(connection=>connection.servernum == server[0].server);

								// if (!isConnected) {
								connect(resolve, {
									host: serverinf.addresse,
									port: +serverinf.port
								})
								.then(client => {
									client.servernum = server[0].server;
									logger.info(inspect`${colors.FgGreen}connected to server ${server[0].server}: ${serverinf.addresse} on port ${serverinf.port}${colors.Reset}`);
									client.writebuffer = [];
									serialEachPromise(server, serverdata =>
									new Promise((resolve, reject) => {
										logger.verbose(inspect`${colors.FgCyan}${serverdata}${colors.Reset}`);
										var existing: ITelexCom.peer = null;
										for (let t of teilnehmer) {
											if (t.uid == serverdata.message) {
												existing = t;
												break;
											}
										}
										if (existing) {
											SqlQuery("DELETE FROM queue WHERE uid=?;", [serverdata.uid])
											.then(function (res) {
												if (res.affectedRows > 0) {
													client.writebuffer.push(existing);
													logger.info(inspect`${colors.FgGreen}deleted queue entry ${colors.FgCyan}${existing.name}${colors.FgGreen} from queue${colors.Reset}`);
													resolve();
												} else {
													logger.warn(inspect`${colors.FgRed}could not delete queue entry ${colors.FgCyan}${existing.name}${colors.FgRed} from queue${colors.Reset}`);
													resolve();
												}
											})
											.catch(err=>{logger.error(inspect`${err}`)});
										} else {
											logger.verbose(inspect`${colors.FgRed}entry does not exist${colors.Reset}`);
											resolve();
										}
									})
									)
									.then(() => {
										client.connection.write(ITelexCom.encPackage({
											type: 7,
											data: {
												serverpin: config.serverPin,
												version: 1
											}
										}), () => {
											client.state = constants.states.RESPONDING;
											resolve();
										});
									})
									.catch(err=>{logger.error(inspect`${err}`)});
								})
								.catch(err=>{logger.error(inspect`${err}`)});
							// } else {
							// 	logger.warn(inspect`${colors.FgYellow}already connected to server ${server[0].server}${colors.Reset}`);
							// 	resolve();
							// }
							} catch (e) {
								logger.error(inspect`${colors.FgRed}${e}${colors.Reset}`);
								resolve();
							}
						} else {
							SqlQuery("DELETE FROM queue WHERE server=?;", [server[0].server])
							.then(resolve)
							.catch(err=>{logger.error(inspect`${err}`)});
						}
					})
					.catch(err=>{logger.error(inspect`${err}`)});
				})
				)
				.then(() => {
					resolve();
				})
				.catch(err=>{logger.error(inspect`${err}`)});
			})
			.catch(err=>{logger.error(inspect`${err}`)});
		})
		.catch(err=>{logger.error(inspect`${err}`)});
	}));
}

export default sendQueue;