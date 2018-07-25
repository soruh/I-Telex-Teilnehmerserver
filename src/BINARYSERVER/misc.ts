//#region imports
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import * as util from "util";
import * as mysql from "mysql";
import * as async from "async";
import * as ip from "ip";
import * as nodemailer from "nodemailer";
import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as connections from "../BINARYSERVER/connections.js"

import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import { lookup } from "dns";
import {MailOptions} from "nodemailer/lib/json-transport.js";
import {getTransporter} from "../BINARYSERVER/transporter.js";
import { getPool } from "./sqlPool.js";
//#endregion


function getTimezone(date) { //TODO: figure out way to not have this in all files where it is used
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
	return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}

var errorCounters:{
	[index:string]:number
} = {};
const cv = config.cv;

const mySqlConnectionOptions = config['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;

function increaseErrorCounter(serverkey:string, error:Error, code:string):void {
	let newError = {
		error: error,
		code: code,
		timeStamp: Date.now()
	};
	if (errorCounters.hasOwnProperty(serverkey)) {
		errorCounters[serverkey]++;
	} else {
		errorCounters[serverkey] = 1;
	}
	let warn:boolean = config.warnAtErrorCounts.indexOf(errorCounters[serverkey]) > -1;
	if (cv(1)) lle(`${colors.FgYellow}increased errorCounter for server ${colors.FgCyan}${serverkey}${colors.FgYellow} to ${warn?colors.FgRed:colors.FgCyan}${errorCounters[serverkey]}${colors.Reset}`);
	if (warn)
	sendEmail("ServerError", {
		"[server]": serverkey,
		"[errorCounter]": errorCounters[serverkey],
		"[lastError]": (<any>error).code,
		"[date]": new Date().toLocaleString(),
		"[timeZone]": getTimezone(new Date())
	},()=>{});
}

function resetErrorCounter(serverkey:string){
	delete errorCounters[serverkey];
	if (cv(2)) ll(colors.FgGreen + "reset error counter for: " + colors.FgCyan+serverkey+colors.Reset);
}

function SqlQuery(query:string, options?:any[]):Promise<any> { //TODO: Promise<any>-> real type
	return new Promise((resolve, reject)=>{
		if (cv(3)) llo(1, colors.BgLightCyan+colors.FgBlack+query+" "+(options||"")+colors.Reset);

		query = query.replace(/\n/g,"").replace(/\s+/g," ");
		query = mysql.format(query, options||[]);
		if (cv(2) || (cv(1)&&/(update)|(insert)/gi.test(query))) llo(1, colors.BgLightBlue + colors.FgBlack + query + colors.Reset);
		let sqlPool = getPool();
		if(sqlPool){
			sqlPool.query(query, function (err, res) {
				if(sqlPool["_allConnections"]&&sqlPool["_allConnections"].length){
					if(cv(3)) ll("number of open connections: " + sqlPool["_allConnections"].length);
				}else{
					if(cv(2)) ll("not a pool");
				}
				if (err) {
					if (cv(0)) llo(1, colors.FgRed, err, colors.Reset);
					reject(err);
				} else {
					resolve(res);
				}
			});
		}else{
			lle(`sql pool is not set!`);
		}
	});
	/*try{
		sqlPool.getConnection(function(e,c){
			if(e){
				if(cv(0)) lle(colors.FgRed,e,colors.Reset);
				c.release();
			}else{
				c.query(query,function(err,res){
					c.release();
					//lle(sqlPool);
					try{
						if (config.logITelexCom) ll("number of open connections: "+sqlPool._allConnections.length);
					}catch(e){
						//if (config.logITelexCom) ll("sqlPool threadId: "+sqlPool.threadId);
						console.trace(sqlPool.threadId);
					}
					if(err){
						if(cv(0)) lle(colors.FgRed,err,colors.Reset);
						if(typeof callback === "function") callback([]);
					}else{
						if(typeof callback === "function") callback(res);
					}
				});
			}
		});
	}catch(e){
		lle(sqlPool);
		throw(e);
	}*/
}

async function checkIp(data:number[]|Buffer, client:connections.client){
	if (config.doDnsLookups) {
		var arg:string = data.slice(1).toString().split("\n")[0].split("\r")[0];
		if (cv(1)) ll(`${colors.FgGreen}checking if ${colors.FgCyan+arg+colors.FgGreen} belongs to any participant${colors.Reset}`);

		let ipAddr = "";
		if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
			ipAddr = arg;
		}else{
			try{
				let {address, family} = await util.promisify(lookup)(arg);
				ipAddr = address;
				if (cv(2)) ll(`${colors.FgCyan+arg+colors.FgGreen} resolved to ${colors.FgCyan+ipAddr+colors.Reset}`);
			}catch(e){
				client.connection.end("ERROR\r\nnot a valid host or ip\r\n");
				if(cv(3)) ll(e)
				return;
			}
		}

		if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
			SqlQuery("SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", [])
			.then(function (peers:ITelexCom.peerList) {
				var ipPeers:{
					peer:ITelexCom.peer,
					ipaddress:string
				}[] = [];
				async.each(peers, function (peer, cb) {
					if ((!peer.ipaddress) && peer.hostname) {
						// if(cv(3)) ll(`hostname: ${peer.hostname}`)
						lookup(peer.hostname, {}, function (err, address, family) {
							// if (cv(3) && err) lle(colors.FgRed, err, colors.Reset);
							if (address) {
								ipPeers.push({
									peer,
									ipaddress:address
								});
								// if(cv(3)) ll(`${peer.hostname} resolved to ${address}`);
							}
							cb();
						});
					} else if (peer.ipaddress && (ip.isV4Format(peer.ipaddress) || ip.isV6Format(peer.ipaddress))) {
						// if(cv(3)) ll(`ip: ${peer.ipaddress}`);
						ipPeers.push({
							peer,
							ipaddress:peer.ipaddress
						});
						cb();
					} else {
						cb();
					}
				}, function () {
					let matches = ipPeers.filter(peer => ip.isEqual(peer.ipaddress, ipAddr)).map(x=>x.peer.name);
					if(cv(3)) ll("matching peers:",matches);
					if(matches.length > 0){
						client.connection.end("ok\r\n"+matches.join("\r\n")+"\r\n+++\r\n");
					}else{
						client.connection.end("fail\r\n+++\r\n");
					}
				});
			});
		} else {
			client.connection.end("ERROR\r\nnot a valid host or ip\r\n");
		}
	} else {
		client.connection.end("error\r\nthis server does not support this function\r\n");
	}
}
type MailTransporter = nodemailer.Transporter|{
	sendMail: (...rest:any[])=>void,
	options: {
		host: string
	}
}

function sendEmail(messageName:string, values:{
	[index:string]:string|number;
}, callback:()=>void):void {
	let message:{
		"subject":string,
		"html"?:string,
		"text"?:string
	} = config.eMail.messages[messageName];
	if (!message) {
		callback();
	} else {
		let mailOptions = {
			from: config.eMail.from,
			to: config.eMail.to,
			subject: message.subject,
			text:"",
			html:""
		};
	
		let type:string;
		if(message.html){
			type = "html";
		}else if(message.text){
			type = "text";
		}else{
			type = null;
			mailOptions.text = "configuration error in config/mailMessages.json";
		}
		if(type){
			mailOptions[type] = message[type];
			for (let k in values) {
				mailOptions[type] = mailOptions[type].replace(new RegExp(k.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g"), values[k]);
			}
		}
		if(cv(2)&&config.logITelexCom) {
			ll("sending mail:\n", mailOptions, "\nto server", getTransporter().options["host"]);
		} else if (cv(1)) {
			ll(`${colors.FgGreen}sending email of type ${colors.FgCyan+messageName||"config error(text)"+colors.Reset}`);
		}
		
		(<(MailOptions: MailOptions,callback:(err: Error,info:any)=>void)=>void>getTransporter().sendMail)(mailOptions, function (error, info) {
			if (error) {
				if (cv(2)) lle(error);
				if (typeof callback === "function") callback();
			} else {
				if(cv(1)&&config.logITelexCom) ll('Message sent:', info.messageId);
				if (config.eMail.useTestAccount) if (config.logITelexCom) ll('Preview URL:', nodemailer.getTestMessageUrl(info));
				if (typeof callback === "function") callback();
			}
		});
	}
}

export {
    SqlQuery,
    checkIp,
    sendEmail,
    MailTransporter,
	increaseErrorCounter,
	resetErrorCounter,
	errorCounters,
}