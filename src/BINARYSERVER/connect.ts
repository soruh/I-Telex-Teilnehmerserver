"use strict";

//#region imports
import * as net from "net";
import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import {increaseErrorCounter, errorCounters, resetErrorCounter, Client, clientName, inspect, normalizeIp, sendPackage} from "../SHARED/misc.js";
import { handlePackage } from "./handles.js";
//#endregion



// tslint:disable-next-line:no-empty
function connect(options:{host: string, port: number}, onClose=()=>{}): Promise < Client > {
	return new Promise((resolve, reject) => {
		const serverkey = options.host + ":" + options.port;
		logger.log('verbose network', inspect`trying to connect to server at ${serverkey}`);


		const socket = new net.Socket();
		const chunker = new ITelexCom.ChunkPackages();
		socket.pipe(chunker);
		
		let client: Client = {
			name: clientName(),
			connection: socket,
			ipAddress: null,
			ipFamily: null,
			state: constants.states.STANDBY,
			writebuffer: [],
			sendPackage,
		};
		chunker.on('data', (pkg: Buffer) => {
			if(client){
				logger.log('verbose network', inspect`recieved package: ${pkg}`);
				logger.log('verbose network', inspect`${pkg.toString().replace(/[^ -~]/g, "·")}`);

				handlePackage(ITelexCom.decPackage(pkg), client)
				.catch(err=>{logger.log('error', inspect`${err}`);});
			}
		});
		socket.on('close', () => {
			if (client.newEntries != null) logger.log('verbose network', inspect`recieved ${client.newEntries} new entries`);
			logger.log('network', inspect`server ${client.name} disconnected!`);
			// client = null;
			onClose();
		});
		socket.on('timeout', () => {
			logger.log('warning', inspect`server: ${client.name} timed out`);
			// socket.emit("end");
			// socket.emit("error",new Error("timeout"));
			increaseErrorCounter(serverkey, "TIMEOUT");
			socket.end();
		});
		socket.on('error', error => {
			if (error["code"] !== "ECONNRESET") {
				logger.log('debug', inspect`${error}`);

				logger.log('network', inspect`server ${client.name} had an error`);
				increaseErrorCounter(serverkey, error["code"]);
			}else{
				logger.log('silly', inspect`${error}`);
			}
		});
		socket.once('connect', ()=>{
			{
				let ipAddress = normalizeIp(socket.remoteAddress);
				
				if(ipAddress){
					client.ipAddress = ipAddress.address;
					client.ipFamily = ipAddress.family;
				}else{
					logger.log('error', inspect`server: ${client.name} had no ipAddress and was disconected`);
					socket.destroy();
				}
			}
			logger.log('network', inspect`connected to server at ${serverkey} as ${client.name}`);
			resetErrorCounter(serverkey);
			resolve(client);
		});

		socket.setTimeout(config.connectionTimeout);
		socket.connect(options);
	});
}

export default connect;
