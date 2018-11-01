"use strict";
//#region imports
// import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from '../SHARED/serialEachPromise.js';
import { inspect, timestamp } from '../SHARED/misc.js';
import { SqlQuery, SqlAll, SqlEach, SqlGet, SqlExec } from '../SHARED/SQL';


//#endregion




async function updateQueue() {
	logger.log('debug', inspect`updating Queue`);
	const changed: ITelexCom.peerList = await SqlAll("SELECT  * FROM teilnehmer WHERE changed = 1;", []);
	if (changed.length > 0) {
		logger.log('queue', inspect`${changed.length} numbers to enqueue`);

		const servers: ITelexCom.serverList = await SqlAll("SELECT * FROM servers;", []);
		if (servers.length > 0) {
			for(const server of servers){
				for(const message of changed){
					const qentry: ITelexCom.queueEntry = await SqlGet("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid]);
					if (qentry) {
						await SqlExec("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [timestamp(), server.uid, message.uid]);
						await SqlExec("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
						logger.log('queue', inspect`enqueued: ${message.number}`);
					} else {
						await SqlExec("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, timestamp()]);
						await SqlExec("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
						logger.log('queue', inspect`enqueued: ${message.number}`);
					}
				}
			}
		} else {
			logger.log('warning', inspect`No configured servers -> aborting updateQueue`);
		}
	} else {
		logger.log('queue', inspect`no numbers to enqueue`);
	}
}
export default updateQueue;
