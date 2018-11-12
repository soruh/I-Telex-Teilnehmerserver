
import config from '../../SHARED/config.js';
import { inspect } from "../../SHARED/misc.js";
import { SqlAll, SqlEach, SqlGet, SqlRun, serversRow, teilnehmerRow, queueRow } from '../../SHARED/SQL';
import APIcall from './APICall';
import * as constants from '../../SHARED/constants';
import updateQueue from '../../SHARED/updateQueue.js';


const readonly = (config.serverPin == null);


async function sendQueue(){
	await updateQueue();

	logger.log('admin', inspect`sending Queue`);
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
	
	await Promise.all(Object.values(entriesByServer).map((entriesForServer:queueRow[])=> (async ()=> {
		let server = entriesForServer[0].server;

		let serverinf = await SqlGet<serversRow>("SELECT * FROM servers WHERE uid=?;", [server]);
		
		logger.log('debug', inspect`sending queue for ${serverinf}`);

		if(serverinf.version !== 2){
			logger.log('debug', inspect`entries for server ${serverinf.address}:${serverinf.port} will be ignored, because it's version is ${serverinf.version} not ${2}`);
			return;
		}

		let data:teilnehmerRow[] = await SqlAll<teilnehmerRow>(`SELECT ${constants.peerProperties} FROM teilnehmer WHERE uid IN (${entriesForServer.map(x=>'?').join(', ')});`, entriesForServer.map(x=>x.message));

		let res = await APIcall('PUT', serverinf.address, serverinf.port, '/admin/entries', data);
		logger.log('debug', inspect`${res}`);

		await SqlRun(`DELETE FROM queue WHERE uid IN (${entriesForServer.map(x=>'?').join(', ')});`, entriesForServer.map(x=>x.uid));
	})()));
}
export default sendQueue;
