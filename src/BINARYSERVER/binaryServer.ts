"use strict";
import * as net from 'net';
import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";

import {checkIp, client, clientName, inspect} from '../SHARED/misc.js';


const logger = global.logger;

var binaryServer = net.createServer(function (socket: net.Socket) {
	var client: client = {
		name: clientName(),
		connection: socket,
		ipAddress: socket.remoteAddress.replace(/^.*:/, ''),
		state: constants.states.STANDBY,
		writebuffer: [],
	};
	logger.info(inspect`client ${client.name} connected from ipaddress: ${client.ipAddress}`); //.replace(/^.*:/,'')

	var chunker = new ITelexCom.ChunkPackages();
	socket.pipe(chunker);
	
	socket.setTimeout(config.connectionTimeout);

	var listeningForAscii = true;
	var listeningForBinary= true;
	var asciiListener = (data: Buffer): void => {
		if(client){
			logger.verbose(inspect`recieved data:${data}`);
			logger.verbose(inspect`${data.toString().replace(/[^ -~]/g, "·")}`);
	
			let nonBinary = false;
			if (String.fromCharCode(data[0]) == 'q' && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/ ) {
				logger.verbose(inspect`serving ascii request`);
				ITelexCom.ascii(data, client);
				nonBinary = true;
			} else if (String.fromCharCode(data[0]) == 'c') {
				checkIp(data, client);
				nonBinary = true;
			}
			if(nonBinary&&listeningForBinary){
				socket.unpipe(chunker);
				// chunker.end();
				chunker.destroy();
				chunker = null;
				listeningForBinary = false;
			}
		}
	}
	var binaryListener = (pkg: Buffer): void => {
		if(client){
			if(listeningForAscii){
				socket.removeListener("data", asciiListener);
				listeningForAscii = false;
			}

			logger.verbose(inspect`recieved package: ${pkg}`);
			logger.verbose(inspect`${pkg.toString().replace(/[^ -~]/g, "·")}`);

			ITelexCom.handlePackage(ITelexCom.decPackage(pkg), client)
			.catch(err=>{logger.error(inspect`${err}`)});
		}
	}
	socket.on('data', asciiListener);
	chunker.on('data', binaryListener);
	socket.on('close', function (): void {
		if (client) {
			if (client.newEntries != null) logger.info(inspect`recieved ${client.newEntries} new entries`);
			logger.info(inspect`client ${client.name} disconnected!`);
			// clearTimeout(client.timeout);
			client = null;
		}
	});
	socket.on('timeout', function (): void {
		logger.info(inspect`client ${client.name} timed out`);
		socket.end();
	});
	socket.on('error', function (err: Error): void {
		logger.error(inspect`${err}`);
		socket.end();
	});
});
binaryServer.on("error", err => logger.error(inspect`server error: ${err}`));

export default binaryServer;