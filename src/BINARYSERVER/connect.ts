"use strict";

import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import * as util from "util";
import * as net from "net";
import * as mysql from "mysql";
import * as async from "async";
import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as connections from "../BINARYSERVER/connections.js"
import * as constants from "../BINARYSERVER/constants.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import handles from "../BINARYSERVER/handles.js";

//#endregion

const verbosity = config.loggingVerbosity;
var cv = level => level <= verbosity; //check verbosity


function connect(
	pool:mysql.Pool|mysql.Connection,
	after:(client:connections.client)=>void,
	options,
	callback:(client:connections.client)=>void
) {
	let onEnd = function () {
		//if (cv(2)) ll(`${colors.FgYellow}calling onEnd handler for server ${util.inspect(options)}${colors.Reset}`);
		try {
			after(client);
		} catch (e) {
			if (cv(0)) lle(colors.FgRed, e, colors.Reset);
		}
	};
	if (cv(1)) ll(colors.FgGreen + "trying to connect to:" + colors.FgCyan, options, colors.Reset);
	try {
		let serverkey = options.host + ":" + options.port;
		var socket = new net.Socket();
		
		var client =
		connections.get(
			connections.add("S" ,{
				connection: socket,
				readbuffer: [],
				state: constants.states.STANDBY,
				packages: [],
				handling: false,
				writebuffer: [],
			})
		);
		socket.setTimeout(config.connectionTimeout);
		socket.on('timeout', function () {
			try {
				if (cv(1)) lle(colors.FgRed + "server: " + colors.FgCyan, options, colors.FgRed + " timed out" + colors.Reset);
				// socket.emit("end");
				// socket.emit("error",new Error("timeout"));
				ITelexCom.increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
				socket.end();
			} catch (e) {
				if (cv(0)) lle(colors.FgRed, e, colors.Reset);
			} finally {
				if (typeof onEnd === "function") onEnd();
			}
		});
		socket.on('data', function (data:Buffer) {
			if (cv(2)) {
				ll(colors.FgGreen+"recieved data:"+colors.FgCyan,data,colors.Reset);
				ll(colors.FgCyan+data.toString().replace(/[^ -~]/g, "·")+colors.Reset);
			}
			try {
				//if(cv(2)) ll(colors.FgCyan,data,"\n"+colors.FgYellow,data.toString(),colors.Reset);
				// if(cv(2)) ll("Buffer for client "+client.cnum+":"+colors.FgCyan,client.readbuffer,colors.Reset);
				// if(cv(2)) ll("New Data for client "+client.cnum+":"+colors.FgCyan,data,colors.Reset);
				var res = ITelexCom.checkFullPackage(data, client.readbuffer);
				// if(cv(2)) ll("New Buffer "+client.cnum+":"+colors.FgCyan,res[1],colors.Reset);
				// if(cv(2)) ll("Package "+client.cnum+":"+colors.FgCyan,res[0],colors.Reset);
				if (res[1]) {
					client.readbuffer = res[1];
				}
				if (res[0]) {
					if (typeof client.packages != "object") client.packages = [];
					client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
					let timeout = function () {
						if (cv(2)) ll(colors.FgGreen + "handling: " + colors.FgCyan + client.handling + colors.Reset);
						if (client.handling === false) {
							client.handling = true;
							if (client.timeout != null) {
								clearTimeout(client.timeout);
								client.timeout = null;
							}
							async.eachOfSeries(client.packages, function (pkg, key, cb) {
								if ((cv(1) && (Object.keys(client.packages).length > 1)) || cv(2)) ll(colors.FgGreen + "handling package " + colors.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors.Reset);
								ITelexCom.handlePackage(pkg, client, pool, function () {
									client.packages.splice(+key, 1);
									cb();
								});
							}, function () {
								client.handling = false;
							});
						} else {
							if (client.timeout == null) {
								client.timeout = setTimeout(timeout, 10);
							}
						}
					};
					timeout();
				}
				/*if(res[0]){
					handlePackage(decPackages(res[0]),client.cnum,pool,socket,handles);
				}*/
			} catch (e) {
				if (cv(2)) lle(e);
			}
		});
		socket.on('error', function (error) {
			if (cv(3)) lle(error);
			try {
				// if(error.code == "ECONNREFUSED"||error.code == "EHOSTUNREACH"){
				if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
					if (cv(1)) ll(`${colors.FgRed}server ${colors.FgCyan+util.inspect(options)+colors.FgRed} had an error${colors.Reset}`);
					/*let exists = false;
					for(let k in serverErrors){
						if(k == serverkey){
							exists = true;
							break;
						}
					}*/
					ITelexCom.increaseErrorCounter(serverkey, error, error["code"]);
					if (cv(0)) lle(colors.FgRed + "server " + colors.FgCyan, options, colors.FgRed + " could not be reached; errorCounter:" + colors.FgCyan, ITelexCom.serverErrors[serverkey].errorCounter, colors.Reset);
				}
				// } else {
				// 	if (cv(0)) lle(colors.FgRed, error, colors.Reset);
				// }
			} catch (e) {
				if (cv(2)) lle(e);
			} finally {
				if(connections.remove(client.cnum)){
					if(cv(1))  ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.cnum+colors.Reset}`);
					client = null;
				}
				if (typeof onEnd === "function") onEnd();
			}
		});
		socket.on('end', function () {
			if(cv(1)) if(client.newEntries != null) ll(`${colors.FgGreen}recieved ${colors.FgCyan}${client.newEntries}${colors.FgGreen} new entries${colors.Reset}`);
			if(cv(1)) ll(colors.FgYellow + "The connection to server " + colors.FgCyan + client.cnum + colors.FgYellow + " ended!" + colors.Reset);
			
			if(connections.remove(client.cnum)){
				if(cv(1)) ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.cnum+colors.Reset}`);
				client = null;
			}
			if (typeof onEnd === "function") onEnd();
		});
		socket.connect(options, function (connection) {
			if (cv(1)) ll(colors.FgGreen + "connected to:" + colors.FgCyan, options, colors.FgGreen + "as server " + colors.FgCyan + client.cnum, colors.Reset);
			if (ITelexCom.serverErrors[serverkey] && (ITelexCom.serverErrors[serverkey].errorCounter > 0)) {
				ITelexCom.serverErrors[serverkey].errorCounter = 0;
				if (cv(2)) ll(colors.FgGreen + "reset error counter for: " + colors.FgCyan, options, colors.Reset);
			}
			if (typeof callback === "function") callback(client);
		});
	} catch (e) {
		if (cv(2)) lle(e);
		if (typeof onEnd === "function") onEnd();
	}
}

export default connect;