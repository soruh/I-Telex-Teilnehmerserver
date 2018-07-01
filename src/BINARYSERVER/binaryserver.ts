"use strict";
function getTimezone(date) { //TODO: figure out way to not hav this in all files where it is used
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
	return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}

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

//#endregion

const cv = ITelexCom.cv;
const readonly = (config.serverPin == null);

if (readonly) ll(`${colors.FgMagenta}Starting in read-only mode!${colors.Reset}`);
if (config.disableColors) colors.disable();

const mySqlConnectionOptions = config['mySqlConnectionOptions'];



var transporter:ITelexCom.MailTransporter;


/*<PKGTYPES>
Client_update: 1
Address_confirm: 2
Peer_query: 3
Peer_not_found: 4
Peer_reply: 5
Sync_FullQuery: 6
Sync_Login: 7
Acknowledge: 8
End_of_List: 9
Peer_search: 10
</PKGTYPES>*/
var handles = {}; //functions for handeling packages
for (let i = 1; i <= 10; i++) {
	handles[i] = {};
}
//handes[packagetype][state of this connection]
//handles[2][constants.states.STANDBY] = (obj,cnum,pool,connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,pool,connection)=>{}; NOT USED
handles[1][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			var number = obj.data.rufnummer;
			var pin = obj.data.pin;
			var port = obj.data.port;
			var ipaddress = connection.remoteAddress.replace(/^.*:/, '');
			if (number < 10000) {
				if (cv(1)) lle(`${colors.FgRed}client tried to update ${number} which is too small(<10000)${colors.Reset}`);
				ITelexCom.sendEmail(transporter, "invalidNumber", {
					"[IpFull]": connection.remoteAddress,
					"[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
					"[number]": number,
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				}, function () {
					connection.end();
					cb();
				});
			} else {
				ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`,[number], function (result_a:ITelexCom.peerList) {
					let results = [];
					if (result_a) {
						for (let r of result_a) {
							if (r.typ != 0) {
								results.push(r);
							}
						}
					}
					if (results.length == 1) {
						var res = results[0];
						if (res.pin == pin) {
							if (res.typ == 5) {
								if (ipaddress != res.ipaddresse || port != res.port) {
									ITelexCom.SqlQuery(pool,
										`UPDATE teilnehmer
											SET
												port = ?,
												ipaddresse = ?,
												changed = 1,
												moddate = ?
											WHERE
												rufnummer = ?
												OR
												(
													Left(name, ?) = Left(?, ?)
													AND port = ?
													AND pin = ?
													AND typ = 5
												)`,[
										port,
										ipaddress,
										Math.floor(Date.now()/1000),
										number,	
										config.DynIpUpdateNameDifference,
										res.name,
										config.DynIpUpdateNameDifference,
										res.port,
										res.pin
									], function (result_b) {
										ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`, [number], function (result_c:ITelexCom.peerList) {
											try {
												connection.write(ITelexCom.encPackage({
													packagetype: 2,
													datalength: 4,
													data: {
														ipaddress: result_c[0].ipaddresse
													}
												}), "binary", function () {
													if (typeof cb === "function") cb();
												});
											} catch (e) {
												if (cv(0)) ll(colors.FgRed, e, colors.Reset);
												if (typeof cb === "function") cb();
											}
										});
									});
								} else {
									if (cv(2)) ll(`${colors.FgYellow}not UPDATING, nothing to update${colors.Reset}`);
									connection.write(ITelexCom.encPackage({
										packagetype: 2,
										datalength: 4,
										data: {
											ipaddress: res.ipaddresse
										}
									}), "binary", function () {
										if (typeof cb === "function") cb();
									});
								}
							} else {
								if (cv(1)) ll(colors.FgRed + "not DynIp type" + colors.Reset);
								connection.end();
								ITelexCom.sendEmail(transporter, "wrongDynIpType", {
									"[typ]": res.typ,
									"[IpFull]": connection.remoteAddress,
									"[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
									"[number]": res.rufnummer,
									"[name]": res.name,
									"[date]": new Date().toLocaleString(),
									"[timeZone]": getTimezone(new Date())
								}, cb);
							}
						} else {
							if (cv(1)) ll(colors.FgRed + "wrong DynIp pin" + colors.Reset);
							connection.end();
							ITelexCom.sendEmail(transporter, "wrongDynIpPin", {
								"[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
								"[number]": res.rufnummer,
								"[name]": res.name,
								"[date]": new Date().toLocaleString(),
								"[timeZone]": getTimezone(new Date())
							}, cb);
						}
					} else if (results.length == 0) {
						let insertQuery =`
						INSERT INTO teilnehmer
							(
								name,
								moddate,
								typ,
								rufnummer,
								port,
								pin,
								ipaddresse,
								gesperrt,
								changed
							) VALUES (
								?,
								?,
								?,
								?,
								?,
								?,
								?,
								?,
								?
							);`;
						let insertOptions = [
							'?',
							Math.floor(Date.now()/1000),
							5,
							number,
							port,
							pin,
							connection.remoteAddress.replace(/^.*:/,''),
							1,
							1
						];
						let deleteQuery = `DELETE FROM teilnehmer WHERE rufnummer=?;`;
						let deleteOptions = [number];

						
						let query:string;
						let options:any[];
						
						let exists:boolean = result_a && (result_a.length > 0);
						if(exists){
							query = deleteQuery;
							options = deleteOptions.concat(insertOptions);
						}else{
							query = deleteQuery + insertQuery;
							options = insertOptions;
						}
						
						ITelexCom.SqlQuery(
							pool,
							query,
							options,
						function (result_b) {
							if (result_b) {
								ITelexCom.sendEmail(transporter, "new", {
									"[IpFull]": connection.remoteAddress,
									"[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
									"[number]": number,
									"[date]": new Date().toLocaleString(),
									"[timeZone]": getTimezone(new Date())
								}, cb);
								ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`, [number], function (result_c:ITelexCom.peerList) {
									try {
										connection.write(ITelexCom.encPackage({
											packagetype: 2,
											datalength: 4,
											data: {
												ipaddress: result_c[0].ipaddresse
											}
										}), "binary", function () {
											if (typeof cb === "function") cb();
										});
									} catch (e) {
										if (cv(0)) ll(colors.FgRed, e, colors.Reset);
										if (typeof cb === "function") cb();
									}
								});
							} else {
								lle(colors.FgRed + "could not create entry", colors.Reset);
								if (typeof cb === "function") cb();
							}
						});
					} else {
						console.error(colors.FgRed, res, colors.Reset);
						if (typeof cb === "function") cb();
					}
				});
			}
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[3][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			if (obj.data.version == 1) {
				var rufnummer = obj.data.rufnummer;
				ITelexCom.SqlQuery(pool, `
					SELECT * FROM teilnehmer WHERE
						rufnummer = ?
						and
						typ != 0
						and
						gesperrt != 1
					;`, [rufnummer], function (result:ITelexCom.peerList) {
					if (cv(2)) ll(colors.FgCyan, result, colors.Reset);
					if ((result[0] != undefined) && (result != [])) {
						let data:any = result[0];
						data.pin = 0;
						data.port = parseInt(result[0].port);
						connection.write(ITelexCom.encPackage({
							packagetype: 5,
							datalength: 100,
							data:<ITelexCom.PackageData_decoded>data
						}), function () {
							if (typeof cb === "function") cb();
						});
					} else {
						connection.write(ITelexCom.encPackage({
							packagetype: 4,
							datalength: 0
						}), function () {
							if (typeof cb === "function") cb();
						});
					}
				});
			} else {
				if (cv(0)) ll(colors.FgRed, "unsupported package version, sending '0x04' package", colors.Reset);
				connection.write(ITelexCom.encPackage({
					packagetype: 4,
					datalength: 0
				}), function () {
					if (typeof cb === "function") cb();
				});
			}
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[5][constants.states.FULLQUERY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			if (cv(1)) ll(colors.FgGreen + "got dataset for:", colors.FgCyan, obj.data.rufnummer, colors.Reset);
			ITelexCom.SqlQuery(pool, `SELECT * from teilnehmer WHERE rufnummer = ?;`, [obj.data.rufnummer], function (entries:ITelexCom.peerList) {
				var o = { //TODO improve;
					rufnummer: obj.data.rufnummer,
					name: obj.data.name,
					typ: obj.data.typ,
					hostname: obj.data.addresse,
					ipaddresse: obj.data.ipaddresse,
					port: obj.data.port,
					extension: obj.data.durchwahl,
					pin: obj.data.pin,
					gesperrt: obj.data.gesperrt,
					moddate: obj.data.timestamp,
					changed: (config.setChangedOnNewerEntry ? 1 : 0)
				};
				// var doLU = ((o.hostname!=""&&o.ipaddresse==null)&&config.doDnsLookups);
				// function lookup(host,callback){
				//   if(host){
				//     if(cv(2)) ll(colors.FgGreen+"starting nslookup for: "+colors.FgCyan+host+colors.FgGreen+" ..."+colors.Reset);
				//    lookup(host,{verbatim:true},function(err, address, family){
				//       if(cv(3)&&err) lle(colors.FgRed,err,colors.Reset);
				//       if(cv(2)&&(!(err))) ll(colors.FgGreen+"nslookup got ip: "+colors.FgCyan+address+colors.Reset);
				//       if(typeof callback === "function") callback(address,entries,o,connection,cb);
				//     });
				//   }else{
				//     if(typeof callback === "function") callback(null,entries,o,connection,cb);
				//   }
				// }
				if (entries.length == 1) {
					var entry:ITelexCom.peer = entries[0];
					if (obj.data.timestamp > entry.moddate) {
						// lookup((doLU?o.hostname:false),function(addr,entry,o,connection,cb){
						//   if(doLU&&addr){
						//     o.ipaddresse = addr;
						//   }
						if (cv(2)) ll(colors.FgGreen + "entry is older: " + colors.FgCyan + obj.data.timestamp + colors.FgGreen + " > " + colors.FgCyan + entry.moddate + colors.Reset);
						var sets = "";
						for (let k in o) {
							if (o[k] != undefined) {
								sets += k + " = " + mysql.escape(o[k]) + ", ";
							} else {
								sets += k + " = DEFAULT, ";
							}
						}
						var q = `UPDATE teilnehmer SET ${sets.substring(0,sets.length-2)} WHERE rufnummer = ?;`;
						ITelexCom.SqlQuery(pool, q, [obj.data.rufnummer], function (res2) {
							connection.write(ITelexCom.encPackage({
								packagetype: 8,
								datalength: 0
							}), function () {
								if (typeof cb === "function") cb();
							});
						});
						// });
					} else {
						if (cv(2)) ll(colors.FgYellow + "recieved entry is " + colors.FgCyan + (parseInt(entry.moddate) - parseInt(obj.data.timestamp)) + colors.FgYellow + " seconds older and was ignored" + colors.Reset);
						connection.write(ITelexCom.encPackage({
							packagetype: 8,
							datalength: 0
						}), function () {
							if (typeof cb === "function") cb();
						});
					}
				} else if (entries.length == 0) {
					// lookup((doLU?o.hostname:false),function(addr,entry,o,connection,cb){
					//   if(doLU&&addr){
					//     o.ipaddresse = addr;
					//   }
					var names = "";
					var values = "";
					for (let k in o) {
						if (o[k] != undefined) {
							names += k + ", ";
							values += mysql.escape(o[k]) + ", ";
						}
					}
					var q = `INSERT INTO teilnehmer(${names.substring(0, names.length - 2)}) VALUES (${values.substring(0, values.length - 2)});`;
					ITelexCom.SqlQuery(pool, q, [], function (res2) {
						connection.write(ITelexCom.encPackage({
							packagetype: 8,
							datalength: 0
						}), function () {
							if (typeof cb === "function") cb();
						});
					});
					// });
				} else {
					if (cv(0)) ll('The "rufnummer" field should be unique! This error should not occur!');
					if (typeof cb === "function") cb();
				}
			});
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[5][constants.states.LOGIN] = handles[5][constants.states.FULLQUERY];
handles[6][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			if (obj.data.serverpin == config.serverPin || (readonly && config.allowFullQueryInReadonly)) {
				if (cv(1)) ll(colors.FgGreen, "serverpin is correct!", colors.Reset);
				ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer;", [], function (result:ITelexCom.peerList) {
					if ((result[0] != undefined) && (result != [])) {
						client.writebuffer = result;
						client.state = constants.states.RESPONDING;
						ITelexCom.handlePackage({
							packagetype: 8,
							datalength: 0,
							data: {}
						}, cnum, pool, connection, handles, cb);
					} else {
						connection.write(ITelexCom.encPackage({
							packagetype: 9,
							datalength: 0
						}), function () {
							if (typeof cb === "function") cb();
						});
					}
				});
			} else {
				if (cv(1)) {
					ll(colors.FgRed + "serverpin is incorrect! " + colors.FgCyan + obj.data.serverpin + colors.FgRed + " != " + colors.FgCyan + config.serverPin + colors.FgRed + " ending connection!" + colors.Reset); //TODO: remove pin logging
					connection.end();
				}
				ITelexCom.sendEmail(transporter, "wrongServerPin", {
					"[IpFull]": connection.remoteAddress,
					"[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				}, cb);
			}
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[7][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			if ((obj.data.serverpin == config.serverPin) || (readonly && config.allowLoginInReadonly)) {
				if (cv(1)) ll(colors.FgGreen, "serverpin is correct!", colors.Reset);
				connection.write(ITelexCom.encPackage({
					packagetype: 8,
					datalength: 0
				}), function () {
					client.state = constants.states.LOGIN;
					if (typeof cb === "function") cb();
				});
			} else {
				if (cv(1)) {
					ll(colors.FgRed + "serverpin is incorrect!" + colors.FgCyan + obj.data.serverpin + colors.FgRed + " != " + colors.FgCyan + config.serverPin + colors.FgRed + "ending connection!" + colors.Reset);
					connection.end();
				}
				ITelexCom.sendEmail(transporter, "wrongServerPin", {
					"[IpFull]": connection.remoteAddress,
					"[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				}, cb);
			}
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[8][constants.states.RESPONDING] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			if (cv(1)) {
				var toSend = [];
				for (let o of client.writebuffer) {
					toSend.push(o.rufnummer);
				}
				ll(colors.FgGreen + "entrys to transmit:" + colors.FgCyan + (cv(2) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors.Reset);
			}
			if (client.writebuffer.length > 0) {
				connection.write(ITelexCom.encPackage({
					packagetype: 5,
					datalength: 100,
					data: client.writebuffer[0]
				}), function () {
					if (cv(1)) ll(colors.FgGreen + "sent dataset for:", colors.FgCyan, client.writebuffer[0].rufnummer, colors.Reset);
					client.writebuffer = client.writebuffer.slice(1);
					if (typeof cb === "function") cb();
				});
			} else if (client.writebuffer.length == 0) {
				connection.write(ITelexCom.encPackage({
					packagetype: 9,
					datalength: 0
				}), function () {
					client.writebuffer = [];
					client.state = constants.states.STANDBY;
					if (typeof cb === "function") cb();
				});
			} else {
				if (typeof cb === "function") cb();
			}
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[9][constants.states.FULLQUERY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			client.state = constants.states.STANDBY;
			if (typeof client.cb === "function") client.cb();
			if (typeof cb === "function") cb();
			connection.end();
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[9][constants.states.LOGIN] = handles[9][constants.states.FULLQUERY];
handles[10][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
	try {
		let client = ITelexCom.connections.get(cnum);
		if (client) {
			if (cv(2)) ll(obj);
			let version = obj.data.version;
			let query = obj.data.pattern;
			let queryarr = query.split(" ");
			let searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ??".repeat(query.length)};`;
			ITelexCom.SqlQuery(pool, searchstring, queryarr.map(q=>`%${q}%`), function (result:ITelexCom.peerList) {
				if ((result[0] != undefined) && (result != [])) {
					var towrite = [];
					for (let o of result) {
						if (o.gesperrt != 1 && o.typ != 0) {
							o.pin = "0";
							towrite.push(o);
						}
					}
					client.writebuffer = towrite;
					client.state = constants.states.RESPONDING;
					ITelexCom.handlePackage({
						packagetype: 8,
						datalength: 0,
						data: {}
					}, cnum, pool, connection, handles, cb);
				} else {
					connection.write(ITelexCom.encPackage({
						packagetype: 9,
						datalength: 0
					}), function () {
						if (typeof cb === "function") cb();
					});
				}
			});
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};

function init() {
	if (cv(0)) ll(colors.FgMagenta + "Initialising!" + colors.Reset);
	var server = net.createServer(function (connection) {
		try {			
			var cnum = connections.add("C", {
				connection: connection,
				state: constants.states.STANDBY,
				handling: false,
				readbuffer:null,
				writebuffer:null,
				packages: []
			});
			var client = ITelexCom.connections.get(cnum);
			if (cv(1)) ll(colors.FgGreen + "client " + colors.FgCyan + cnum + colors.FgGreen + " connected with ipaddress: " + colors.FgCyan + connection.remoteAddress + colors.Reset); //.replace(/^.*:/,'')
			if (connection.remoteAddress == undefined) setTimeout(function () {
				ll(connection.remoteAddress);
			}, 1000);
			var queryresultpos = -1;
			var queryresult = [];
			var connectionpin;
			connection.setTimeout(config.connectionTimeout);
			connection.on('timeout', function () {
				if (cv(1)) ll(colors.FgYellow + "client " + colors.FgCyan + cnum + colors.FgYellow + " timed out" + colors.Reset);
				connection.end();
			});
			connection.on('end', function () {
				if (cv(1)) ll(colors.FgYellow + "client " + colors.FgCyan + cnum + colors.FgYellow + " disconnected" + colors.Reset);
				try {
					clearTimeout(client.timeout);
				} catch (e) {
					if (cv(2)) lle(colors.FgRed, e, colors.Reset);
				}
				if (ITelexCom.connections.has(cnum) && ITelexCom.connections.get(cnum).connection == connection) {
					setTimeout(function (cnum) {
						if(ITelexCom.connections.remove(cnum)){
							ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+cnum+colors.FgGreen}${colors.Reset}`);
							cnum = null;
							client = null;
						}
					}, 1000, cnum);
				}
			});
			connection.on('error', function (err) {
				if (cv(1)) ll(colors.FgRed + "client " + colors.FgCyan + cnum + colors.FgRed + " had an error:\n", err, colors.Reset);
				try {
					clearTimeout(client.timeout);
				} catch (e) {
					if (cv(2)) lle(colors.FgRed, e, colors.Reset);
				}
				if (ITelexCom.connections.has(cnum) && ITelexCom.connections.get(cnum).connection == connection) {
					setTimeout(function (cnum) {
						if(ITelexCom.connections.remove(cnum)){
							ll(`${colors.FgGreen}deleted connection ${colors.FgCyan+cnum+colors.Reset}`);
							cnum = null;
							client = null;
						}
					}, 1000, cnum);
				}
			});
			connection.on('data', function (data) {
				if (cv(2)) {
					ll(colors.FgGreen + "recieved data:" + colors.Reset);
					ll(colors.FgCyan, data, colors.Reset);
					ll(colors.FgCyan, data.toString().replace(/\u0000/g, "").replace(/[^ -~]/g, " "), colors.Reset);
				}
				if (data[0] == 113 && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/ ) {
					if (cv(2)) ll(colors.FgGreen + "serving ascii request" + colors.Reset);
					ITelexCom.ascii(data, connection, pool); //TODO: check for fragmentation //probably not needed
				} else if (data[0] == 99) {
					if (config.doDnsLookups) {
						var arg = data.slice(1).toString().replace(/\n/g, "").replace(/\r/g, "");
						if (cv(1)) ll(`${colors.FgGreen}checking if ${colors.FgCyan+arg+colors.FgGreen} belongs to participant${colors.Reset}`);

						let check = function check(IpAddr) {
							if (ip.isV4Format(IpAddr) || ip.isV6Format(IpAddr)) {
								ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE gesperrt != 1 AND typ != 0;", [], function (res:ITelexCom.peerList) {
									var ips = [];
									async.eachOf(res, function (r, key, cb) {
										if ((!r.ipaddresse) && r.hostname) {
											// ll(`hostname: ${r.hostname}`)
											lookup(r.hostname, {}, function (err, address, family) {
												if (cv(3) && err) lle(colors.FgRed, err, colors.Reset);
												if (address) {
													ips.push(address);
													// ll(`${r.hostname} resolved to ${address}`);
												}
												cb();
											});
										} else if (r.ipaddresse && (ip.isV4Format(r.ipaddresse) || ip.isV6Format(r.ipaddresse))) {
											// ll(`ip: ${r.ipaddresse}`);
											ips.push(r.ipaddresse);
											cb();
										} else {
											cb();
										}
									}, function () {
										// ips = ips.filter(function(elem, pos){
										//   return ips.indexOf(elem) == pos;
										// });
										// ll(JSON.stringify(ips))
										let exists = ips.filter(i => ip.isEqual(i, IpAddr)).length > 0;
										// ll(exists);
										// var exists = 0;
										// for(var i in ips){
										//   if(ip.isEqual(ips[i],IpAddr)){
										//     exists = 1;
										//   }
										// }
										connection.write(exists + "\r\n");
									});
								});
							} else {
								// connection.write("-1\r\n");
								connection.write("ERROR\r\nnot a valid host or ip\r\n");
							}
						};

						if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
							check(arg);
						} else {
							lookup(arg, {}, function (err, address, family) {
								if (cv(3) && err) lle(colors.FgRed, err, colors.Reset);
								check(address);
							});
						}
					} else {
						connection.write("ERROR\r\nthis server does not support this function\r\n");
					}
				} else {
					if (cv(2)) ll(colors.FgGreen + "serving binary request" + colors.Reset);

					if (cv(2)) ll("Buffer for client " + cnum + ":" + colors.FgCyan, client.readbuffer, colors.Reset);
					if (cv(2)) ll("New Data for client " + cnum + ":" + colors.FgCyan, data, colors.Reset);
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
									ITelexCom.handlePackage(pkg, cnum, pool, connection, handles, function () {
										client.packages.splice(key, 1);
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
	server.listen(config.binaryPort, function () {
		if (cv(0)) ll(colors.FgMagenta + "server is listening on port " + colors.FgCyan + config.binaryPort, colors.Reset);

		timers.TimeoutWrapper(getFullQuery, config.fullQueryInterval);
		timers.TimeoutWrapper(updateQueue, config.updateQueueInterval);
		timers.TimeoutWrapper(sendQueue, config.queueSendInterval);
		getFullQuery();
		//updateQueue();
	});
}

function updateQueue(callback) {
	if (cv(2)) ll(colors.FgMagenta + "updating " + colors.FgCyan + "Queue" + colors.FgMagenta + "!" + colors.Reset);
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
							if (typeof callback === "function") callback();
						});
					});
				} else {
					ll(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "updateQueue" + colors.Reset);
					if (typeof callback === "function") callback();
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
			if (typeof callback === "function") callback();
			//setTimeout(updateQueue,config.updateQueueInterval);
		}
	});
}

function getFullQuery(callback?:()=>void) {
	if (cv(2)) ll(colors.FgMagenta + "geting " + colors.FgCyan + "FullQuery" + colors.FgMagenta + "!" + colors.Reset);
	/*if(readonly){
    ITelexCom.connect(pool,transporter,function(e){
      if(typeof callback === "function") callback();
    },{host:config.readonlyHost,port:config.readonlyPort},handles,function(client,cnum){
      client.write(ITelexCom.encPackage({packagetype:10,datalength:41,data:{pattern:'',version:1}}),function(){
        ITelexCom.connections.get(cnum).state = constants.states.FULLQUERY;
      });
    });
  }else{*/
	ITelexCom.SqlQuery(pool, "SELECT  * FROM servers;", [], function (servers:ITelexCom.serverList) {
		if (servers.length > 0) {
			for (let i in servers) {
				if (servers[i].addresse == config.fullQueryServer.split(":")[0] && servers[i].port == config.fullQueryServer.split(":")[1]) {
					servers = [servers[i]];
				}
			}
			async.eachSeries(servers, function (r, cb) {
				connect(pool, transporter, function (e) {
					try {
						cb();
					} catch (e) {
						if (cv(2)) lle(colors.FgRed, e, colors.Reset);
					}
				}, {
					host: r.addresse,
					port: r.port
				}, handles, function (client, cnum) {
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
						client.write(ITelexCom.encPackage(request), function () {
							ITelexCom.connections.get(cnum).state = constants.states.FULLQUERY;
							ITelexCom.connections.get(cnum).cb = cb;
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
				if (typeof callback === "function") callback();
			});
		} else {
			ll(colors.FgYellow + "No configured servers -> aborting " + colors.FgCyan + "FullQuery" + colors.Reset);
			if (typeof callback === "function") callback();
		}
	});
	//}
}

function sendQueue(callback) {
	if (cv(2)) ll(colors.FgMagenta + "sending " + colors.FgCyan + "Queue" + colors.FgMagenta + "!" + colors.Reset);
	if (readonly) {
		if (cv(2)) ll(colors.FgYellow + "Read-only mode -> aborting " + colors.FgCyan + "sendQueue" + colors.Reset);
		if (typeof callback === "function") callback();
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
						ITelexCom.SqlQuery(pool, "SELECT  * FROM servers WHERE uid=??;",[server[0].server], function (result2:ITelexCom.serverList) {
							if (result2.length == 1) {
								var serverinf = result2[0];
								if (cv(2)) ll(colors.FgCyan, serverinf, colors.Reset);
								try {
									var isConnected = false;
									for (let key in ITelexCom.connections) {
										if (ITelexCom.connections.has(key)) {
											var c = ITelexCom.connections[key];
										}
										if (c.servernum == server[0].server) {
											var isConnected = true;
										}
									}
									if (!isConnected) {
										connect(pool, transporter, cb, {
											host: serverinf.addresse,
											port: serverinf.port
										}, handles, function (client, cnum) {
											ITelexCom.connections.get(cnum).servernum = server[0].server;
											if (cv(1)) ll(colors.FgGreen + 'connected to server ' + server[0].server + ': ' + serverinf.addresse + " on port " + serverinf.port + colors.Reset);
											ITelexCom.connections.get(cnum).writebuffer = [];
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
															ITelexCom.connections.get(cnum).writebuffer.push(existing); //TODO
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
												client.write(ITelexCom.encPackage({
													packagetype: 7,
													datalength: 5,
													data: {
														serverpin: config.serverPin,
														version: 1
													}
												}), function () {
													ITelexCom.connections.get(cnum).state = constants.states.RESPONDING;
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
						if (typeof callback === "function") callback();
					});
				} else {
					if (cv(2)) ll(colors.FgYellow + "No queue!", colors.Reset);
					if (typeof callback === "function") callback();
				}
			});
		});
	}
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
						transporter = {
							sendMail: function sendMail() {
								lle("can't send mail after Mail error");
							},
							options: {
								host: "Failed to get test Account"
							}
						};
					} else {
						if (cv(0)) ll(colors.FgMagenta + "Got email test account:\n" + colors.FgCyan + util.inspect(account) + colors.Reset);
						transporter = nodemailer.createTransport({
							host: 'smtp.ethereal.email',
							port: 587,
							secure: false, // true for 465, false for other ports
							auth: {
								user: account.user, // generated ethereal user
								pass: account.pass // generated ethereal password
							}
						});
					}
					init();
				});
			} else {
				transporter = nodemailer.createTransport(config.eMail.account);
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
		if (options.cleanup) ll(`serverErrors:\n${util.inspect(ITelexCom.serverErrors,{depth:null})}`);
		if (options.exit) process.exit();
	};
	process.on('exit', exitHandler.bind(null, {
		cleanup: true
	}));
	process.on('SIGINT', exitHandler.bind(null, {
		exit: true
	}));
	process.on('SIGUSR1', exitHandler.bind(null, {
		exit: true
	}));
	process.on('SIGUSR2', exitHandler.bind(null, {
		exit: true
	}));
	process.on('uncaughtException', exitHandler.bind(null, {
		exit: true
	}));
}