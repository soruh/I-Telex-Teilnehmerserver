"use strict";
function getTimezone(date) { //TODO: figure out way to not hav this in all files where it is used
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
	return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}

//#region imports
import * as util from 'util';
import * as ip from "ip";
import config from '../COMMONMODULES/config.js';
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import colors from "../COMMONMODULES/colors.js";
import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import * as constants from "../BINARYSERVER/constants.js";
import { client, sendEmail } from './misc.js';
import { SqlQuery } from './misc.js';

//#endregion

const readonly = (config.serverPin == null);
const cv = config.cv;


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
//handes[type][state of this client.connection]
//handles[2][constants.states.STANDBY] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
//handles[4][WAITING] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
handles[1][constants.states.STANDBY] = (pkg:ITelexCom.Package_decoded_1, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();

	var {number, pin, port} = pkg.data;
	var ipaddress = client.connection.remoteAddress.replace(/^.*:/, '');
	if (number < 10000) {
		if (cv(1)) lle(`${colors.FgRed}client ${colors.FgCyan+client.name+colors.FgRed} tried to update ${number} which is too small(<10000)${colors.Reset}`);
		return void sendEmail("invalidNumber", {
			"[IpFull]": client.connection.remoteAddress,
			"[Ip]": ipaddress,
			"[number]": number,
			"[date]": new Date().toLocaleString(),
			"[timeZone]": getTimezone(new Date())
		})
		.then(()=>{
			client.connection.end();
			resolve();
		})
		.catch(lle);
	}
	SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`,[number])
	.then((entries:ITelexCom.peerList)=>{
		if(!entries) return void resolve();
		
		let [entry] = entries.filter(x=>x.type != 0);
		if (entry) {
			if (entry.type != 5){
				if (cv(1)) ll(colors.FgRed + "not DynIp type" + colors.Reset);
				client.connection.end();
				return void sendEmail("wrongDynIpType", {
					"[type]": entry.type,
					"[IpFull]": client.connection.remoteAddress,
					"[Ip]": ipaddress,
					"[number]": entry.number,
					"[name]": entry.name,
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				})
				.then(resolve)
				.catch(lle);
			}
			if (entry.pin != pin){
				if (cv(1)) ll(colors.FgRed + "wrong DynIp pin" + colors.Reset);
				client.connection.end();
				return void sendEmail("wrongDynIpPin", {
					"[Ip]": ipaddress,
					"[number]": entry.number,
					"[name]": entry.name,
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				})
				.then(resolve)
				.catch(lle);
			}
			if (ipaddress == entry.ipaddress && port == entry.port) {
				if (cv(2)) ll(`${colors.FgYellow}not UPDATING, nothing to update${colors.Reset}`);
				return void client.connection.write(ITelexCom.encPackage({type: 2, data: {ipaddress}}), ()=>resolve());
			}
			SqlQuery(`UPDATE teilnehmer SET 
				port = ?, ipaddress = ?, changed = 1, timestamp = ? WHERE
				number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`, [
				port, ipaddress, Math.floor(Date.now()/1000), number,
				config.DynIpUpdateNameDifference, entry.name, config.DynIpUpdateNameDifference, entry.port, entry.pin]
			)
			// .then(()=>SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number]))
			// .then((result_c:ITelexCom.peerList)=>{
			// 	ipaddress = result_c[0].ipaddress;
			// 	client.connection.write(ITelexCom.encPackage({type: 2, data: {ipaddress}}), ()=>resolve());
			// })
			.then(()=>{
				client.connection.write(ITelexCom.encPackage({type: 2, data: {ipaddress}}), ()=>resolve());
			})
			.catch(lle);
		} else {
			SqlQuery(`DELETE FROM teilnehmer WHERE number=?;`, [number])
			.then(()=>SqlQuery(
				`INSERT INTO teilnehmer(name, timestamp, type, number, port, pin, hostname, extension, ipaddress, disabled, changed)
				VALUES (${"?, ".repeat(11)});`,
				['?', Math.floor(Date.now()/1000), 5, number, port, pin, "", "", ipaddress, 1, 1]
			))
			.then(function (result) {
				if (!(result&&result.affectedRows)) {
					lle(colors.FgRed + "could not create entry", colors.Reset);
					return void resolve();
				}
				sendEmail("new", {
					"[IpFull]": client.connection.remoteAddress,
					"[Ip]": ipaddress,
					"[number]": number,
					"[date]": new Date().toLocaleString(),
					"[timeZone]": getTimezone(new Date())
				})
				.catch(lle);
				
				client.connection.write(ITelexCom.encPackage({type: 2, data: {ipaddress}}), ()=>resolve());
			})
			.catch(lle);
		}
	})
	.catch(lle);
});
handles[3][constants.states.STANDBY] = (pkg:ITelexCom.Package_decoded_3, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();
	
	if (pkg.data.version != 1) {
		if (cv(0)) ll(colors.FgRed+"unsupported package version, sending '0x04' package"+colors.Reset);
		return void client.connection.write(ITelexCom.encPackage({type: 4}), ()=>resolve());
	}

	SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0 AND disabled != 1;`,[pkg.data.number])
		.then(function (result:ITelexCom.peerList) {
		if (cv(2)) ll(colors.FgCyan, result, colors.Reset);
		if (result&&result.length==1) {
			let [data] = result;
			data.pin = "0";
			client.connection.write(ITelexCom.encPackage({type: 5, data}), ()=>resolve());
		} else {
			client.connection.write(ITelexCom.encPackage({type: 4}), ()=>resolve());
		}
	})
	.catch(lle);
});
handles[5][constants.states.FULLQUERY] =
handles[5][constants.states.LOGIN] = (pkg:ITelexCom.Package_decoded_5, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();
	
	var names = ["number", "name", "type", "hostname", "ipaddress", "port", "extension", "pin", "disabled", "timestamp"];
	names = names.filter(name=>pkg.data[name] !== undefined);
	var values = names.map(name=>pkg.data[name]);

	if (cv(2)) ll(colors.FgGreen+"got dataset for:"+colors.FgCyan+pkg.data.number+colors.Reset);
	SqlQuery(`SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
	.then((entries:ITelexCom.peerList)=>{
		if(!entries) return void resolve();

		var [entry] = entries;
		if (entry) {
			if(typeof client.newEntries != "number") client.newEntries = 0;
			if (pkg.data.timestamp <= entry.timestamp) {
				if (cv(2)) ll(colors.FgYellow + "recieved entry is " + colors.FgCyan + (+entry.timestamp - pkg.data.timestamp) + colors.FgYellow + " seconds older and was ignored" + colors.Reset);
				return void client.connection.write(ITelexCom.encPackage({type: 8}), ()=>resolve());
			}

			client.newEntries++;
			if (cv(1) && !cv(2)) ll(colors.FgGreen + "got new dataset for:"+colors.FgCyan+ pkg.data.number+ colors.Reset);
			if (cv(2)) ll(colors.FgGreen + "recieved entry is " + colors.FgCyan + (pkg.data.timestamp-entry.timestamp)+"seconds newer"+ colors.FgGreen + " > " + colors.FgCyan + entry.timestamp + colors.Reset);
			

			SqlQuery(`UPDATE teilnehmer SET ${names.map(name=>name+" = ?,").join("")} changed = ? WHERE number = ?;`,
			values.concat([config.setChangedOnNewerEntry ? 1 : 0, pkg.data.number]))
			.then(()=>client.connection.write(ITelexCom.encPackage({type: 8}), ()=>resolve()))
			.catch(lle);
		} else {
			SqlQuery(`
				INSERT INTO teilnehmer (
					${names.join(",")+(names.length>0?",":"")} changed
				) VALUES(
				${"?,".repeat(names.length+1).slice(0,-1)});`,
				values.concat([
					config.setChangedOnNewerEntry ? 1 : 0
				])
			)
			.then(()=>client.connection.write(ITelexCom.encPackage({type: 8}), ()=>resolve()))
			.catch(lle);
		}
	})
	.catch(lle);
});
handles[6][constants.states.STANDBY] = (pkg:ITelexCom.Package_decoded_6, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();
	
	if (pkg.data.serverpin != config.serverPin && !(readonly && config.allowFullQueryInReadonly)) {
		if (cv(1)) {
			ll(colors.FgRed + "serverpin is incorrect! " + colors.FgCyan + pkg.data.serverpin + colors.FgRed + " != " + colors.FgCyan + config.serverPin + colors.FgRed + " ending client.connection!" + colors.Reset); //TODO: remove pin logging
			client.connection.end();
		}
		return void sendEmail("wrongServerPin", {
			"[IpFull]": client.connection.remoteAddress,
			"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
			"[date]": new Date().toLocaleString(),
			"[timeZone]": getTimezone(new Date())
		})
		.then(()=>resolve())
		.catch(lle);
	}
	
	if (cv(1)) ll(colors.FgGreen, "serverpin is correct!", colors.Reset);

	SqlQuery("SELECT  * FROM teilnehmer;")
	.then((result:ITelexCom.peerList)=>{
		if (!result||result.length===0) return void client.connection.write(ITelexCom.encPackage({type: 9}), ()=>resolve());

		client.writebuffer = result;
		client.state = constants.states.RESPONDING;
		return ITelexCom.handlePackage({type: 8}, client)
	})
	.then(()=>resolve())
	.catch(lle);
});
handles[7][constants.states.STANDBY] = (pkg:ITelexCom.Package_decoded_7, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();

	if (pkg.data.serverpin != config.serverPin && !(readonly && config.allowLoginInReadonly)) {
		if (cv(1)) {
			ll(colors.FgRed + "serverpin is incorrect!" + colors.FgCyan + pkg.data.serverpin + colors.FgRed + " != " + colors.FgCyan + config.serverPin + colors.FgRed + "ending client.connection!" + colors.Reset);
			client.connection.end();
		}
		return void sendEmail("wrongServerPin", {
			"[IpFull]": client.connection.remoteAddress,
			"[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
			"[date]": new Date().toLocaleString(),
			"[timeZone]": getTimezone(new Date())
		})
		.then(()=>resolve())
		.catch(lle);
	}
	if (cv(1)) ll(colors.FgGreen, "serverpin is correct!", colors.Reset);
	
	client.state = constants.states.LOGIN;
	client.connection.write(ITelexCom.encPackage({type: 8}), ()=>resolve());
});
handles[8][constants.states.RESPONDING] = (pkg:ITelexCom.Package_decoded_8, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();

	if (cv(2)) {
		let toSend = [];
		for (let o of client.writebuffer) {
			toSend.push(o.number);
		}
		ll(colors.FgGreen + "entrys to transmit:" + colors.FgCyan + (cv(3) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors.Reset);
	}
	if (client.writebuffer.length === 0) {
		client.state = constants.states.STANDBY;
		return void client.connection.write(ITelexCom.encPackage({type: 9}), ()=>resolve());
	}
	let data = client.writebuffer.shift();
	if (cv(1)) ll(`${colors.FgGreen}sent dataset for ${colors.FgCyan}${data.name} (${data.number})${colors.Reset}`);
	client.connection.write(ITelexCom.encPackage({type: 5, data}), ()=>resolve());
});
handles[9][constants.states.FULLQUERY] =
handles[9][constants.states.LOGIN] = (pkg:ITelexCom.Package_decoded_9, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();

	client.state = constants.states.STANDBY;
	if (typeof client.cb === "function") client.cb();
	client.connection.end();
	resolve();
});
handles[10][constants.states.STANDBY] = (pkg:ITelexCom.Package_decoded_10, client:client)=>
new Promise((resolve, reject)=>{
	if (!client) return void resolve();

	var {pattern, version} = pkg.data;
	var searchWords = pattern.split(" ");
	searchWords = searchWords.map(q=>`%${q}%`);
	var searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ?".repeat(searchWords.length)};`;
	SqlQuery(searchstring, searchWords)
	.then(function (result:ITelexCom.peerList) {
		if (!result||result.length == 0) return void client.connection.write(ITelexCom.encPackage({type: 9}), ()=>resolve());

		client.state = constants.states.RESPONDING;
		client.writebuffer = result
			.filter(x=>x.disabled != 1 && x.type != 0)
			.map(x=>{x.pin = "0";return x});

		return ITelexCom.handlePackage({type: 8}, client)
	})
	.then(()=>resolve())
	.catch(lle);
});
export default handles;
