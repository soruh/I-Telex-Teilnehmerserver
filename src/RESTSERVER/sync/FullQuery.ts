"use strict";

import config from '../../SHARED/config.js';
import { inspect } from "../../SHARED/misc.js";
import { SqlAll, SqlEach, SqlGet, SqlRun, serversRow, teilnehmerRow } from '../../SHARED/SQL';
import APIcall from './APICall.js';
import * as constants from '../../SHARED/constants';

async function getFullQuery(){
	logger.log('debug', inspect`getting FullQuery`);
	let servers = await SqlAll<serversRow>('SELECT * from servers WHERE version=2;', []);

	if (servers.length === 0) {
		logger.log('warning', inspect`No configured servers -> aborting FullQuery`);
		return;
	}

	if (config.fullQueryServer) servers = servers.filter(server =>
		server.port === parseInt(config.fullQueryServer.split(":")[1]) &&
		server.address === config.fullQueryServer.split(":")[0]
	);

	for(let server of servers){
		try{
			let entries:teilnehmerRow[] = await APIcall('GET', server.address, server.port, '/admin/entries');
			for(let entry of entries){
				const names = constants.peerProperties;
				const values = names.filter(name=>entry.hasOwnProperty(name)).map(name=>entry[name]);
				await SqlRun(`INSERT INTO teilnehmer (${names.join(', ')}) VALUES (${values.map(()=>'?').join(', ')}) ON CONFLICT (number) DO UPDATE SET ${names.map(name=>name+"=?").join(', ')};`, [...values,...values]);
			}
		}catch(err){
			logger.log('error', inspect`${err}`);
		}
	}
}
export default getFullQuery;
