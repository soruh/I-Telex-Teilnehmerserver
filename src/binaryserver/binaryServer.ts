"use strict";
import * as net from 'net';
import * as util from 'util';
import config from '../shared/config.js';
// import colors from "../shared/colors.js";
import * as ITelexCom from "../binaryserver/ITelexCom.js";
import * as constants from "../shared/constants.js";

import { Client, inspect, normalizeIp} from '../shared/misc.js';
import { asciiLookup, checkIp } from './ascii.js';
import { handlePackage } from './handles.js';




let binaryServer = net.createServer(function(socket: net.Socket) {
	let client = new Client(socket);
	
	let asciiListener = (data: Buffer): void => {
		if(client){
			let command = String.fromCharCode(data[0]);
			if(command==='q'||command==='c'){
				logger.log('network', inspect`serving ascii request of type ${command}`);
				logger.log('verbose network', inspect`request: ${util.inspect(data.toString())}`);
				if (command === 'q') {
					asciiLookup(data, client);
				} else if (command === 'c') {
					checkIp(data, client);
				}
			}
		}
	};
	let binaryListener = (pkg: Buffer): void => {
		if(client){
			logger.log('verbose network', inspect`recieved package: ${pkg}`);
			logger.log('verbose network', inspect`${pkg.toString().replace(/\u0000/g, '–').replace(/[^ -~–]/g, "·")}`);
			
			handlePackage(ITelexCom.decPackage(pkg), client)
			.catch(err=>{logger.log('error', inspect`${err}`);}); 
		}
	};
	
	socket.on('close', () => {
		if (client) {
			if (client.newEntries != null) logger.log('network', inspect`recieved ${client.newEntries} new entries`);
			logger.log('network', inspect`client ${client.name} disconnected!`);
			// clearTimeout(client.timeout);
			client = null;
		}
	});
	socket.on('timeout', () => {
		logger.log('network', inspect`client ${client.name} timed out`);
		socket.end();
	});
	socket.on('error', (error:Error&{code:string}) => {
		if (error.code === "ECONNRESET") {
			logger.log('warning', inspect`client ${client.name} reset the socket`);
		}else if(error.code === "EPIPE"){
			logger.log('warning', inspect`tried to write data to a closed socket`);
		}else{
			logger.log('error', inspect`${error}`);
		}
		socket.end();
	});

	const chunker = new ITelexCom.ChunkPackages();

	socket.once('data', asciiListener);
	socket.pipe(chunker);
	chunker.on('data', binaryListener);

	socket.setTimeout(config.connectionTimeout);

	{
		let ipAddress = normalizeIp(socket.remoteAddress);

		if(ipAddress){
			client.ipAddress = ipAddress.address;
			client.ipFamily = ipAddress.family;
		}else{
			logger.log('error', inspect`client: ${client.name} had no ipAddress and was disconected`);
			client.socket.destroy();
		}
	}
	logger.log('network', inspect`client ${client.name} connected from ipaddress: ${client.ipAddress}`); // .replace(/^.*:/,'')
});
binaryServer.on("error", err => logger.log('error', inspect`server error: ${err}`));

export default binaryServer;
