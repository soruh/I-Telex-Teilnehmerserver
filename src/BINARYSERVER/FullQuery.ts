"use strict";
//#region imports

import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../SHARED/constants.js";
import { inspect } from "../SHARED/misc.js";
import { SqlQuery, SqlAll, SqlEach, SqlGet } from '../SHARED/SQL';

import serialEachPromise from '../SHARED/serialEachPromise.js';
import connect from './connect.js';

//#endregion



const readonly = (config.serverPin == null);

async function getFullQuery() {
	logger.log('debug', inspect`getting FullQuery`);
	let servers: ITelexCom.serverList = await SqlQuery("SELECT  * FROM servers;", []);
	if (servers.length === 0) {
		logger.log('warning', inspect`No configured servers -> aborting FullQuery`);
		return;
	}
	// for (let i in servers) {
	// 	if (config.fullQueryServer&&servers[i].addresse == config.fullQueryServer.split(":")[0] && servers[i].port == config.fullQueryServer.split(":")[1]) {
	// 		servers = [servers[i]];
	// 		break;
	// 	}
	// }

	if (config.fullQueryServer) servers = servers.filter(server =>
		server.port === config.fullQueryServer.split(":")[1] &&
		server.addresse === config.fullQueryServer.split(":")[0]
	);


	return serialEachPromise(servers, server => new Promise(async resolveLoop => {
		try{
			const client = await connect({host: server.addresse, port: +server.port}, resolveLoop);
			let request: ITelexCom.Package_decoded_10 | ITelexCom.Package_decoded_6;
			if (readonly) {
				request = {
					type: 10,
					data: {
						pattern: '',
						version: 1,
					},
				};
			} else {
				request = {
					type: 6,
					data: {
						serverpin: config.serverPin,
						version: 1,
					},
				};
			}
			await client.sendPackage(request);

			client.state = constants.states.FULLQUERY;
			client.cb = resolveLoop;
		}catch(err){
			logger.log('error', inspect`${err}`);
		}
	}));
}

export default getFullQuery;
