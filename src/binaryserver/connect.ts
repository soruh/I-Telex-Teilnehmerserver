"use strict";

//#region imports
import * as net from "net";
import config from '../shared/config.js';
// import colors from "../shared/colors.js";
import * as constants from "../shared/constants.js";
import * as ITelexCom from "../binaryserver/ITelexCom.js";
import {increaseErrorCounter, serverErrorCounters, resetErrorCounter, Client, clientName, inspect, normalizeIp} from "../shared/misc.js";
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
		
		let client = new Client(socket);


		chunker.on('data', (pkg: Buffer) => {
			if(client){
				logger.log('verbose network', inspect`recieved package: ${pkg}`);
				logger.log('verbose network', inspect`${pkg.toString().replace(/\u0000/g, '–').replace(/[^ -~–]/g, "·")}`);

				handlePackage(ITelexCom.decPackage(pkg), client)
				.catch(err=>{logger.log('error', inspect`${err}`);});
			}
		});
		socket.on('close', () => {
			if (client.newEntries != null) logger.log('verbose network', inspect`recieved ${client.newEntries} new entries`);
			logger.log('network', inspect`server ${client.name} disconnected!`);
			client = null;
			onClose();
		});
		socket.on('timeout', () => {
			logger.log('warning', inspect`server: ${client.name} timed out`);
			// socket.emit("end");
			// socket.emit("error",new Error("timeout"));
			increaseErrorCounter('server', serverkey, "TIMEOUT");
			socket.end();
		});
		socket.on('error', (error:Error&{code:string}) => {
			if (error.code === "ECONNRESET") {
				logger.log('warning', inspect`server ${client.name} reset the socket`);
			}else if(error.code === "EPIPE"){
				logger.log('warning', inspect`tried to write data to a closed socket`);
			}else{
				logger.log('debug', inspect`${error}`);

				logger.log('network', inspect`server ${client.name} had an error`);
				increaseErrorCounter('server', serverkey, error["code"]);
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
			resetErrorCounter('server', serverkey);
			resolve(client);
		});

		socket.setTimeout(config.connectionTimeout);
		socket.connect(options);
	});
}

export default connect;
