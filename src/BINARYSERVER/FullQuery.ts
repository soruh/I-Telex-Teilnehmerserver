"use strict";
//#region imports

import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as misc from "../SHARED/misc.js";
import serialEachPromise from '../SHARED/serialEachPromise.js';
import connect from './connect.js';

//#endregion
const logger = global.logger;


const readonly = (config.serverPin == null);

function getFullQuery() {
	return new Promise((resolve, reject) => {
		logger.verbose(colors.FgMagenta + "geting " + colors.FgCyan + "FullQuery" + colors.Reset);
		misc.SqlQuery("SELECT  * FROM servers;")
			.then((servers: ITelexCom.serverList) => {
				if (servers.length == 0) {
					logger.warn(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "FullQuery" + colors.Reset);
					return void resolve();
				}
				// for (let i in servers) {
				// 	if (config.fullQueryServer&&servers[i].addresse == config.fullQueryServer.split(":")[0] && servers[i].port == config.fullQueryServer.split(":")[1]) {
				// 		servers = [servers[i]];
				// 		break;
				// 	}
				// }

				if (config.fullQueryServer) servers = servers.filter(server =>
					server.port == config.fullQueryServer.split(":")[1] &&
					server.addresse == config.fullQueryServer.split(":")[0]);


				return serialEachPromise(servers, server => new Promise((resolve, reject) => {
					connect(resolve, {
							host: server.addresse,
							port: +server.port
						})
						.then(client => new Promise((resolve, reject) => {
							let request: ITelexCom.Package_decoded_10 | ITelexCom.Package_decoded_6;
							if (readonly) {
								request = {
									type: 10,
									data: {
										pattern: '',
										version: 1
									}
								};
							} else {
								request = {
									type: 6,
									data: {
										serverpin: config.serverPin,
										version: 1
									}
								};
							}
							client.connection.write(ITelexCom.encPackage(request), () => {
								client.state = constants.states.FULLQUERY;
								client.cb = resolve;
							});
						}))
						.catch(logger.error)
				}))
			})
			.then(() => resolve())
			.catch(logger.error);
		//}
	});
}

export default getFullQuery;