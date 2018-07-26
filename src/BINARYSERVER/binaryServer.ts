"use strict";
import * as net from 'net';
import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";

import serialEachPromise from '../SHARED/serialEachPromise.js';
import {checkIp, client, clientName, inspect} from '../SHARED/misc.js';


const logger = global.logger;

var binaryServer = net.createServer(function (connection: net.Socket) {
	var client: client = {
		name: clientName(),
		connection: connection,
		state: constants.states.STANDBY,
		// handling: false,
		readbuffer: null,
		writebuffer: null,
		packages: []
	};
	logger.info(inspect`client ${client.name} connected from ipaddress: ${connection.remoteAddress}`); //.replace(/^.*:/,'')
	connection.on('end', function (): void {
		if (client) {
			if (client.newEntries != null) logger.info(inspect`recieved ${client.newEntries} new entries`);
			logger.info(inspect`client ${client.name} disconnected`);
			// clearTimeout(client.timeout);

			// logger.info(inspect`deleted connection `);
			client = null;
		}
	});
	connection.setTimeout(config.connectionTimeout);
	connection.on('timeout', function (): void {
		logger.info(inspect`client ${client.name} timed out`);
		connection.end();
	});
	connection.on('error', function (err: Error): void {
		logger.error(inspect`${err}`);
		connection.end();
	});
	connection.on('data', function (data: Buffer): void {
		if(client){
			logger.verbose(inspect`recieved data:${data}`);
			logger.verbose(inspect`${data.toString().replace(/[^ -~]/g, "·")}`);
	
			if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/ ) {
				logger.verbose(inspect`serving ascii request`);
				ITelexCom.ascii(data, client);
			} else if (data[0] == 'c'.charCodeAt(0)) {
				checkIp(data, client);
			} else {
				logger.verbose(inspect`serving binary request`);
	
				logger.debug(inspect`Buffer for client ${client.name}: ${client.readbuffer}`);
				logger.debug(inspect`New Data for client ${client.name}: ${data}`);
				var res = ITelexCom.getCompletePackages(data, client.readbuffer);
				logger.debug(inspect`New Buffer: ${res[1]}`);
				logger.debug(inspect`complete Package(s): ${res[0]}`);
				client.readbuffer = res[1];
				if (res[0]) {
					client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
					// let handleTimeout = function () {
					// if (client.handling === false) {
							// client.handling = true;
							// if (client.timeout != null) {
							// 	clearTimeout(client.timeout);
							// 	client.timeout = null;
							// }
	
							serialEachPromise(
									client.packages,
									async function (pkg, key) {
										let msg = inspect`handling package ${+key + 1}/${client.packages.length}`;
										if (client.packages.length > 1) {
											logger.info(msg);
										} else {
											logger.verbose(msg);
										}
										return await ITelexCom.handlePackage(pkg, client);
									}
								)
								.then((res) => {
									client.packages.splice(0, res.length); //handled);
									// client.handling = false;
								})
								.catch(err=>{logger.error(inspect`${err}`)});
					// 	} else {
					// 		client.timeout = setTimeout(handleTimeout, 10);
					// 	}
					// };
					// handleTimeout();
				}
			}
		}
	});
});
binaryServer.on("error", err => logger.error(inspect`server error: ${err}`));

export default binaryServer;