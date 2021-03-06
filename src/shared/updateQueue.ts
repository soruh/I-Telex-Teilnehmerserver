"use strict";
import { inspect, timestamp } from './misc.js';
import { SqlAll, SqlEach, SqlGet, SqlRun, teilnehmerRow, serversRow, queueRow } from './SQL';



async function updateQueue() {
	logger.log('debug', inspect`updating Queue`);
	const changed = await SqlAll<teilnehmerRow>("SELECT  * FROM teilnehmer WHERE changed = 1;", [], true);
	if (changed.length > 0) {
		logger.log('queue', inspect`${changed.length} numbers to enqueue`);

		const servers = await SqlAll<serversRow>("SELECT * FROM servers;", []);
		if (servers.length > 0) {
			for(const server of servers){
				for(const message of changed){
					const qentry = await SqlGet<queueRow>("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid]);
					if (qentry) {
						await SqlRun("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [timestamp(), server.uid, message.uid]);
						await SqlRun("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
						logger.log('queue', inspect`enqueued: ${message.number}`);
					} else {
						await SqlRun("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, timestamp()]);
						await SqlRun("UPDATE teilnehmer SET changed = 0 WHERE uid=?;", [message.uid]);
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
