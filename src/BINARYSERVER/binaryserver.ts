"use strict";
//#region imports
import * as util from 'util';
import * as net from 'net';

import * as fs from "fs";
import * as path from "path";
import {lookup} from 'dns';

import * as async from "async";
import * as mysql from "mysql";
import * as ip from "ip";

import * as timers from "../BINARYSERVER/timers.js";
import config from '../COMMONMODULES/config.js';
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import colors from "../COMMONMODULES/colors.js";
import * as nodemailer from "nodemailer";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as connections from "../BINARYSERVER/connections.js";
import * as constants from "../BINARYSERVER/constants.js";
import connect from "../BINARYSERVER/connect.js";
import handles from "../BINARYSERVER/handles.js";
import {getTransporter, setTransporter} from "../BINARYSERVER/transporter.js";

//#endregion

import {cv} from "../BINARYSERVER/ITelexCom.js";
const readonly = (config.serverPin == null);

if (readonly) ll(`${colors.FgMagenta}Starting in read-only mode!${colors.Reset}`);
if (config.disableColors) colors.disable();

const mySqlConnectionOptions = config['mySqlConnectionOptions'];




var server = net.createServer(function (connection) {
	try {
		var client = 
		connections.get(
			connections.add("C", {
				connection: connection,
				state: constants.states.STANDBY,
				handling: false,
				readbuffer:null,
				writebuffer:null,
				packages: []
			})
		);
		//TODO: only get cnum from client.cnum!!!
		if (cv(1)) ll(colors.FgGreen + "client " + colors.FgCyan + client.cnum + colors.FgGreen + " connected with ipaddress: " + colors.FgCyan + connection.remoteAddress + colors.Reset); //.replace(/^.*:/,'')
		connection.setTimeout(config.connectionTimeout);
		connection.on('timeout', function ():void{
			if (cv(1)) ll(colors.FgYellow + "client " + colors.FgCyan + client.cnum + colors.FgYellow + " timed out" + colors.Reset);
			connection.end();
		});
		connection.on('end', function ():void {
			if(client){
				if(cv(1)) if(client.newEntries != null) ll(`${colors.FgGreen}recieved ${colors.FgCyan}${client.newEntries}${colors.FgGreen} new entries${colors.Reset}`);
				if (cv(1)) ll(colors.FgYellow + "client " + colors.FgCyan + client.cnum + colors.FgYellow + " disconnected" + colors.Reset);
				try {
					clearTimeout(client.timeout);
				} catch (e) {
					if (cv(2)) lle(colors.FgRed, e, colors.Reset);
				}
				if (client&&connections.has(client.cnum) && connections.get(client.cnum) == client) {
					if(connections.remove(client.cnum)){
						ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.cnum+colors.FgGreen}${colors.Reset}`);
						client = null;
					}
				}
			}
		});
		connection.on('error', function (err:Error):void {
			if(client){
				if (cv(1)) ll(colors.FgRed + "client " + colors.FgCyan + client.cnum + colors.FgRed + " had an error:\n", err, colors.Reset);
				try {
					clearTimeout(client.timeout);
				} catch (e) {
					if (cv(2)) lle(colors.FgRed, e, colors.Reset);
				}
				if (client&&connections.has(client.cnum) && connections.get(client.cnum) == client) {
					if(connections.remove(client.cnum)){
						ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+client.cnum+colors.Reset}`);
						client = null;
					}
				}
			}
		});
		connection.on('data', function (data:Buffer):void {
			if (cv(2)) {
				ll(colors.FgGreen + "recieved data:" + colors.Reset);
				ll(colors.FgCyan, data, colors.Reset);
				ll(colors.FgCyan, data.toString().replace(/\u0000/g, "").replace(/[^ -~]/g, " "), colors.Reset);
			}
			if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/ ) {
				if (cv(2)) ll(colors.FgGreen + "serving ascii request" + colors.Reset);
				ITelexCom.ascii(data, client, pool); //TODO: check for fragmentation //probably not needed
			} else if (data[0] == 'c'.charCodeAt(0)) {
				ITelexCom.checkIp(data, client, pool);
			} else {
				if (cv(2)) ll(colors.FgGreen + "serving binary request" + colors.Reset);

				if (cv(2)) ll("Buffer for client " + client.cnum + ":" + colors.FgCyan, client.readbuffer, colors.Reset);
				if (cv(2)) ll("New Data for client " + client.cnum + ":" + colors.FgCyan, data, colors.Reset);
				var res = ITelexCom.checkFullPackage(data, client.readbuffer);
				if (cv(2)) ll("New Buffer:" + colors.FgCyan, res[1], colors.Reset);
				if (cv(2)) ll("Complete Package:" + colors.FgCyan, res[0], colors.Reset);
				if (res[1].length > 0) {
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
							async.eachOfSeries((client.packages != undefined ? client.packages : []), function (pkg, key, cb) {
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
			}
		});
	} catch (e) {
		if (cv(0)) lle(colors.FgRed, e, colors.Reset);
	}
});
server.on("error", err => lle("server error:", err));

function init() {
	if (cv(0)) ll(colors.FgMagenta + "Initialising!" + colors.Reset);
	server.listen(config.binaryPort, function () {
		if (cv(0)) ll(colors.FgMagenta + "server is listening on port " + colors.FgCyan + config.binaryPort, colors.Reset);

		timers.TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
		timers.TimeoutWrapper(sendQueue, config.queueSendInterval);
		getFullQuery();
		//updateQueue();
	});
}

function updateQueue() {
	return new Promise((resolve, reject)=>{
		if (cv(2)) ll(colors.FgMagenta + "updating " + colors.FgCyan + "Queue" + colors.Reset);
		ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE changed = ?;", [1], function (changed:ITelexCom.peerList) {
			if (changed.length > 0) {
				if (cv(2)) {
					var changed_numbers = [];
					for (let o of changed) {
						changed_numbers.push(o.rufnummer);
					}
					ll(colors.FgGreen + "numbers to enqueue:" + colors.FgCyan, changed_numbers, colors.Reset);
				}
				if (cv(1) && !cv(2)) ll(colors.FgCyan + changed.length + colors.FgGreen + " numbers to enqueue" + colors.Reset);

				ITelexCom.SqlQuery(pool, "SELECT * FROM servers;",[], function (servers:ITelexCom.serverList) {
					if (servers.length > 0) {
						async.each(servers, function (server, cb1) {
							async.each(changed, function (message, cb2) {
								ITelexCom.SqlQuery(pool, "SELECT * FROM queue WHERE server = ? AND message = ?;" ,[server.uid, message.uid], function (qentry:ITelexCom.queue) {
									if (qentry.length == 1) {
										ITelexCom.SqlQuery(pool, "UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;",[Math.floor(Date.now() / 1000),server.uid, message.uid], function () {
											//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
											if (cv(2)) ll(colors.FgGreen, "enqueued:", colors.FgCyan, message.rufnummer, colors.Reset);
											cb2();
											//});
										});
									} else if (qentry.length == 0) {
										ITelexCom.SqlQuery(pool, "INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)",[server.uid, message.uid, Math.floor(Date.now() / 1000)], function () {
											//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
											if (cv(2)) ll(colors.FgGreen, "enqueued:", colors.FgCyan, message.rufnummer, colors.Reset);
											cb2();
											//});
										});
									} else {
										lle("duplicate queue entry!");
										ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE server = ? AND message = ?;",[server.uid, message.uid], function () {
											ITelexCom.SqlQuery(pool, "INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)",[server.uid,message.uid,Math.floor(Date.now() / 1000)], function () {
												//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
												if (cv(2)) ll(colors.FgGreen, "enqueued:", colors.FgCyan, message.rufnummer, colors.Reset);
												cb2();
												//});
											});
										});
									}
								});
							}, cb1);
						}, function () {
							if (cv(1)) ll(colors.FgGreen + "finished enqueueing" + colors.Reset);
							if (cv(2)) ll(colors.FgGreen + "reseting changed flags..." + colors.Reset);
							ITelexCom.SqlQuery(pool, "UPDATE teilnehmer SET changed = ? WHERE uid="+changed.map(entry => entry.uid).join(" or uid=")+";", [0], function (res) {
								if (cv(2)) ll(colors.FgGreen + "reset " + colors.FgCyan + changed.length + colors.FgGreen + " changed flags." + colors.Reset);
								resolve();
							});
						});
					} else {
						ll(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "updateQueue" + colors.Reset);
						resolve();
					}
				});
			} else {
				if (cv(2)) ll(colors.FgYellow + "no numbers to enqueue" + colors.Reset);
				/*if(qwdec == null){
					qwdec = "unknown";
					//TODO qwd.stdin.write("sendQueue",callback);
			if(typeof callback === "function") callback();
				}else{
			if(typeof callback === "function") callback();
				}*/
				resolve();
				//setTimeout(updateQueue,config.updateQueueInterval);
			}
		});
	});
}

function getFullQuery() {
	return new Promise((resolve, reject)=>{
		if (cv(2)) ll(colors.FgMagenta + "geting " + colors.FgCyan + "FullQuery" + colors.Reset);
		/*if(readonly){
		ITelexCom.connect(pool,function(e){
		if(typeof callback === "function") callback();
		},{host:config.readonlyHost,port:config.readonlyPort},handles,function(client,client.cnum){
		client.write(ITelexCom.encPackage({packagetype:10,datalength:41,data:{pattern:'',version:1}}),function(){
			client.state = constants.states.FULLQUERY;
		});
		});
	}else{*/
		ITelexCom.SqlQuery(pool, "SELECT  * FROM servers;", [], function (servers:ITelexCom.serverList) {
			if (servers.length > 0) {
				for (let i in servers) {
					if (config.fullQueryServer&&servers[i].addresse == config.fullQueryServer.split(":")[0] && servers[i].port == config.fullQueryServer.split(":")[1]) {
						servers = [servers[i]];
					}
				}
				async.eachSeries(servers, function (r, cb) {
					connect(pool, function (e) {
						try {
							cb();
						} catch (e) {
							if (cv(2)) lle(colors.FgRed, e, colors.Reset);
						}
					}, {
						host: r.addresse,
						port: r.port
					}, function (client) {
						try {
							let request = readonly ? {
								packagetype: 10,
								datalength: 41,
								data: {
									pattern: '',
									version: 1
								}
							} : {
								packagetype: 6,
								datalength: 5,
								data: {
									serverpin: config.serverPin,
									version: 1
								}
							};
							client.connection.write(ITelexCom.encPackage(request), function () {
								client.state = constants.states.FULLQUERY;
								client.cb = cb;
							});
						} catch (e) {
							if (cv(2)) lle(colors.FgRed, e, colors.Reset);
							try {
								cb();
							} catch (e) {
								if (cv(2)) lle(colors.FgRed, e, colors.Reset);
							}
						}
					});
				}, function () {
					resolve();
				});
			} else {
				ll(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "FullQuery" + colors.Reset);
				resolve();
			}
		});
		//}
	});
}

function sendQueue() {
	return new Promise((resolve, reject)=>{
		if (cv(2)) ll(colors.FgMagenta + "sending " + colors.FgCyan + "Queue" + colors.Reset);
		if (readonly) {
			if (cv(2)) ll(colors.FgYellow + "Read-only mode -> aborting " + colors.FgCyan + "sendQueue" + colors.Reset);
			resolve();
		} else {
			ITelexCom.SqlQuery(pool, "SELECT * FROM teilnehmer;",[], function (teilnehmer:ITelexCom.peerList) {
				ITelexCom.SqlQuery(pool, "SELECT * FROM queue;",[], function (queue:ITelexCom.queue) {
					if (queue.length > 0) {
						var servers:{
							[index:number]: ITelexCom.queueEntry[]
						} = {};
						for (let q of queue) {
							if (!servers[q.server]) servers[q.server] = [];
							servers[q.server].push(q);
						}
						async.eachSeries(servers, function (server, cb) {
							ITelexCom.SqlQuery(pool, "SELECT  * FROM servers WHERE uid=?;",[server[0].server], function (result2:ITelexCom.serverList) {
								if (result2.length == 1) {
									var serverinf = result2[0];
									if (cv(2)) ll(colors.FgCyan, serverinf, colors.Reset);
									try {
										// var isConnected = false;
										// for (let key in connections) {
										// 	if (connections.has(key)) {
										// 		var c = connections[key];
										// 	}
										// 	if (c.servernum == server[0].server) {
										// 		var isConnected = true;
										// 	}
										// }
										let isConnected = connections.has(connection=>connection.servernum == server[0].server);
										if (!isConnected) {
											connect(pool, cb, {
												host: serverinf.addresse,
												port: serverinf.port
											}, function (client) {
												client.servernum = server[0].server;
												if (cv(1)) ll(colors.FgGreen + 'connected to server ' + server[0].server + ': ' + serverinf.addresse + " on port " + serverinf.port + colors.Reset);
												client.writebuffer = [];
												async.each(server, function (serverdata, scb) {
													if (cv(2)) ll(colors.FgCyan, serverdata, colors.Reset);
													var existing:ITelexCom.peer = null;
													for (let t of teilnehmer) {
														if (t.uid == serverdata.message) {
															existing = t;
														}
													}
													if (existing) {
														ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE uid=?;", [serverdata.uid], function (res) {
															if (res.affectedRows > 0) {
																client.writebuffer.push(existing); //TODO
																if (cv(1)) ll(colors.FgGreen + "deleted queue entry " + colors.FgCyan + existing.name + colors.FgGreen + " from queue" + colors.Reset);
																scb();
															} else {
																if (cv(1)) ll(colors.FgRed + "could not delete queue entry " + colors.FgCyan + existing.name + colors.FgRed + " from queue" + colors.Reset);
																scb();
															}
														});
													} else {
														if (cv(2)) ll(colors.FgRed + "entry does not exist" + colors.FgCyan + colors.Reset);
														scb();
													}
												}, function () {
													client.connection.write(ITelexCom.encPackage({
														packagetype: 7,
														datalength: 5,
														data: {
															serverpin: config.serverPin,
															version: 1
														}
													}), function () {
														client.state = constants.states.RESPONDING;
														cb();
													});
												});
											});
										} else {
											if (cv(1)) ll(colors.FgYellow + "already connected to server " + server[0].server + colors.Reset);
											cb();
										}
									} catch (e) {
										if (cv(2)) lle(e);
										cb();
									}
								} else {
									ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE server=?;", [server[0].server], cb);
								}
							});
						}, function () {
							resolve();
						});
					} else {
						if (cv(2)) ll(colors.FgYellow + "No queue!", colors.Reset);
						resolve();
					}
				});
			});
		}
	});
}


var pool = mysql.createPool(mySqlConnectionOptions); //TODO: pool(to many open connections)
pool.getConnection(function (err, connection) {
	if (err) {
		lle(colors.FgRed, "Could not connect to database!", colors.Reset);
		throw err;
	} else {
		connection.release();
		if (cv(0)) ll(colors.FgMagenta + "Successfully connected to database!" + colors.Reset);
		if (module.parent === null) {
			if (config.eMail.useTestAccount) {
				nodemailer.createTestAccount(function (err, account) {
					if (err) {
						lle(err);
						setTransporter({
							sendMail: function sendMail() {
								lle("can't send mail after Mail error");
							},
							options: {
								host: "Failed to get test Account"
							}
						});
					} else {
						if (cv(0)) ll(colors.FgMagenta + "Got email test account:\n" + colors.FgCyan + util.inspect(account) + colors.Reset);
						setTransporter(nodemailer.createTransport({
							host: 'smtp.ethereal.email',
							port: 587,
							secure: false, // true for 465, false for other ports
							auth: {
								user: account.user, // generated ethereal user
								pass: account.pass // generated ethereal password
							}
						}));
					}
					init();
				});
			} else {
				setTransporter(nodemailer.createTransport(config.eMail.account));
				init();
			}
		} else {
			if (cv(0)) ll(colors.FgMagenta + "Was required by another file -> Initialising exports" + colors.Reset);
			module.exports = {
				init: init,
				updateQueue: updateQueue,
				getFullQuery: getFullQuery,
				ITelexCom: ITelexCom
			};
		}
	}
});

if (cv(3)) {
	let exitHandler = function exitHandler(options, err) {
		if (options.cleanup){
			console.error("exited with code: "+err);
			console.error(`serverErrors:\n${util.inspect(ITelexCom.serverErrors,{depth:null})}`);
		}else{
			console.error(err);
		}
		if(options.exit) process.exit(options.code);
	};
	process.on('exit', exitHandler.bind(null, {
		cleanup: true
	}));
	process.on('SIGINT', exitHandler.bind(null, {
		exit: true,
		code: -1
	}));
	process.on('uncaughtException', exitHandler.bind(null, {
		exit: true,
		code: -2
	}));
	process.on('SIGUSR1', exitHandler.bind(null, {
		exit: true,
		code: -3
	}));
	process.on('SIGUSR2', exitHandler.bind(null, {
		exit: true,
		code: -4
	}));
}