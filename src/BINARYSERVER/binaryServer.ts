"use strict";
import * as net from 'net';
import * as util from 'util';
import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";

import { client, clientName, inspect, normalizeIp} from '../SHARED/misc.js';
import { asciiLookup, checkIp } from './ascii.js';
import { handlePackage } from './handles.js';




var binaryServer = net.createServer(function (socket: net.Socket) {
	var client: client = {
		name: clientName(),
		connection: socket,
		ipAddress: null,
		ipFamily: null,
		state: constants.states.STANDBY,
		writebuffer: [],
	};
	{
		let ipAddress = normalizeIp(socket.remoteAddress);
		if(ipAddress){
			client.ipAddress = ipAddress.address;
			client.ipFamily = ipAddress.family;
		}else{
			logger.log('error', inspect`client: ${client.name} had no ipAddress and was disconected`);
			logger.log('debug', inspect`client: ${client}`);
			client.connection.destroy();
		}
	}
	logger.log('network', inspect`client ${client.name} connected from ipaddress: ${client.ipAddress}`); //.replace(/^.*:/,'')
	
	var chunker = new ITelexCom.ChunkPackages();
	socket.pipe(chunker);
	
	
	var asciiListener = (data: Buffer): void => {
		if(client){
			let command = String.fromCharCode(data[0]);
			if(command=='q'||command=='c'){
				logger.log('network', inspect`serving ascii request of type ${command}`);
				logger.log('verbose network', inspect`request: ${util.inspect(data.toString())}`);
				if (command == 'q') {
					asciiLookup(data, client);
				} else if (command == 'c') {
					checkIp(data, client);
				}
			}
		}
	}
	var binaryListener = (pkg: Buffer): void => {
		if(client){
			logger.log('verbose network', inspect`recieved package: ${pkg}`);
			logger.log('verbose network', inspect`${pkg.toString().replace(/[^ -~]/g, "·")}`);
			
			handlePackage(ITelexCom.decPackage(pkg), client)
			.catch(err=>{logger.log('error', inspect`${err}`)}); 
		}
	}
	socket.once('data', asciiListener);
	chunker.on('data', binaryListener);
	
	socket.on('close', function (): void {
		if (client) {
			if (client.newEntries != null) logger.log('network', inspect`recieved ${client.newEntries} new entries`);
			logger.log('network', inspect`client ${client.name} disconnected!`);
			// clearTimeout(client.timeout);
			client = null;
		}
	});
	socket.on('timeout', function (): void {
		logger.log('network', inspect`client ${client.name} timed out`);
		socket.end();
	});
	socket.setTimeout(config.connectionTimeout);
	socket.on('error', function (err: Error): void {
		logger.log('error', inspect`${err}`);
		socket.end();
	});
});
binaryServer.on("error", err => logger.log('error', inspect`server error: ${err}`));

export default binaryServer;