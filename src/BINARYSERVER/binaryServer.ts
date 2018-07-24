"use strict";
import * as net from 'net';
import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";

import serialEachPromise from '../COMMONMODULES/serialEachPromise.js';
import {
	checkIp,
	client,
	clientName
} from './misc.js';
import {
	inspect
} from 'util';


const logger = global.logger;

var binaryServer = net.createServer(function (connection: net.Socket) {
	var client: client = {
		name: clientName(),
		connection: connection,
		state: constants.states.STANDBY,
		handling: false,
		readbuffer: null,
		writebuffer: null,
		packages: []
	};
	logger.info(colors.FgGreen + "client " + colors.FgCyan + client.name + colors.FgGreen + " connected from ipaddress: " + colors.FgCyan + connection.remoteAddress + colors.Reset); //.replace(/^.*:/,'')
	connection.on('end', function (): void {
		if (client) {
			if (client.newEntries != null) logger.info(`${colors.FgGreen}recieved ${colors.FgCyan}${client.newEntries}${colors.FgGreen} new entries${colors.Reset}`);
			logger.info(colors.FgYellow + "client " + colors.FgCyan + client.name + colors.FgYellow + " disconnected" + colors.Reset);
			clearTimeout(client.timeout);

			// logger.info(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.name+colors.FgGreen}${colors.Reset}`);
			client = null;
		}
	});
	connection.setTimeout(config.connectionTimeout);
	connection.on('timeout', function (): void {
		logger.info(colors.FgYellow + "client " + colors.FgCyan + client.name + colors.FgYellow + " timed out" + colors.Reset);
		connection.end();
	});
	connection.on('error', function (err: Error): void {
		logger.error(err);
		connection.end();
	});
	connection.on('data', function (data: Buffer): void {
		logger.verbose(colors.FgGreen + "recieved data:" + colors.FgCyan + inspect(data) + colors.Reset);
		logger.verbose(colors.FgCyan + data.toString().replace(/[^ -~]/g, "·") + colors.Reset);

		if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/ ) {
			logger.verbose(colors.FgGreen + "serving ascii request" + colors.Reset);
			ITelexCom.ascii(data, client);
		} else if (data[0] == 'c'.charCodeAt(0)) {
			checkIp(data, client);
		} else {
			logger.verbose(colors.FgGreen + "serving binary request" + colors.Reset);

			logger.debug(colors.FgCyan+"Buffer for client " +colors.FgCyan+ client.name + colors.FgGreen+":" + colors.FgCyan + inspect(client.readbuffer) + colors.Reset);
			logger.debug(colors.FgGreen+"New Data for client " + colors.FgCyan+ client.name + colors.FgGreen+":" + colors.FgCyan + inspect(data) + colors.Reset);
			var res = ITelexCom.getCompletePackages(data, client.readbuffer);
			logger.debug(colors.FgGreen+"New Buffer:" + colors.FgCyan + inspect(res[1]) + colors.Reset);
			logger.debug(colors.FgGreen+"complete Package(s):" + colors.FgCyan+ inspect(res[0])+ colors.Reset);
			client.readbuffer = res[1];
			if (res[0]) {
				client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
				let timeout = function () {
					if (client.handling === false) {
						client.handling = true;
						if (client.timeout != null) {
							clearTimeout(client.timeout);
							client.timeout = null;
						}
						let nPackages = client.packages.length;

						serialEachPromise(
								client.packages,
								async function (pkg, key) {
									let msg = `${colors.FgGreen}handling package ${colors.FgCyan}${+key + 1}/${nPackages}${colors.Reset}`;
									if (nPackages > 1) {
										logger.info(msg);
									} else {
										logger.verbose(msg);
									}
									return await ITelexCom.handlePackage(pkg, client);
								}
							)
							.then((res) => {
								client.packages.splice(0, res.length); //handled);
								client.handling = false;
							})
							.catch(logger.error);
					} else {
						client.timeout = setTimeout(timeout, 10);
					}
				};
				timeout();
			}
		}
	});
});
binaryServer.on("error", err => logger.error(`server error: ${inspect(err)}`));

export default binaryServer;