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
	onEnd: (client: client) => void,
	options: {
		host: string,
		port: number
	}
): Promise < client > {
	return new Promise((resolve, reject) => {
		let serverkey = options.host + ":" + options.port;
		logger.info(inspect`${colors.FgGreen}trying to connect to: ${colors.FgCyan}${serverkey}${colors.Reset}`);


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
		socket.setTimeout(config.connectionTimeout);
		socket.on('end', () => {
			if (client.newEntries != null) logger.info(inspect`${colors.FgGreen}recieved ${colors.FgCyan}${client.newEntries}${colors.FgGreen} new entries${colors.Reset}`);
			logger.info(inspect`${colors.FgYellow}server ${colors.FgCyan}${client.name}${colors.FgYellow} ended!${colors.Reset}`);

			// logger.info(inspect`${colors.FgGreen}deleted connection ${colors.FgCyan+client.name+colors.Reset}`);
			client = null;
			onEnd(client);
		});
		socket.on('timeout', () => {
			logger.warn(inspect`${colors.FgRed}server: ${colors.FgCyan}${serverkey}${colors.FgRed} timed out${colors.Reset}`);
			// socket.emit("end");
			// socket.emit("error",new Error("timeout"));
			increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
			socket.end();
		});
		socket.on('error', error => {
			if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
				logger.info(inspect`${colors.FgRed}server ${colors.FgCyan}${options}${colors.FgRed} had an error${colors.Reset}`);
				increaseErrorCounter(serverkey, error, error["code"]);
				logger.info(inspect`${colors.FgRed}server ${colors.FgCyan}${serverkey}${colors.FgRed} could not be reached; errorCounter: ${colors.FgCyan}${errorCounters[serverkey]}${colors.Reset}`);
			}else{
				logger.debug(inspect`${error}`);
			}
			socket.end();
		});
		socket.on('data', (data: Buffer) => {
			if(client){

				logger.verbose(inspect`${colors.FgGreen}recieved data: ${colors.FgCyan}${data}${colors.Reset}`);
				logger.verbose(inspect`${colors.FgCyan}${data.toString().replace(/[^ -~]/g, "·")}${colors.Reset}`);
				try {
					logger.debug(inspect`${colors.FgGreen}Buffer for client ${colors.FgCyan}${client.name}${colors.FgGreen}: ${colors.FgCyan}${client.readbuffer}${colors.Reset}`);
					logger.debug(inspect`${colors.FgGreen}New Data for client ${colors.FgCyan}${client.name}${colors.FgGreen}: ${colors.FgCyan}${data}${colors.Reset}`);
					var [packages, rest] = ITelexCom.getCompletePackages(data, client.readbuffer);
					logger.debug(inspect`${colors.FgGreen}New Buffer for client ${client.name}: ${colors.FgCyan}${rest}${colors.Reset}`);
					logger.debug(inspect`${colors.FgGreen}Packages for client ${client.name}: ${colors.FgCyan}${packages}${colors.Reset}`);
					client.readbuffer = rest;
					client.packages = client.packages.concat(ITelexCom.decPackages(packages));
					// let handleTimeout = () => {
						// logger.verbose(inspect`${colors.FgGreen}handling: ${colors.FgCyan}${client.handling}${colors.Reset}`);
						// if (client.handling === false) {
						// 	client.handling = true;
						// 	if (client.handleTimeout != null) {
						// 		clearTimeout(client.handleTimeout);
						// 		client.handleTimeout = null;
						// 	}
							serialEachPromise(client.packages, (pkg, key) => new Promise((resolve, reject) => {
									{
										let msg = colors.FgGreen + "handling package " + colors.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors.Reset;
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
					logger.error(inspect`${colors.FgRed}${e}${colors.Reset}`);
				}
			}
		});
		socket.connect(options, () => {
			logger.info(inspect`${colors.FgGreen}connected to: ${colors.FgCyan}${options}${colors.FgGreen} as server ${colors.FgCyan}${client.name}${colors.Reset}`);
			resetErrorCounter(serverkey);
			resolve(client);
		});
	});
}

export default connect;