"use strict";
//#region imports

import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import serialEachPromise from '../SHARED/serialEachPromise.js';
import connect from './connect.js';
import {SqlQuery, inspect} from '../SHARED/misc.js';
import updateQueue from './updateQueue.js';

//#endregion


const readonly = (config.serverPin == null);


function sendQueue() {
	return updateQueue()
	.then(() => new Promise((resolve, reject) => {
		logger.log('debug', inspect`sending Queue`);
		if (readonly) {
			logger.log('warning', inspect`Read-only mode -> aborting sendQueue`);
			return void resolve();
		}
		SqlQuery("SELECT * FROM teilnehmer;", [], true)
		.then(function (teilnehmer: ITelexCom.peerList) {
			SqlQuery("SELECT * FROM queue;")
			.then(function (queue: ITelexCom.queue) {
				if (queue.length === 0) {
					logger.log('debug', inspect`No queue!`);
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
							logger.log('debug', inspect`sending queue for ${serverinf}`);
							try {
								connect({
									host: serverinf.addresse,
									port: +serverinf.port
								}, resolve)
								.then(client => {
									client.servernum = server[0].server;
									logger.log('verbose network', inspect`connected to server ${server[0].server}: ${serverinf.addresse} on port ${serverinf.port}`);
									client.writebuffer = [];
									serialEachPromise(server, serverdata =>
									new Promise((resolve, reject) => {
										var message: ITelexCom.peer = null;
										for (let t of teilnehmer) {
											if (t.uid == serverdata.message) {
												message = t;
												break;
											}
										}
										if (message) {
											SqlQuery("DELETE FROM queue WHERE uid=?;", [serverdata.uid])
											.then(function (res) {
												if (res.affectedRows > 0) {
													client.writebuffer.push(message);
													logger.log('debug', inspect`deleted queue entry ${message.name} from queue`);
													resolve();
												} else {
													logger.log('warning', inspect`could not delete queue entry ${serverdata.uid} from queue`);
													resolve();
												}
											})
											.catch(err=>{logger.log('error', inspect`${err}`)});
										} else {
											logger.log('debug', inspect`entry does not exist`);
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
									.catch(err=>{logger.log('error', inspect`${err}`)}); 
								})
								.catch(err=>{logger.log('error', inspect`${err}`)}); 
							} catch (e) {
								logger.log('error', inspect`${e}`);
								resolve();
							}
						} else {
							SqlQuery("DELETE FROM queue WHERE server=?;", [server[0].server])
							.then(resolve)
							.catch(err=>{logger.log('error', inspect`${err}`)}); 
						}
					})
					.catch(err=>{logger.log('error', inspect`${err}`)}); 
				})
				)
				.then(() => {
					resolve();
				})
				.catch(err=>{logger.log('error', inspect`${err}`)}); 
			})
			.catch(err=>{logger.log('error', inspect`${err}`)}); 
		})
		.catch(err=>{logger.log('error', inspect`${err}`)}); 
	}));
}

export default sendQueue;