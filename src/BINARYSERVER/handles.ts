"use strict";
function getTimezone(date) { //TODO: figure out way to not hav this in all files where it is used
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
	return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}

//#region imports
import * as util from 'util';
import * as mysql from "mysql";
import * as ip from "ip";
import config from '../COMMONMODULES/config.js';
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import colors from "../COMMONMODULES/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import {cv} from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as connections from "../BINARYSERVER/connections.js"
import * as misc from "../BINARYSERVER/misc.js";
//#endregion

const readonly = (config.serverPin == null);

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
//handes[packagetype][state of this client.connection]
//handles[2][constants.states.STANDBY] = (pkg,cnum,pool,client.connection)=>{}; NOT USED
//handles[4][WAITING] = (pkg,cnum,pool,client.connection)=>{}; NOT USED
handles[1][constants.states.STANDBY] = function (pkg:ITelexCom.Package_decoded_1, client:connections.client, pool, cb) {
	try {
		if (client) {
			var number = pkg.data.number;
			var pin = pkg.data.pin;
			var port = pkg.data.port;
			var ipaddress = client.connection.remoteAddress.replace(/^.*:/, '');
			if (number < 10000) {
				if (cv(1)) lle(`${colors.FgRed}client tried to update ${number} which is too small(<10000)${colors.Reset}`);
				misc.sendEmail("invalidNumber", {
					"[IpFull]": client.connection.remoteAddress,
					"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
					"[number]": number,
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				}, function () {
					client.connection.end();
					cb();
				});
			} else {
				misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number = ?;`,[number])
				.then(function (result_a:ITelexCom.peerList) {
					let results = [];
					if (result_a) {
						for (let r of result_a) {
							if (r.type != 0) {
								results.push(r);
							}
						}
					}
					if (results.length == 1) {
						var res = results[0];
						if (res.type == 5) {
							if (res.pin == pin) {
								if (ipaddress != res.ipaddress || port != res.port) {
									misc.SqlQuery(pool,
										`UPDATE teilnehmer SET
										port = ?,
										ipaddress = ?,
										changed = 1,
										timestamp = ?
										WHERE number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`,[
										port,
										ipaddress,
										Math.floor(Date.now()/1000),
										number,	
										config.DynIpUpdateNameDifference,
										res.name,
										config.DynIpUpdateNameDifference,
										res.port,
										res.pin,
									])
									.then(function (result_b) {
										misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number = ?;`, [number])
										.then(function (result_c:ITelexCom.peerList) {
											try {
												client.connection.write(ITelexCom.encPackage({
													packagetype: 2,
													data: {
														ipaddress: result_c[0].ipaddress
													}
												}), "binary", function () {
													if (typeof cb === "function") cb();
												});
											} catch (e) {
												if (cv(0)) ll(colors.FgRed, e, colors.Reset);
												if (typeof cb === "function") cb();
											}
										})
										.catch(err=>lle(err));
									})
									.catch(err=>lle(err));
								} else {
									if (cv(2)) ll(`${colors.FgYellow}not UPDATING, nothing to update${colors.Reset}`);
									client.connection.write(ITelexCom.encPackage({
										packagetype: 2,
										data: {
											ipaddress: res.ipaddress
										}
									}), "binary", function () {
										if (typeof cb === "function") cb();
									});
								}
							} else {
								if (cv(1)) ll(colors.FgRed + "wrong DynIp pin" + colors.Reset);
								client.connection.end();
								misc.sendEmail("wrongDynIpPin", {
									"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
									"[number]": res.number,
									"[name]": res.name,
									"[date]": new Date().toLocaleString(),
									"[timeZone]": getTimezone(new Date())
								}, cb);
							}
						} else {
							if (cv(1)) ll(colors.FgRed + "not DynIp type" + colors.Reset);
							client.connection.end();
							misc.sendEmail("wrongDynIpType", {
								"[type]": res.type,
								"[IpFull]": client.connection.remoteAddress,
								"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
								"[number]": res.number,
								"[name]": res.name,
								"[date]": new Date().toLocaleString(),
								"[timeZone]": getTimezone(new Date())
							}, cb);
						}
					} else if (results.length == 0) {
						let insertQuery:string =`
						INSERT INTO teilnehmer
							(
								name,
								timestamp,
								type,
								number,
								port,
								pin,
								hostname,
								extension,
								ipaddress,
								disabled,
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
								?,
								?,
								?
							);`;
						let insertOptions:any[] = [
							'?',
							Math.floor(Date.now()/1000),
							5,
							number,
							port,
							pin,
							"",
							"",
							client.connection.remoteAddress.replace(/^.*:/,''),
							1,
							1
						];
						let deleteQuery = `DELETE FROM teilnehmer WHERE number=?;`;
						let deleteOptions = [number];

						
						let query:string;
						let options:any[];
						
						let exists:boolean = result_a && (result_a.length > 0);
						if(exists){
							query = deleteQuery + insertQuery;
							options = deleteOptions.concat(insertOptions);
						}else{
							query = insertQuery;
							options = insertOptions;
						}
						
						misc.SqlQuery(pool, query, options)
						.then(function (result_b) {
							if (result_b) {
								misc.sendEmail("new", {
									"[IpFull]": client.connection.remoteAddress,
									"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
									"[number]": number,
									"[date]": new Date().toLocaleString(),
									"[timeZone]": getTimezone(new Date())
								}, cb);
								misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number = ?;`, [number])
								.then(function (result_c:ITelexCom.peerList) {
									if(result_c.length>0){
										try {
											client.connection.write(ITelexCom.encPackage({
												packagetype: 2,
												data: {
													ipaddress: result_c[0].ipaddress
												}
											}), "binary", function () {
												if (typeof cb === "function") cb();
											});
										} catch (e) {
											if (cv(0)) ll(colors.FgRed, e, colors.Reset);
											if (typeof cb === "function") cb();
										}
									}else{

									}
								})
								.catch(err=>lle(err));
							} else {
								lle(colors.FgRed + "could not create entry", colors.Reset);
								if (typeof cb === "function") cb();
							}
						})
						.catch(err=>lle(err));
					} else {
						console.error(colors.FgRed, res, colors.Reset);
						if (typeof cb === "function") cb();
					}
				})
				.catch(err=>lle(err));
			}
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[3][constants.states.STANDBY] = function (pkg:ITelexCom.Package_decoded_3, client:connections.client, pool, cb) {
	try {
		if (client) {
			if (pkg.data.version == 1) {
				var number = pkg.data.number;
				misc.SqlQuery(pool, `
					SELECT * FROM teilnehmer WHERE
						number = ?
						and
						type != 0
						and
						disabled != 1
					;`, [number])
					.then(function (result:ITelexCom.peerList) {
					if (cv(2)) ll(colors.FgCyan, result, colors.Reset);
					if ((result[0] != undefined) && (result != [])) {
						let data = result[0];
						data.pin = "0";
						client.connection.write(ITelexCom.encPackage({
							packagetype: 5,
							data
						}), function () {
							if (typeof cb === "function") cb();
						});
					} else {
						client.connection.write(ITelexCom.encPackage({packagetype: 4}), function () {
							if (typeof cb === "function") cb();
						});
					}
				})
				.catch(err=>lle(err));
			} else {
				if (cv(0)) ll(colors.FgRed, "unsupported package version, sending '0x04' package", colors.Reset);
				client.connection.write(ITelexCom.encPackage({packagetype: 4}), function () {
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
handles[5][constants.states.FULLQUERY] = function (pkg:ITelexCom.Package_decoded_5, client:connections.client, pool, cb) {
	try {
		if (client) {
			if (cv(2)) ll(colors.FgGreen + "got dataset for:", colors.FgCyan, pkg.data.number, colors.Reset);
			misc.SqlQuery(pool, `SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
			.then(function (entries:ITelexCom.peerList) {
				let names = [
					"number",
					"name",
					"type",
					"hostname",
					"ipaddress",
					"port",
					"extension",
					"pin",
					"disabled",
					"timestamp",
				];
				names = names.filter(name=>pkg.data[name] !== undefined);
				let values = names.map(name=>pkg.data[name]);
				if (entries.length == 1) {
                    var entry:ITelexCom.peer = entries[0];
                    if(typeof client.newEntries != "number") client.newEntries = 0;
					if (pkg.data.timestamp > +entry.timestamp) {
                        client.newEntries++;
                        if (cv(1) && !cv(2)) ll(colors.FgGreen + "got new dataset for:", colors.FgCyan, pkg.data.number, colors.Reset);
						if (cv(2)) ll(colors.FgGreen + "recieved entry is " + colors.FgCyan + (pkg.data.timestamp-+entry.timestamp)+"seconds newer"+ colors.FgGreen + " > " + colors.FgCyan + entry.timestamp + colors.Reset);
						

						misc.SqlQuery(pool, `UPDATE teilnehmer SET ${names.map(name=>name+" = ?,").join("")} changed = ? WHERE number = ?;`,
						values.concat(
							[
								config.setChangedOnNewerEntry ? 1 : 0,
								pkg.data.number
							]
						))
						.then( function (res2) {
							client.connection.write(ITelexCom.encPackage({packagetype: 8}), function () {
								if (typeof cb === "function") cb();
							});
						})
						.catch(err=>lle(err));
					} else {
						if (cv(2)) ll(colors.FgYellow + "recieved entry is " + colors.FgCyan + (+entry.timestamp - pkg.data.timestamp) + colors.FgYellow + " seconds older and was ignored" + colors.Reset);
						client.connection.write(ITelexCom.encPackage({packagetype: 8}), function () {
							if (typeof cb === "function") cb();
						});
					}
				} else if (entries.length == 0) {
					misc.SqlQuery(pool, `
						INSERT INTO teilnehmer 
						(
							${names.join(",")}		
							${names.length>0?",":""}changed
						)
						VALUES
						(${"?,".repeat(names.length+1).slice(0,-1)})
					;`, values.concat(
						[
							config.setChangedOnNewerEntry ? 1 : 0
						]
					))
					.then(function (res2) {
						client.connection.write(ITelexCom.encPackage({packagetype: 8}), function () {
							if (typeof cb === "function") cb();
						});
					})
					.catch(err=>lle(err));
				} else {
					if (cv(0)) ll('The "number" field should be unique! This error should not occur!');
					if (typeof cb === "function") cb();
				}
			})
			.catch(err=>lle(err));
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[5][constants.states.LOGIN] = handles[5][constants.states.FULLQUERY];
handles[6][constants.states.STANDBY] = function (pkg:ITelexCom.Package_decoded_6, client:connections.client, pool, cb) {
	try {
		if (client) {
			if (pkg.data.serverpin == config.serverPin || (readonly && config.allowFullQueryInReadonly)) {
				if (cv(1)) ll(colors.FgGreen, "serverpin is correct!", colors.Reset);
				client = connections.get(
					connections.move(client.cnum, "S")
				);
				misc.SqlQuery(pool, "SELECT  * FROM teilnehmer;")
				.then(function (result:ITelexCom.peerList) {
					if ((result[0] != undefined) && (result != [])) {
						client.writebuffer = result;
						client.state = constants.states.RESPONDING;
						ITelexCom.handlePackage({packagetype: 8}, client, pool, cb);
					} else {
						client.connection.write(ITelexCom.encPackage({packagetype: 9}), function () {
							if (typeof cb === "function") cb();
						});
					}
				})
				.catch(err=>lle(err));
			} else {
				if (cv(1)) {
					ll(colors.FgRed + "serverpin is incorrect! " + colors.FgCyan + pkg.data.serverpin + colors.FgRed + " != " + colors.FgCyan + config.serverPin + colors.FgRed + " ending client.connection!" + colors.Reset); //TODO: remove pin logging
					client.connection.end();
				}
				misc.sendEmail("wrongServerPin", {
					"[IpFull]": client.connection.remoteAddress,
					"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
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
handles[7][constants.states.STANDBY] = function (pkg:ITelexCom.Package_decoded_7, client:connections.client, pool, cb) {
	try {
		if (client) {
			if ((pkg.data.serverpin == config.serverPin) || (readonly && config.allowLoginInReadonly)) {
				if (cv(1)) ll(colors.FgGreen, "serverpin is correct!", colors.Reset);
				client = connections.get(
					connections.move(client.cnum, "S")
				);
				client.connection.write(ITelexCom.encPackage({packagetype: 8}), function () {
					client.state = constants.states.LOGIN;
					if (typeof cb === "function") cb();
				});
			} else {
				if (cv(1)) {
					ll(colors.FgRed + "serverpin is incorrect!" + colors.FgCyan + pkg.data.serverpin + colors.FgRed + " != " + colors.FgCyan + config.serverPin + colors.FgRed + "ending client.connection!" + colors.Reset);
					client.connection.end();
				}
				misc.sendEmail("wrongServerPin", {
					"[IpFull]": client.connection.remoteAddress,
					"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
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
handles[8][constants.states.RESPONDING] = function (pkg:ITelexCom.Package_decoded_8, client:connections.client, pool, cb) {
	try {
		if (client) {
			if (cv(1)) {
				var toSend = [];
				for (let o of client.writebuffer) {
					toSend.push(o.number);
				}
				ll(colors.FgGreen + "entrys to transmit:" + colors.FgCyan + (cv(2) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors.Reset);
			}
			if (client.writebuffer.length > 0) {
				client.connection.write(ITelexCom.encPackage({
					packagetype: 5,
					data: client.writebuffer[0]
				}), function () {
					if (cv(1)) ll(colors.FgGreen + "sent dataset for:", colors.FgCyan, client.writebuffer[0].number, colors.Reset);
					client.writebuffer = client.writebuffer.slice(1);
					if (typeof cb === "function") cb();
				});
			} else if (client.writebuffer.length == 0) {
				client.connection.write(ITelexCom.encPackage({packagetype: 9}), function () {
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
handles[9][constants.states.FULLQUERY] = function (pkg:ITelexCom.Package_decoded_9, client:connections.client, pool, cb) {
	try {
		if (client) {
			client.state = constants.states.STANDBY;
			if (typeof client.cb === "function") client.cb();
			if (typeof cb === "function") cb();
			client.connection.end();
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};
handles[9][constants.states.LOGIN] = handles[9][constants.states.FULLQUERY];
handles[10][constants.states.STANDBY] = function (pkg:ITelexCom.Package_decoded_10, client:connections.client, pool, cb) {
	try {
		if (client) {
			if (cv(2)) ll(pkg);
//			let version = pkg.data.version;
			let query = pkg.data.pattern;
			let queryarr = query.split(" ");
			let searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ?".repeat(queryarr.length)};`;
			misc.SqlQuery(pool, searchstring, queryarr.map(q=>`%${q}%`))
			.then(function (result:ITelexCom.peerList) {
				if ((result[0] != undefined) && (result != [])) {
					var towrite = [];
					for (let o of result) {
						if (o.disabled != 1 && o.type != 0) {
							o.pin = "0";
							towrite.push(o);
						}
					}
					client.writebuffer = towrite;
					client.state = constants.states.RESPONDING;
					ITelexCom.handlePackage({packagetype: 8}, client, pool, cb);
				} else {
					client.connection.write(ITelexCom.encPackage({packagetype: 9}), function () {
						if (typeof cb === "function") cb();
					});
				}
			})
			.catch(err=>lle(err));
		} else {
			if (typeof cb === "function") cb();
		}
	} catch (e) {
		if (cv(2)) lle(colors.FgRed, e, colors.Reset);
		if (typeof cb === "function") cb();
	}
};

export default handles;
