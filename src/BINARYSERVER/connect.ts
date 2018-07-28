"use strict";

//#region imports
import * as net from "net";
import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
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
		var chunker = new ITelexCom.ChunkPackages();
		socket.pipe(chunker);
		
		var client: client = {
			name: clientName(),
			connection: socket,
			state: constants.states.STANDBY,
			writebuffer: [],
		};
		chunker.on('data', (pkg: Buffer) => {
			if(client){
				logger.verbose(inspect`recieved package: ${pkg}`);
				logger.verbose(inspect`${pkg.toString().replace(/[^ -~]/g, "·")}`);

				ITelexCom.handlePackage(ITelexCom.decPackage(pkg), client)
				.catch(err=>{logger.error(inspect`${err}`)});
			}
		});
		socket.on('close', () => {
			if (client.newEntries != null) logger.info(inspect`recieved ${client.newEntries} new entries`);
			logger.info(inspect`server ${client.name} disconnected!`);

			// logger.info(inspect`deleted connection `);
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