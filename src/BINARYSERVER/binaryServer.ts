"use strict";
import * as net from 'net';
import config from '../COMMONMODULES/config.js';
import {ll, lle} from "../COMMONMODULES/logWithLineNumbers.js";
import colors from "../COMMONMODULES/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";

import serialEachPromise from '../COMMONMODULES/serialEachPromise.js';
import { checkIp, client, clientName } from './misc.js';

const cv = config.cv;


var binaryServer = net.createServer(function (connection:net.Socket) {
	var client:client = {
		name: clientName(),
		connection: connection,
		state: constants.states.STANDBY,
		handling: false,
		readbuffer:null,
		writebuffer:null,
		packages: []
	};
	if (cv(1)) ll(colors.FgGreen + "client " + colors.FgCyan + client.name + colors.FgGreen + " connected from ipaddress: " + colors.FgCyan + connection.remoteAddress + colors.Reset); //.replace(/^.*:/,'')
	connection.on('end', function ():void {
		if(client){
			if(cv(1)) if(client.newEntries != null) ll(`${colors.FgGreen}recieved ${colors.FgCyan}${client.newEntries}${colors.FgGreen} new entries${colors.Reset}`);
			if (cv(1)) ll(colors.FgYellow + "client " + colors.FgCyan + client.name + colors.FgYellow + " disconnected" + colors.Reset);
			clearTimeout(client.timeout);

			ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.name+colors.FgGreen}${colors.Reset}`);
			client = null;
		}
	});
	connection.setTimeout(config.connectionTimeout);
	connection.on('timeout', function ():void{
		if (cv(1)) ll(colors.FgYellow + "client " + colors.FgCyan + client.name + colors.FgYellow + " timed out" + colors.Reset);
		connection.end();
	});
	connection.on('error', function (err:Error):void {
		lle(err);
		connection.end();
	});
	connection.on('data', function (data:Buffer):void {
		if (cv(2)) {
			ll(colors.FgGreen+"recieved data:"+colors.FgCyan,data,colors.Reset);
			ll(colors.FgCyan+data.toString().replace(/[^ -~]/g, "·")+colors.Reset);
		}
		if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/ ) {
			if (cv(2)) ll(colors.FgGreen + "serving ascii request" + colors.Reset);
			ITelexCom.ascii(data, client);
		} else if (data[0] == 'c'.charCodeAt(0)) {
			checkIp(data, client);
		} else {
			if (cv(2)) ll(colors.FgGreen + "serving binary request" + colors.Reset);

			if (cv(2)) ll("Buffer for client " + client.name + ":" + colors.FgCyan, client.readbuffer, colors.Reset);
			if (cv(2)) ll("New Data for client " + client.name + ":" + colors.FgCyan, data, colors.Reset);
			var res = ITelexCom.getCompletePackages(data, client.readbuffer);
			if (cv(2)) ll("New Buffer:" + colors.FgCyan, res[1], colors.Reset);
			if (cv(2)) ll("complete Package(s):" + colors.FgCyan, res[0], colors.Reset);
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
							async function(pkg, key){
								if ((cv(1) && (nPackages > 1)) || cv(2)) ll(`${colors.FgGreen}handling package ${colors.FgCyan}${+key + 1}/${nPackages}${colors.Reset}`);
								return await ITelexCom.handlePackage(pkg, client);
							}
							// (pkg, key)=>new Promise((resolve, reject)=>{
							// 	if ((cv(1) && (nPackages > 1)) || cv(2)) ll(`${colors.FgGreen}handling package ${colors.FgCyan}${+key + 1}/${nPackages}${colors.Reset}`);
							// 	ITelexCom.handlePackage(pkg, client)
							// 	.then(()=>{
							// 		// handled++;
							// 		resolve();
							// 	})
							// 	.catch(lle);
							// })
						)
						.then((res)=>{
							client.packages.splice(0, res.length);//handled);
							client.handling = false;
						})
						.catch(lle);
					} else {
						client.timeout = setTimeout(timeout, 10);
					}
				};
				timeout();
			}
		}
	});
});
binaryServer.on("error", err => lle("server error:", err));

export default binaryServer;