"use strict";

//#region imports
import * as net from "net";
import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from "../SHARED/serialEachPromise.js";
import {increaseErrorCounter, errorCounters, resetErrorCounter, client, clientName, inspect} from "../SHARED/misc.js";
//#endregion

const logger = global.logger;

function connect(
	onClose: () => void,
	options: {
		host: string,
		port: number
	}
): Promise < client > {
	return new Promise((resolve, reject) => {
		let serverkey = options.host + ":" + options.port;
		logger.info(inspect`trying to connect to: ${serverkey}`);


		var socket = new net.Socket();
		var client: client = {
			name: clientName(),
			connection: socket,
			readbuffer: new Buffer(0),
			state: constants.states.STANDBY,
			packages: [],
			// handling: false,
			writebuffer: [],
		};
		socket.on('close', () => {
			if (client.newEntries != null) logger.info(inspect`recieved ${client.newEntries} new entries`);
			logger.info(inspect`server ${client.name} disconnected!`);

			// logger.info(inspect`deleted connection `);
			client.connection.removeAllListeners("data");
			client = null;
			onClose();
		});
		socket.on('timeout', () => {
			logger.warn(inspect`server: ${serverkey} timed out`);
			// socket.emit("end");
			// socket.emit("error",new Error("timeout"));
			increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
			socket.end();
		});
		socket.on('error', error => {
			if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
				logger.info(inspect`server ${options} had an error`);
				increaseErrorCounter(serverkey, error, error["code"]);
				logger.info(inspect`server ${serverkey} could not be reached; errorCounter: ${errorCounters[serverkey]}`);
			}else{
				logger.debug(inspect`${error}`);
			}
		});
		socket.on('data', (data: Buffer) => {
			if(client){
				logger.verbose(inspect`recieved data: ${data}`);
				logger.verbose(inspect`${data.toString().replace(/[^ -~]/g, "·")}`);
				try {
					logger.debug(inspect`Buffer for client ${client.name}: ${client.readbuffer}`);
					logger.debug(inspect`New Data for client ${client.name}: ${data}`);
					var [packages, rest] = ITelexCom.getCompletePackages(data, client.readbuffer);
					logger.debug(inspect`New Buffer for client ${client.name}: ${rest}`);
					logger.debug(inspect`Packages for client ${client.name}: ${packages}`);
					client.readbuffer = rest;
					client.packages = client.packages.concat(ITelexCom.decPackages(packages));
					// let handleTimeout = () => {
						// logger.verbose(inspect`handling: ${client.handling}`);
						// if (client.handling === false) {
						// 	client.handling = true;
						// 	if (client.handleTimeout != null) {
						// 		clearTimeout(client.handleTimeout);
						// 		client.handleTimeout = null;
						// 	}
							serialEachPromise(client.packages, (pkg, key) => new Promise((resolve, reject) => {
									{
										let msg = `handling package ${+key + 1}/${Object.keys(client.packages).length}`;
										if (Object.keys(client.packages).length > 1) {
											logger.info(inspect`${msg}`);
										} else {
											logger.verbose(inspect`${msg}`);
										}
									}
	
									ITelexCom.handlePackage(pkg, client)
										.then(() => {
											client.packages.splice(+key, 1);
											resolve();
										})
										.catch(err=>{logger.error(inspect`${err}`)});
								}))
								.then(() => {
									// client.handling = false;
								})
								.catch(err=>{logger.error(inspect`${err}`)});
						// } else {
						// 	if (client.handleTimeout == null) {
						// 		client.handleTimeout = setTimeout(handleTimeout, 10);
						// 	}
						// }
					// };
					// handleTimeout();
				} catch (e) {
					logger.error(inspect`${e}`);
				}
			}
		});
		socket.once('connect', ()=>{
			logger.info(inspect`connected to: ${options} as server ${client.name}`);
			resetErrorCounter(serverkey);
			resolve(client);
		});
		socket.setTimeout(config.connectionTimeout);
		socket.connect(options);
	});
}

export default connect;