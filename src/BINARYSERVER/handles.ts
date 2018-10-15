"use strict";
//#region imports
import config from '../SHARED/config.js';
// import colors from "../SHARED/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import {Client, sendEmail, getTimezone, inspect, symbolName, getTimestamp} from '../SHARED/misc.js';
import {SqlQuery} from '../SHARED/misc.js';
import sendQueue from "./sendQueue.js";
// import { lookup } from "dns";

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

let handles = {}; // functions for handeling packages
for (let i = 1; i <= 10; i++) handles[i] = {};
handles[255] = {};
// handes[type][state of this client.connection]
// handles[2][constants.states.STANDBY] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
// handles[4][WAITING] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
handles[1][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_1, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();
	
	const {number, pin, port} = pkg.data;

	if(client.ipFamily  === 6){
		logger.log('warning', inspect`client ${client.name} tried to update ${number} with an ipv6 address`);
		client.connection.end();

		return void sendEmail("ipV6DynIpUpdate", {
			Ip: client.ipAddress,
			number: number.toString(),
			date: getTimestamp(),
			timeZone: getTimezone(new Date()),
		})
		.then(resolve)
		.catch(err=>{logger.log('error', inspect`${err}`);}); 
	}

	if (number < 10000) {
		logger.log('warning', inspect`client ${client.name} tried to update ${number} which is too small(<10000)`);
		return void sendEmail("invalidNumber", {
			Ip: client.ipAddress,
			number: number.toString(),
			date: getTimestamp(),
			timeZone: getTimezone(new Date()),
		})
		.then(() => {
			client.connection.end();
			resolve();
		})
		.catch(err=>{logger.log('error', inspect`${err}`);});
	}
	SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0;`, [number])
	.then((entries: ITelexCom.peerList) => {
		if (!entries) return void resolve();
		let [entry] = entries;
		if (entry) {
			if (entry.type !== 5) {
				logger.log('warning', inspect`client ${client.name} tried to update ${number} which is not of DynIp type`);
				client.connection.end();
				return void sendEmail("wrongDynIpType", {
					type: entry.type.toString(),
					Ip: client.ipAddress,
					number: entry.number.toString(),
					name: entry.name,
					date: getTimestamp(),
					timeZone: getTimezone(new Date()),
				})
				.then(resolve)
				.catch(err=>{logger.log('error', inspect`${err}`);}); 
			}
			if (entry.pin !== pin) {
				logger.log('warning', inspect`client ${client.name} tried to update ${number} with an invalid pin`);
				client.connection.end();
				return void sendEmail("wrongDynIpPin", {
					Ip: client.ipAddress,
					number: entry.number.toString(),
					name: entry.name,
					date: getTimestamp(),
					timeZone: getTimezone(new Date()),
				})
				.then(resolve)
				.catch(err=>{logger.log('error', inspect`${err}`);}); 
			}
			if (client.ipAddress === entry.ipaddress && port === entry.port) {
				logger.log('debug', inspect`not UPDATING, nothing to update`);
				return void client.sendPackage({
					type: 2,
					data: {
						ipaddress: client.ipAddress,
					},
				}, () => resolve());
			}
			SqlQuery(`UPDATE teilnehmer SET port = ?, ipaddress = ?, changed = 1, timestamp = ? WHERE number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`, [
				port, client.ipAddress, Math.floor(Date.now() / 1000), number,
				config.DynIpUpdateNameDifference, entry.name, config.DynIpUpdateNameDifference, entry.port, entry.pin,
			])
			// .then(()=>SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number]))
			// .then((result_c:ITelexCom.peerList)=>{
			// 	ipaddress = result_c[0].ipaddress;
			// 	client.sendPackage({type: 2, data: {ipaddress}}, ()=>resolve());
			// })
			.then(() => {
				client.sendPackage({
					type: 2,
					data: {
						ipaddress: client.ipAddress,
					},
				}, () => {
					sendQueue()
					.then(()=>resolve())
					.catch((err)=>reject(err));
				});
			})
			.catch(err=>{logger.log('error', inspect`${err}`);}); 
		} else {
			SqlQuery(`DELETE FROM teilnehmer WHERE number=?;`, [number])
			.then(() => SqlQuery(
				`INSERT INTO teilnehmer(name, timestamp, type, number, port, pin, hostname, extension, ipaddress, disabled, changed) VALUES (${"?, ".repeat(11).slice(0, -2)});`, ['?', Math.floor(Date.now() / 1000), 5, number, port, pin, "", "", client.ipAddress, 1, 1]
			))
			.then(function(result) {
				if (!(result && result.affectedRows)) {
					logger.log('error', inspect`could not create entry`);
					return void resolve();
				}
				sendEmail("new", {
					Ip: client.ipAddress,
					number: number.toString(),
					date: getTimestamp(),
					timeZone: getTimezone(new Date()),
				})
				.catch(err=>{logger.log('error', inspect`${err}`);}); 

				client.sendPackage({
					type: 2,
					data: {
						ipaddress: client.ipAddress,
					},
				}, () => resolve());
			})
			.catch(err=>{logger.log('error', inspect`${err}`);}); 
		}
	})
	.catch(err=>{logger.log('error', inspect`${err}`);}); 
});
handles[3][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_3, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	if (pkg.data.version !== 1) {
		logger.log('warning', inspect`client ${client.name} sent a package with version ${pkg.data.version} which is not supported by this server`);
		return void client.sendPackage({type: 4}, () => resolve());
	}

	SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0 AND disabled != 1;`, [pkg.data.number])
		.then(function(result: ITelexCom.peerList) {
			if (result && result.length === 1) {
				let [data] = result;
				data.pin = "0";
				client.sendPackage({
					type: 5,
					data,
				}, () => resolve());
			} else {
				client.sendPackage({
					type: 4,
				}, () => resolve());
			}
		})
		.catch(err=>{logger.log('error', inspect`${err}`);}); 
});
handles[5][constants.states.FULLQUERY] =
handles[5][constants.states.LOGIN] = (pkg: ITelexCom.Package_decoded_5, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	let names = ["number", "name", "type", "hostname", "ipaddress", "port", "extension", "pin", "disabled", "timestamp"];
	names = names.filter(name => pkg.data[name] !== undefined);
	const values = names.map(name => pkg.data[name]);

	logger.log('verbose network', inspect`got dataset for: ${pkg.data.name} (${pkg.data.number}) by server ${client.name}`);
	SqlQuery(`SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
		.then((entries: ITelexCom.peerList) => {
			if (!entries) return void resolve();

			const [entry] = entries;
			if (entry) {
				if (typeof client.newEntries !== "number") client.newEntries = 0;
				if (pkg.data.timestamp <= entry.timestamp) {
					logger.log('debug', inspect`recieved entry is ${+entry.timestamp - pkg.data.timestamp} seconds older and was ignored`);
					return void client.sendPackage({
						type: 8,
					}, () => resolve());
				}

				client.newEntries++;
				logger.log('network', inspect`got new dataset for: ${pkg.data.name}`);
				logger.log('debug', inspect`recieved entry is ${+pkg.data.timestamp - entry.timestamp} seconds newer  > ${entry.timestamp}`);


				SqlQuery(`UPDATE teilnehmer SET ${names.map(name=>name+" = ?,").join("")} changed = ? WHERE number = ?;`,
						values.concat([config.setChangedOnNewerEntry ? 1 : 0, pkg.data.number]))
					.then(() => client.sendPackage({
						type: 8,
					}, () => resolve()))
					.catch(err=>{logger.log('error', inspect`${err}`);}); 
			} else if(pkg.data.type === 0) {
				logger.log('debug', inspect`not inserting deleted entry: ${pkg.data}`);
				client.sendPackage({
					type: 8,
				}, () => resolve());
			}else{
				SqlQuery(`INSERT INTO teilnehmer (${names.join(",")+(names.length>0?",":"")} changed) VALUES(${"?,".repeat(names.length+1).slice(0,-1)});`,
						values.concat([
							config.setChangedOnNewerEntry ? 1 : 0,
						])
					)
					.then(() => client.sendPackage({
						type: 8,
					}, () => resolve()))
					.catch(err=>{logger.log('error', inspect`${err}`);}); 
			}
		})
		.catch(err=>{logger.log('error', inspect`${err}`);}); 
});
handles[6][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_6, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	if (pkg.data.serverpin !== config.serverPin && !(readonly && config.allowFullQueryInReadonly)) {
		logger.log('warning', inspect`client ${client.name} tried to perform a FullQuery with an invalid serverpin`);
		client.connection.end();
		return void sendEmail("wrongServerPin", {
				Ip: client.ipAddress,
				date: getTimestamp(),
				timeZone: getTimezone(new Date()),
			})
			.then(() => resolve())
			.catch(err=>{logger.log('error', inspect`${err}`);}); 
	}

	logger.log('debug', inspect`serverpin is correct!`);

	SqlQuery("SELECT  * FROM teilnehmer;")
		.then((result: ITelexCom.peerList) => {
			if (!result) result = [];

			client.writebuffer = result;
			client.state = constants.states.RESPONDING;
			return handlePackage({
				type: 8,
			}, client);
		})
		.then(() => resolve())
		.catch(err=>{logger.log('error', inspect`${err}`);}); 
});
handles[7][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_7, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	if (pkg.data.serverpin !== config.serverPin && !(readonly && config.allowLoginInReadonly)) {
		logger.log('warning', inspect`client ${client.name} tried to perform a Login with an invalid serverpin`);
		client.connection.end();
		return void sendEmail("wrongServerPin", {
				Ip: client.ipAddress,
				date: getTimestamp(),
				timeZone: getTimezone(new Date()),
			})
			.then(() => resolve())
			.catch(err=>{logger.log('error', inspect`${err}`);}); 
	}
	logger.log('debug', inspect`serverpin is correct!`);

	client.state = constants.states.LOGIN;
	client.sendPackage({
		type: 8,
	}, () => resolve());
});
handles[8][constants.states.RESPONDING] = (pkg: ITelexCom.Package_decoded_8, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();


	logger.log('debug', inspect`entrys to transmit: ${client.writebuffer.length}`);

	if (client.writebuffer.length === 0) {
		logger.log('network', inspect`transmited all entries for: ${client.name}`);
		client.state = constants.states.STANDBY;
		return void client.sendPackage({
			type: 9,
		}, () => resolve());
	}
	let data = client.writebuffer.shift();
	logger.log('network', inspect`sent dataset for ${data.name} (${data.number})`);
	client.sendPackage({
		type: 5,
		data,
	}, () => resolve());
});
handles[9][constants.states.FULLQUERY] =
handles[9][constants.states.LOGIN] = (pkg: ITelexCom.Package_decoded_9, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	client.state = constants.states.STANDBY;
	if (typeof client.cb === "function") client.cb();
	client.connection.end();
	sendQueue()
	.then(()=>resolve())
	.catch((err)=>reject(err));
});
handles[10][constants.states.STANDBY] = (pkg: ITelexCom.Package_decoded_10, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	const {pattern, version} = pkg.data;

	if (pkg.data.version !== 1) {
		logger.log('warning', inspect`client ${client.name} sent a package with version ${pkg.data.version} which is not supported by this server`);
		client.writebuffer = [];

		return void handlePackage({type: 8}, client)
			.then(() => resolve())
			.catch(err=>{logger.log('error', inspect`${err}`);}); 
	}

	let searchWords = pattern.split(" ");
	searchWords = searchWords.map(q => `%${q}%`);
	const searchstring = `SELECT * FROM teilnehmer WHERE disabled != 1 AND type != 0${" AND name LIKE ?".repeat(searchWords.length)};`;
	SqlQuery(searchstring, searchWords)
		.then(function(result: ITelexCom.peerList) {
			if (!result) result = [];

			logger.log('network', inspect`found ${result.length} public entries matching pattern ${pattern}`);
			logger.log('debug', inspect`entries matching pattern ${pattern}:\n${result}`);

			client.state = constants.states.RESPONDING;
			client.writebuffer = result.map(peer=>{peer.pin="0";return peer;});

			return handlePackage({type: 8}, client);
		})
		.then(() => resolve())
		.catch(err=>{logger.log('error', inspect`${err}`);}); 
});

handles[255][constants.states.RESPONDING] = 
handles[255][constants.states.FULLQUERY] =
handles[255][constants.states.STANDBY] =
handles[255][constants.states.LOGIN] =
(pkg: ITelexCom.Package_decoded_10, client: Client) =>
new Promise((resolve, reject) => {
	if (!client) return void resolve();

	logger.log('error', inspect`server sent error message: ${pkg}`);
});

function handlePackage(obj: ITelexCom.Package_decoded, client: Client) {
	return new Promise((resolve, reject) => {
		if (!obj) {
			logger.log('warning', inspect`no package to handle`);
			resolve();
		} else {
			logger.log('debug', inspect`state: ${symbolName(client.state)}`);
			try {
				logger.log('network', inspect`handling package of type ${constants.PackageNames[obj.type]} (${obj.type}) for ${client.name} in state ${symbolName(client.state)}`);
				logger.log('verbose network', inspect`handling package: ${obj}`);

				if (typeof handles[obj.type][client.state] === "function") {
					try {
						handles[obj.type][client.state](obj, client)
							.then(resolve)
							.catch(reject);
					} catch (e) {
						logger.log('error', inspect`${e}`);
						resolve();
					}
				} else {
					logger.log('warning', inspect`client ${client.name} sent a package of type ${constants.PackageNames[obj.type]} (${obj.type}) which is not supported in state ${symbolName(client.state)}`);
					resolve();
				}
			} catch (e) {
				logger.log('error', inspect`${e}`);
				resolve();
			}
		}
	});
}
export {
	handlePackage
};
