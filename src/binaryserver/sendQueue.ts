"use strict";
//#region imports

import config from '../shared/config.js';
import * as ITelexCom from "../binaryserver/ITelexCom.js";
import * as constants from "../shared/constants.js";
import connect from './connect.js';
import { inspect } from '../shared/misc.js';
import { SqlAll, SqlEach, SqlGet, SqlRun, queueRow, serversRow, teilnehmerRow } from '../shared/SQL';

import updateQueue from '../shared/updateQueue.js';

//#endregion


const readonly = (config.serverPin == null);


async function sendQueue() {
	await updateQueue();
	logger.log('debug', inspect`sending Queue`);
	if (readonly) {
		logger.log('warning', inspect`Read-only mode -> aborting sendQueue`);
		return;
	}
	
	const queue = await SqlAll<queueRow>("SELECT * FROM queue;", []);
	if (queue.length === 0) {
		logger.log('debug', inspect`No queue!`);
		return;
	}
	let entriesByServer: {
		[index: number]: queueRow[];
	} = {};
	for (let q of queue) {
		if (!entriesByServer[q.server]) entriesByServer[q.server] = [];
		entriesByServer[q.server].push(q);
	}
	await Promise.all(Object.values(entriesByServer).map((entriesForServer:queueRow[])=> (()=>
	new Promise(async (resolve, reject) => {
		try {
			let server = entriesForServer[0].server;

			let serverinf = await SqlGet<serversRow>("SELECT * FROM servers WHERE uid=?;", [server]);
			
			
			if(!serverinf){
				logger.log('network', inspect`server ${server} no longer exists.`);
				await SqlGet<serversRow>("DELETE FROM queue WHERE server=?;", [server]);
				
				resolve();
				return;
			}
			
			logger.log('debug', inspect`sending queue for ${serverinf}`);

			if(serverinf.version !== 1){
				logger.log('network', inspect`entries for server ${serverinf.address}:${serverinf.port} will be ignored, because its version is ${serverinf.version} not ${1}`);
				resolve();
				return;
			}

			let client = await connect({
				host: serverinf.address,
				port: serverinf.port,
			}, resolve);
			
			logger.log('verbose network', inspect`connected to server ${serverinf.uid}: ${serverinf.address} on port ${serverinf.port}`);
			client.writebuffer = [];
			for(let entry of entriesForServer){
				const message = await SqlGet<teilnehmerRow>("SELECT * FROM teilnehmer where uid=?;", [entry.message]);
				if (!message) {
					logger.log('debug', inspect`entry does not exist`);
					break;
				}

				let deleted = await SqlRun("DELETE FROM queue WHERE uid=?;", [entry.uid]);

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
