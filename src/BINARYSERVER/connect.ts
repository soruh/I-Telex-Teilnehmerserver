"use strict";

import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import * as util from "util";
import * as net from "net";
import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import serialEachPromise from "../COMMONMODULES/serialEachPromise.js";
import { increaseErrorCounter, serverErrors, resetErrorCounter, client, clientName } from "./misc.js";



const verbosity = config.loggingVerbosity;
var cv = level => level <= verbosity; //check verbosity

function connect(
	onEnd:(client:client)=>void,
	options:{
		host:string,
		port:number
	}
):Promise<client>{
	return new Promise((resolve, reject)=>{
		let serverkey = options.host + ":" + options.port;
		if (cv(1)) ll(colors.FgGreen + "trying to connect to:" + colors.FgCyan+serverkey+colors.Reset);
		
		
		var socket = new net.Socket();
		var client:client = {
			name: clientName(),
			connection: socket,
			readbuffer: new Buffer(0),
			state: constants.states.STANDBY,
			packages: [],
			handling: false,
			writebuffer: [],
		};
		socket.setTimeout(config.connectionTimeout);
		socket.on('end', ()=>{
			if(cv(1)) if(client.newEntries != null) ll(`${colors.FgGreen}recieved ${colors.FgCyan}${client.newEntries}${colors.FgGreen} new entries${colors.Reset}`);
			if(cv(1)) ll(colors.FgYellow + "server " + colors.FgCyan + client.name + colors.FgYellow + " ended!" + colors.Reset);
			
			if(cv(1)) ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.name+colors.Reset}`);
			client = null;
			onEnd(client);
		});
		socket.on('timeout', ()=>{
			if (cv(1)) lle(colors.FgRed + "server: " + colors.FgCyan+ serverkey+ colors.FgRed + " timed out" + colors.Reset);
			// socket.emit("end");
			// socket.emit("error",new Error("timeout"));
			increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
			socket.end();
		});
		socket.on('error', error=>{
			if (cv(3)) lle(error);
			if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
				if (cv(1)) ll(`${colors.FgRed}server ${colors.FgCyan+util.inspect(options)+colors.FgRed} had an error${colors.Reset}`);
				increaseErrorCounter(serverkey, error, error["code"]);
				if (cv(0)) lle(colors.FgRed + "server " + colors.FgCyan+ serverkey+ colors.FgRed + " could not be reached; errorCounter:" + colors.FgCyan, serverErrors[serverkey].errorCounter, colors.Reset);
			}
			socket.end();
		});
		socket.on('data', (data:Buffer)=>{
			if (cv(2)) {
				ll(colors.FgGreen+"recieved data:"+colors.FgCyan,data,colors.Reset);
				ll(colors.FgCyan+data.toString().replace(/[^ -~]/g, "·")+colors.Reset);
			}
			try {
				//if(cv(2)) ll(colors.FgCyan,data,"\n"+colors.FgYellow,data.toString(),colors.Reset);
				// if(cv(2)) ll("Buffer for client "+client.name+":"+colors.FgCyan,client.readbuffer,colors.Reset);
				// if(cv(2)) ll("New Data for client "+client.name+":"+colors.FgCyan,data,colors.Reset);
				var [packages, rest] = ITelexCom.getCompletePackages(data, client.readbuffer);
				// if(cv(2)) ll("New Buffer "+client.name+":"+colors.FgCyan,res[1],colors.Reset);
				// if(cv(2)) ll("Package "+client.name+":"+colors.FgCyan,res[0],colors.Reset);
				client.readbuffer = rest;
				client.packages = client.packages.concat(ITelexCom.decPackages(packages));
				let handleTimeout = ()=>{
					if (cv(2)) ll(colors.FgGreen + "handling: " + colors.FgCyan + client.handling + colors.Reset);
					if (client.handling === false) {
						client.handling = true;
						if (client.handleTimeout != null) {
							clearTimeout(client.handleTimeout);
							client.handleTimeout = null;
						}
						serialEachPromise(client.packages, (pkg, key)=>new Promise((resolve, reject)=>{
							if ((cv(1) && (Object.keys(client.packages).length > 1)) || cv(2)) ll(colors.FgGreen + "handling package " + colors.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors.Reset);
							ITelexCom.handlePackage(pkg, client)
							.then(()=>{
								client.packages.splice(+key, 1);
								resolve();
							})
							.catch(lle);
						}))
						.then(()=>{
							client.handling = false;
						})
						.catch(lle);
					} else {
						if (client.handleTimeout == null) {
							client.handleTimeout = setTimeout(handleTimeout, 10);
						}
					}
				};
				handleTimeout();
			} catch (e) {
				if (cv(2)) lle(e);
			}
		});
		socket.connect(options, ()=>{
			if (cv(1)) ll(colors.FgGreen + "connected to:" + colors.FgCyan, options, colors.FgGreen + "as server " + colors.FgCyan + client.name, colors.Reset);
			resetErrorCounter(serverkey);
			resolve(client);
		});
	});
}

export default connect;