"use strict";
//#region imports

import config from '../SHARED/config.js';
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../SHARED/constants.js";
import connect from './connect.js';
import { inspect } from '../SHARED/misc.js';
import { SqlQuery, SqlAll, SqlEach, SqlGet, SqlExec } from '../SHARED/SQL';

import updateQueue from './updateQueue.js';

//#endregion


const readonly = (config.serverPin == null);


async function sendQueue() {
	await updateQueue();
	logger.log('debug', inspect`sending Queue`);
	if (readonly) {
		logger.log('warning', inspect`Read-only mode -> aborting sendQueue`);
		return;
	}
	const queue:ITelexCom.queue = await SqlAll("SELECT * FROM queue;", []);
	if (queue.length === 0) {
		logger.log('debug', inspect`No queue!`);
		return;
	}
	let entriesByServer: {
		[index: number]: ITelexCom.queueEntry[];
	} = {};
	for (let q of queue) {
		if (!entriesByServer[q.server]) entriesByServer[q.server] = [];
		entriesByServer[q.server].push(q);
	}
	await Promise.all((Object.values(entriesByServer) as ITelexCom.queueEntry[][]).map(entriesForServer=> (()=>
	new Promise(async (resolve, reject) => {
		try {
			let server = entriesForServer[0].server;

			let serverinf:ITelexCom.server = await SqlGet("SELECT * FROM servers WHERE uid=?;", [server]);
			
			logger.log('debug', inspect`sending queue for ${serverinf}`);

			let client = await connect({
				host: serverinf.addresse,
				port: +serverinf.port,
			}, resolve);

			client.servernum = server;
			
			logger.log('verbose network', inspect`connected to server ${serverinf.uid}: ${serverinf.addresse} on port ${serverinf.port}`);
			client.writebuffer = [];
			for(let entry of entriesForServer){
				const message:ITelexCom.Peer = await SqlGet("SELECT * FROM teilnehmer where uid=?;", [entry.message]);
				if (!message) {
					logger.log('debug', inspect`entry does not exist`);
					break;
				}

				let deleted = await SqlExec("DELETE FROM queue WHERE uid=?;", [entry.uid]);

				if (deleted.changes === 0) {
					logger.log('warning', inspect`could not delete queue entry ${entry.uid} from queue`);
					break;
				}

				logger.log('debug', inspect`deleted queue entry ${message.name} from queue`);
				client.writebuffer.push(message);
			}
			
			client.state = constants.states.RESPONDING;
			
			await client.sendPackage({
				type: 7,
				data: {
					serverpin: config.serverPin,
					version: 1,
				},
			});
		} catch (e) {
			logger.log('error', inspect`error in sendQueue: ${e}`);
			resolve();
		}
	})
	)()));
}

export default sendQueue;
