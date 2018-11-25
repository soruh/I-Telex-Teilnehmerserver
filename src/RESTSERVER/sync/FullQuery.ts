"use strict";

import config from '../../SHARED/config.js';
import { inspect } from "../../SHARED/misc.js";
import { SqlAll, SqlEach, SqlGet, SqlRun, serversRow, teilnehmerRow } from '../../SHARED/SQL';
import APIcall from './APICall.js';
import * as constants from '../../SHARED/constants';

async function getFullQuery(){
	logger.log('admin', inspect`getting FullQuery`);
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
			const endPoint = config.serverPin===null?'public':'admin';
			const entries:teilnehmerRow[] = await APIcall('GET', server.address, server.port, `/${endPoint}/entries`);
			for(const entry of entries){
				const names = constants.peerProperties.filter(name=>entry.hasOwnProperty(name));
				const values = names.map(name=>entry[name]);
				await SqlRun(`INSERT INTO teilnehmer (${names.join(', ')}) VALUES (${values.map(()=>'?').join(', ')}) ON CONFLICT (number) DO UPDATE SET ${names.map(name=>name+"=?").join(', ')};`, [...values,...values]);
			}
		}catch(err){
			logger.log('error', inspect`${err}`);
		}
	}
}
export default getFullQuery;
