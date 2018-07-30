"use strict";
//#region imports
import * as ip from "ip";
import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import {client, sendEmail, getTimezone, inspect} from '../SHARED/misc.js';
import {SqlQuery} from '../SHARED/misc.js';
// import { lookup } from "dns";

//#endregion
const logger = global.logger;
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
for (let i = 1; i <= 10; i++) handles[i] = {};
handles[255] = {};
//handes[type][state of this client.connection]
//handles[2][constants.states.STANDBY] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
//handles[4][WAITING] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
handles[1][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_1, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();
	

	var {
		number,
		pin,
		port
	} = pkg.data;
	var ipaddress = client.ipAddress;
	if (number < 10000) {
		logger.warn(inspect`client  tried to update ${number} which is too small(<10000)`);
		return void sendEmail("invalidNumber", {
				"Ip": ipaddress,
				"number": number.toString(),
				"date": new Date().toLocaleString(),
				"timeZone": getTimezone(new Date())
			})
			.then(() => {
				client.connection.end();
				resolve();
			})
			.catch(err=>{logger.error(inspect`${err}`)});
	}
	SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number])
		.then((entries: ITelexCom.peerList) => {
			if (!entries) return void resolve();

			let [entry] = entries.filter(x => x.type != 0);
			if (entry) {
				if (entry.type != 5) {
					logger.info(inspect`not DynIp type`);
					client.connection.end();
					return void sendEmail("wrongDynIpType", {
							"type": entry.type.toString(),
							"Ip": ipaddress,
							"number": entry.number.toString(),
							"name": entry.name,
							"date": new Date().toLocaleString(),
							"timeZone": getTimezone(new Date())
						})
						.then(resolve)
						.catch(err=>{logger.error(inspect`${err}`)});
				}
				if (entry.pin != pin) {
					logger.info(inspect`wrong DynIp pin`);
					client.connection.end();
					return void sendEmail("wrongDynIpPin", {
							"Ip": ipaddress,
							"number": entry.number.toString(),
							"name": entry.name,
							"date": new Date().toLocaleString(),
							"timeZone": getTimezone(new Date())
						})
						.then(resolve)
						.catch(err=>{logger.error(inspect`${err}`)});
				}
				if (ipaddress == entry.ipaddress && port == entry.port) {
					logger.verbose(inspect`not UPDATING, nothing to update`);
					return void client.connection.write(ITelexCom.encPackage({
						type: 2,
						data: {
							ipaddress
						}
					}), () => resolve());
				}
				SqlQuery(`UPDATE teilnehmer SET 
			port = ?, ipaddress = ?, changed = 1, timestamp = ? WHERE
			number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`, [
						port, ipaddress, Math.floor(Date.now() / 1000), number,
						config.DynIpUpdateNameDifference, entry.name, config.DynIpUpdateNameDifference, entry.port, entry.pin
					])
					// .then(()=>SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number]))
					// .then((result_c:ITelexCom.peerList)=>{
					// 	ipaddress = result_c[0].ipaddress;
					// 	client.connection.write(ITelexCom.encPackage({type: 2, data: {ipaddress}}), ()=>resolve());
					// })
					.then(() => {
						client.connection.write(ITelexCom.encPackage({
							type: 2,
							data: {
								ipaddress
							}
						}), () => resolve());
					})
					.catch(err=>{logger.error(inspect`${err}`)});
			} else {
				SqlQuery(`DELETE FROM teilnehmer WHERE number=?;`, [number])
					.then(() => SqlQuery(
						`INSERT INTO teilnehmer(name, timestamp, type, number, port, pin, hostname, extension, ipaddress, disabled, changed)
			VALUES (${"?, ".repeat(11).slice(0, -2)});`, ['?', Math.floor(Date.now() / 1000), 5, number, port, pin, "", "", ipaddress, 1, 1]
					))
					.then(function (result) {
						if (!(result && result.affectedRows)) {
							logger.error(inspect`could not create entry`);
							return void resolve();
						}
						sendEmail("new", {
								"Ip": ipaddress,
								"number": number.toString(),
								"date": new Date().toLocaleString(),
								"timeZone": getTimezone(new Date())
							})
							.catch(err=>{logger.error(inspect`${err}`)});

						client.connection.write(ITelexCom.encPackage({
							type: 2,
							data: {
								ipaddress
							}
						}), () => resolve());
					})
					.catch(err=>{logger.error(inspect`${err}`)});
			}
		})
		.catch(err=>{logger.error(inspect`${err}`)});
});
handles[3][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_3, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	if (pkg.data.version != 1) {
		logger.warn(inspect`unsupported package version, sending '0x04' package`);
		return void client.connection.write(ITelexCom.encPackage({
			type: 4
		}), () => resolve());
	}

	SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0 AND disabled != 1;`, [pkg.data.number])
		.then(function (result: ITelexCom.peerList) {
			logger.verbose(inspect`${result}`);
			if (result && result.length == 1) {
				let [data] = result;
				data.pin = "0";
				client.connection.write(ITelexCom.encPackage({
					type: 5,
					data
				}), () => resolve());
			} else {
				client.connection.write(ITelexCom.encPackage({
					type: 4
				}), () => resolve());
			}
		})
		.catch(err=>{logger.error(inspect`${err}`)});
});
handles[5][constants.states.FULLQUERY] =
handles[5][constants.states.LOGIN] = (pkg: ITelexCom.Package_decoded_5, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	var names = ["number", "name", "type", "hostname", "ipaddress", "port", "extension", "pin", "disabled", "timestamp"];
	names = names.filter(name => pkg.data[name] !== undefined);
	var values = names.map(name => pkg.data[name]);

	logger.verbose(inspect`got dataset for: ${pkg.data.number}`);
	SqlQuery(`SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
		.then((entries: ITelexCom.peerList) => {
			if (!entries) return void resolve();

			var [entry] = entries;
			if (entry) {
				if (typeof client.newEntries != "number") client.newEntries = 0;
				if (pkg.data.timestamp <= entry.timestamp) {
					logger.verbose(inspect`recieved entry is ${+entry.timestamp - pkg.data.timestamp} seconds older and was ignored`);
					return void client.connection.write(ITelexCom.encPackage({
						type: 8
					}), () => resolve());
				}

				client.newEntries++;
				logger.info(inspect`got new dataset for: ${pkg.data.number}`);
				logger.verbose(inspect`recieved entry is ${+pkg.data.timestamp - entry.timestamp} seconds newer  > ${entry.timestamp}`);


				SqlQuery(`UPDATE teilnehmer SET ${names.map(name=>name+" = ?,").join("")} changed = ? WHERE number = ?;`,
						values.concat([config.setChangedOnNewerEntry ? 1 : 0, pkg.data.number]))
					.then(() => client.connection.write(ITelexCom.encPackage({
						type: 8
					}), () => resolve()))
					.catch(err=>{logger.error(inspect`${err}`)});
			} else if(pkg.data.type == 0) {
				logger.info(inspect`not inserting delted entry: ${pkg.data}`)
			}else{
				SqlQuery(`
			INSERT INTO teilnehmer (
				${names.join(",")+(names.length>0?",":"")} changed
			) VALUES(
			${"?,".repeat(names.length+1).slice(0,-1)});`,
						values.concat([
							config.setChangedOnNewerEntry ? 1 : 0
						])
					)
					.then(() => client.connection.write(ITelexCom.encPackage({
						type: 8
					}), () => resolve()))
					.catch(err=>{logger.error(inspect`${err}`)});
			}
		})
		.catch(err=>{logger.error(inspect`${err}`)});
});
handles[6][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_6, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	if (pkg.data.serverpin != config.serverPin && !(readonly && config.allowFullQueryInReadonly)) {
		logger.info(inspect`serverpin is incorrect! ${pkg.data.serverpin} != ${config.serverPin} ending client connection!`); //TODO: remove pin logging
		client.connection.end();
		return void sendEmail("wrongServerPin", {
				"Ip": client.ipAddress,
				"date": new Date().toLocaleString(),
				"timeZone": getTimezone(new Date())
			})
			.then(() => resolve())
			.catch(err=>{logger.error(inspect`${err}`)});
	}

	logger.info(inspect`serverpin is correct!`);

	SqlQuery("SELECT  * FROM teilnehmer;")
		.then((result: ITelexCom.peerList) => {
			if (!result || result.length === 0) return void client.connection.write(ITelexCom.encPackage({
				type: 9
			}), () => resolve());

			client.writebuffer = result;
			client.state = constants.states.RESPONDING;
			return ITelexCom.handlePackage({
				type: 8
			}, client)
		})
		.then(() => resolve())
		.catch(err=>{logger.error(inspect`${err}`)});
});
handles[7][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_7, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	if (pkg.data.serverpin != config.serverPin && !(readonly && config.allowLoginInReadonly)) {
		logger.info(inspect`serverpin is incorrect! ${pkg.data.serverpin} != ${config.serverPin} ending client.connection!`);
		client.connection.end();
		return void sendEmail("wrongServerPin", {
				"Ip": client.ipAddress,
				"date": new Date().toLocaleString(),
				"timeZone": getTimezone(new Date())
			})
			.then(() => resolve())
			.catch(err=>{logger.error(inspect`${err}`)});
	}
	logger.info(inspect`serverpin is correct!`);

	client.state = constants.states.LOGIN;
	client.connection.write(ITelexCom.encPackage({
		type: 8
	}), () => resolve());
});
handles[8][constants.states.RESPONDING] = (pkg: ITelexCom.Package_decoded_8, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();


	logger.info(inspect`entrys to transmit: ${client.writebuffer.length}`);

	if (client.writebuffer.length === 0) {
		client.state = constants.states.STANDBY;
		return void client.connection.write(ITelexCom.encPackage({
			type: 9
		}), () => resolve());
	}
	let data = client.writebuffer.shift();
	logger.info(inspect`sent dataset for ${data.name} (${data.number})`);
	client.connection.write(ITelexCom.encPackage({
		type: 5,
		data
	}), () => resolve());
});
handles[9][constants.states.FULLQUERY] =
handles[9][constants.states.LOGIN] = (pkg: ITelexCom.Package_decoded_9, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	client.state = constants.states.STANDBY;
	if (typeof client.cb === "function") client.cb();
	client.connection.end();
	resolve();
});
handles[10][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_10, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	var {
		pattern,
		version
	} = pkg.data;
	var searchWords = pattern.split(" ");
	searchWords = searchWords.map(q => `%${q}%`);
	var searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ?".repeat(searchWords.length)};`;
	SqlQuery(searchstring, searchWords)
		.then(function (result: ITelexCom.peerList) {
			if (!result || result.length == 0) return void client.connection.write(ITelexCom.encPackage({
				type: 9
			}), () => resolve());

			client.state = constants.states.RESPONDING;
			client.writebuffer = result
				.filter(x => x.disabled != 1 && x.type != 0)
				.map(x => {
					x.pin = "0";
					return x
				});

			return ITelexCom.handlePackage({
				type: 8
			}, client)
		})
		.then(() => resolve())
		.catch(err=>{logger.error(inspect`${err}`)});
});

handles[255][constants.states.RESPONDING] = 
handles[255][constants.states.FULLQUERY] =
handles[255][constants.states.STANDBY] =
handles[255][constants.states.LOGIN] =
(pkg: ITelexCom.Package_decoded_10, client: client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	logger.error(inspect`server sent error message: ${pkg}`);
});
export default handles;