"use strict";
//TODO: Object.defineProperty(Date.prototype, 'getTimezone', { value:
function getTimezone(date) { //TODO: figure out way to not have this in all files where it is used
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
	return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}

Object.defineProperty(Buffer.prototype, 'readNullTermString', { value:
	function readNullTermString(encoding:string="utf8",start:number=0,end:number=this.length){
		// console.log(highlightBuffer(this));
		// console.log("start:"+start);
		// console.log("end:"+end);
		// console.log(highlightBuffer(this,start,end));
		let firstZero = this.indexOf(0,start);
		// console.log("firstZero:"+firstZero);
		let stop = firstZero>=start&&firstZero<=end?firstZero:end;
		// console.log("stop:"+firstZero);
		// console.log(highlightBuffer(this,start,stop));
		// console.log("result:\x1b[030m"+this.toString(encoding,start,stop)+"\x1b[000m\n\n");
		
		return this.toString(encoding,start,stop);
	}
});
Object.defineProperty(Buffer.prototype, 'writeByteArray', { value:
	function writeByteArray(array:number[], offset:number=0){
		if(array.length+offset>this.length){
			throw new RangeError("array is too big");
		}else{
			for(let i in array){
				this[+i+offset]=array[i];
			}
			return this;
		}
	}
});

// function highlightBuffer(buffer:Buffer,from:number=0,length:number=0){
// 	let array = Array.from(buffer).map(x=>(x<16?"0":"")+(<any>x).toString(16));
// 	if(from in array&&length>0){
// 		array[from] = "\x1b[046m"+"\x1b[030m"+array[from];
// 		array[from+length-1] += "\x1b[000m";
// 	}	
// 	return "<Buffer "+array.join(" ")+">\x1b[000m"
// }
function explainData(data:Buffer):string{
	let str = "<Buffer";
	var packagetype:number;
	var datalength:number;
	for(let typepos = 0;typepos < data.length - 1;typepos += datalength + 2) {
		packagetype = +data[typepos];
		datalength = +data[typepos + 1];

		// console.log(typepos,datalength+2,typepos+datalength+2);
		
		// console.log(highlightBuffer(data,typepos,datalength+2));
		
		// console.log(data.slice(typepos,typepos+datalength+2));
		
		let array = Array.from(data.slice(typepos,typepos+datalength+2)).map(x=>(x<16?"0":"")+x.toString(16));
		// console.log(array);
		
		array = array.map((value, index)=>	
			index==0?
			"\x1b[036m"+value+"\x1b[000m":
			index==1?
			"\x1b[032m"+value+"\x1b[000m":
			"\x1b[000m"+value+"\x1b[000m"
		);
		str += " "+array.join(" ");
	}
	str += ">";
	return str;
}
function inspectBuffer(buffer:Buffer):string{
	return Array.from(buffer).map((x=>(x<16?"0":"")+x.toString(16))).join(" ");
}
function explainPackagePart(buffer:Buffer, name:string, color:string){
	if(config.explainBuffers > 1){
		return ` ${color}[${name}: ${inspectBuffer(buffer)}]\x1b[000m`;
	}else{
		return ` ${color}${inspectBuffer(buffer)}\x1b[000m`;
	}
}
function explainPackage(pkg:Buffer):string{
	let res:string = "<Buffer";

	let packagetype = pkg[0];
	let datalength = pkg[1];
	res += explainPackagePart(Buffer.from([packagetype]), "packagetype", "\x1b[036m");
	res += explainPackagePart(Buffer.from([datalength]), "datalength", "\x1b[032m");
	switch (packagetype) {
		case 1:
			res += explainPackagePart(pkg.slice(2,6), "number", "\x1b[034m");
			res += explainPackagePart(pkg.slice(6,8), "pin", "\x1b[031m");
			res += explainPackagePart(pkg.slice(8,10), "port", "\x1b[042m");
			break;
		case 2:
			res += explainPackagePart(pkg.slice(2,6), "ipaddress", "\x1b[043m");

			break;
		case 3:
			res += explainPackagePart(pkg.slice(2,6), "number", "\x1b[034m");
			res += explainPackagePart(pkg.slice(6,7), "version", "\x1b[106m");
			break;
		case 4:
			res += " ";
			break;
		case 5:
			res += explainPackagePart(pkg.slice(2,6), "number", "\x1b[034m");
			res += explainPackagePart(pkg.slice(6,46), "name", "\x1b[000m");
			res += explainPackagePart(pkg.slice(46,48), "flags", "\x1b[047m");
			res += explainPackagePart(pkg.slice(48,49), "type", "\x1b[035m");
			res += explainPackagePart(pkg.slice(49,89), "hostname", "\x1b[033m");
			res += explainPackagePart(pkg.slice(89,93), "ipaddress", "\x1b[043m");
			res += explainPackagePart(pkg.slice(93,95), "port", "\x1b[042m");
			res += explainPackagePart(pkg.slice(95,96), "extension", "\x1b[045m");
			res += explainPackagePart(pkg.slice(96,98), "pin", "\x1b[031m");
			res += explainPackagePart(pkg.slice(98,102), "timestamp", "\x1b[047m");
			break;
		case 6:
			res += explainPackagePart(pkg.slice(2,3), "version", "\x1b[106m");
			res += explainPackagePart(pkg.slice(3,7), "serverpin", "\x1b[041m");
			break;
		case 7:
			res += explainPackagePart(pkg.slice(2,3), "version", "\x1b[106m");
			res += explainPackagePart(pkg.slice(3,7), "serverpin", "\x1b[041m");
			break;
		case 8:
			res += " ";
			break;
		case 9:
			res += " ";
			break;
		case 10:
			res += explainPackagePart(pkg.slice(2,3), "version", "\x1b[106m");
			res += explainPackagePart(pkg.slice(3,43), "pattern", "\x1b[000m");

			break;
		default:
			res = inspectBuffer(pkg);
	}
	res += "]\x1b[000m>";
	return res;
}


//#region imports
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";
import * as util from "util";
import * as net from "net";
import * as mysql from "mysql";
import * as async from "async";
import * as ip from "ip";
import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as nodemailer from "nodemailer";
import * as connections from "../BINARYSERVER/connections.js"
import handles from "../BINARYSERVER/handles.js";


import {MailOptions} from "nodemailer/lib/json-transport.js";
import {getTransporter, setTransporter} from "../BINARYSERVER/transporter.js";
import { lookup } from "dns";
//#endregion

const verbosity = config.loggingVerbosity;
const cv:(level:number)=>boolean = level => level <= verbosity; //check verbosity

const mySqlConnectionOptions = config['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;

//#region constants



//#endregion

var serverErrors = {};

interface PackageData_decoded {
    number ? : number;
    name ? : string;
    disabled ? : number;
    type ? : number;
    hostname ? : string;
    ipaddress ? : string;
    port ? : string;
    extension ? : string;
    pin ? : string;
    timestamp ? : number;
    version ? : number;
    serverpin ? : number;
    pattern ? : string;
}
interface Package_decoded {
    data ? : PackageData_decoded
    packagetype : number;
    datalength : number;
}

type PackageData_encoded = number[]|Buffer;
interface Package_encoded {
    data ? : PackageData_encoded
    packagetype ? : number;
    datalength ? : number;
}

interface rawPackage{
    packagetype:number,
    datalength:number,
    data: PackageData_encoded
}

interface peer{
	uid:number;
	number:number;
	name:string;
	type:number;
	hostname:string;
	ipaddress:string;
	port:string;
	extension:string;
	pin:string;
	disabled:number;
	timestamp:number;
	changed:number;
}
type peerList = peer[];

interface server{
	uid:number;
	addresse:string;
	port:string;
}
type serverList = server[];

interface queueEntry{
	uid:number;
	server:number;
	message:number;
	timestamp:number;
}
type queue = queueEntry[];

      
function handlePackage(obj:Package_decoded, client:connections.client, pool, cb:()=>void) {
	if (!obj) {
		if (cv(0)) lle(colors.FgRed + "no package to handle" + colors.Reset);
		if (typeof cb === "function") cb();
	} else {
		if(cv(2)&&config.logITelexCom) ll(colors.FgGreen + "state: " + colors.FgCyan + constants.stateNames[client.state] + "(" + client.state + ")" + colors.Reset);
		if (obj.packagetype == 0xff) {
			if (cv(0)) lle(colors.FgRed + "remote client had error:", Buffer.from(<number[]>obj.data).toString());
			if (typeof cb === "function") cb();
		} else {
			try {
				if (cv(2)) {
					if (config.logITelexCom) ll(colors.FgGreen + "handling package:" + colors.FgCyan, obj, colors.FgGreen + "for: " + colors.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.number : client.connection.remoteAddress) + colors.Reset);
				} else if (cv(1)) {
					if (config.logITelexCom) ll(colors.FgGreen + "handling packagetype:" + colors.FgCyan, obj.packagetype, colors.FgGreen + "for: " + colors.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.number : client.connection.remoteAddress) + colors.Reset);
				}
				if (typeof handles[obj.packagetype][client.state] == "function") {
					if(cv(2)&&config.logITelexCom) ll(colors.FgGreen + "calling handler for packagetype " + colors.FgCyan + constants.PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors.FgGreen + " in state " + colors.FgCyan + constants.stateNames[client.state] + "(" + client.state + ")" + colors.Reset);
					try {
						handles[obj.packagetype][client.state](obj, client, pool, cb);
					} catch (e) {
						if (cv(0)) lle(colors.FgRed, e, colors.Reset);
						if (typeof cb === "function") cb();
					}
				} else {
					if (cv(0)) lle(colors.FgRed + "packagetype " + colors.FgCyan + constants.PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors.FgRed + " not supported in state " + colors.FgCyan + constants.stateNames[client.state] + "(" + client.state + ")" + colors.Reset);
					if (typeof cb === "function") cb();
				}
			} catch (e) {
				if (cv(0)) lle(colors.FgRed, e, colors.Reset);
				if (typeof cb === "function") cb();
			}
		}
	}
}

function getCompletePackages(data:Buffer, part?:Buffer):[Buffer,Buffer]{
	if(cv(3)) if (config.logITelexCom) ll("\nextracting packages from data:");
	if(cv(3)) if (config.logITelexCom) ll("data: ",data);
	if(cv(3)) if (config.logITelexCom) ll("part: ",part);
	var buffer = part?Buffer.concat([part,data]):data;
	if(cv(3)) if (config.logITelexCom) ll("combined: ",buffer);
	var packagetype = buffer[0]; //TODO check for valid type
	var packagelength = buffer[1] + 2;
	if(cv(3)) if (config.logITelexCom) ll("packagetype: ",packagetype);
	if(cv(3)) if (config.logITelexCom) ll("packagelength: ",packagelength);
	if (buffer.length == packagelength) {
		if(cv(3)) if (config.logITelexCom) ll("buffer.length == packagelength");
		return [
			buffer,
			new Buffer(0)
		];
	} else if (buffer.length > packagelength) {
		if(cv(3)) if (config.logITelexCom) ll("buffer.length > packagelength");
		let rest = getCompletePackages(buffer.slice(packagelength, buffer.length), null);
		return [
			Buffer.concat([buffer.slice(0, packagelength),rest[0]]),
			rest[1]
		];
	} else if (buffer.length < packagelength) {
		if(cv(3)) if (config.logITelexCom) ll("buffer.length < packagelength");
		return [
			new Buffer(0),
			buffer
		];
	} else {
		return ([
			new Buffer(0),
			new Buffer(0)
		]);
	}
}
function unmapIpV4fromIpV6(ipaddress:string):string{
	if(ip.isV4Format(ipaddress)){
		return ipaddress;
	}else if(ip.isV6Format(ipaddress)){
		if(ip.isV4Format(ipaddress.toLowerCase().split("::ffff:")[1])){
			return ipaddress.toLowerCase().split("::ffff:")[1]
		}else{
			return "0.0.0.0";
		}
	}else{
		return "0.0.0.0";
	}
}
function encPackage(obj:Package_decoded):Buffer{
    if (config.logITelexCom) ll(colors.FgGreen + "encoding:" + colors.FgCyan, obj, colors.Reset);
    var data:PackageData_decoded = obj.data;
	var buffer:PackageData_encoded = new Buffer(obj.datalength+2);
	
	buffer[0] = obj.packagetype;
	buffer[1] = obj.datalength;
		
    switch (obj.packagetype) {
		case 1:
			buffer.writeUIntLE(data.number,2,4);
			buffer.writeUIntLE(+data.pin,6,2);
			buffer.writeUIntLE(+data.port,8,2);
            break;
        case 2:
			(<any>buffer).writeByteArray(unmapIpV4fromIpV6(data.ipaddress).split("."),2) // .map(x=>+x)
            break;
		case 3:
			buffer.writeUIntLE(data.number,2,4);
            buffer.writeUIntLE(data.version,6,1);
            break;
        case 4:
            break;
        case 5:
			let flags = data.disabled?2:0;
			
            let ext = 0;
            if (!data.extension) {
                ext = 0;
            } else if (data.extension == "0") {
                ext = 110;
            } else if (data.extension == "00") {
                ext = 100;
            } else if (data.extension.toString().length == 1) {
                ext = parseInt(data.extension) + 100;
            } else {
                ext = parseInt(data.extension);
            }
			// console.log("\n");
			// ll(buffer);
			// ll(data.number, 2, 4);
			(<any>buffer).writeUIntLE(data.number, 2, 4);
			// ll(highlightBuffer(buffer, 2, 4));
			// ll(data.name, 6, 40);
			(<any>buffer).write(data.name, 6, 40);
			// ll(highlightBuffer(buffer, 6, 40));
			// ll(flags, 46, 2);
			(<any>buffer).writeUIntLE(flags, 46, 2);
			// ll(highlightBuffer(buffer, 46, 2));
			// ll(data.type, 48, 1);
			(<any>buffer).writeUIntLE(data.type, 48, 1);
			// ll(highlightBuffer(buffer, 48, 1));
			// ll(data.hostname, 49, 40);
			(<any>buffer).write(data.hostname, 49, 40);
			// ll(highlightBuffer(buffer, 49, 40));
			// ll(unmapIpV4fromIpV6(data.ipaddress).split("."),89);
			(<any>buffer).writeByteArray(unmapIpV4fromIpV6(data.ipaddress).split("."),89); // .map(x=>+x)
			// ll(highlightBuffer(buffer, 89, 4));
			// ll(+data.port, 93, 2);
			(<any>buffer).writeUIntLE(+data.port, 93, 2);
			// ll(highlightBuffer(buffer, 93, 2));
			// ll(ext, 95, 1);
			(<any>buffer).writeUIntLE(ext, 95, 1);
			// ll(highlightBuffer(buffer, 95, 1));
			// ll(+data.pin, 96, 2);
			(<any>buffer).writeUIntLE(+data.pin, 96, 2);
			// ll(highlightBuffer(buffer, 96, 2));
			// ll(data.timestamp + 2208988800, 98, 4);
			(<any>buffer).writeUIntLE(data.timestamp + 2208988800, 98, 4);
			// ll(highlightBuffer(buffer, 98, 4));
				
            break;
        case 6:
			(<any>buffer).writeUIntLE(data.version, 2, 1);
            (<any>buffer).writeUIntLE(data.serverpin, 3, 4);
            break;
        case 7:
			(<any>buffer).writeUIntLE(data.version, 2, 1);
			(<any>buffer).writeUIntLE(data.serverpin, 3, 4);
            break;
        case 8:
            break;
        case 9:
            break;
        case 10:
			(<any>buffer).writeUIntLE(data.version, 2, 1);
            (<any>buffer).write(data.pattern, 3, 40);
            break;
    }
    if (config.logITelexCom&&cv(1)) ll(colors.FgGreen + "encoded:" +colors.Reset,(config.explainBuffers>0?explainPackage(buffer):buffer));
    return buffer;
}

function decPackage(buffer:Buffer): Package_decoded {
	var data: PackageData_decoded;
	let packagetype = buffer[0];
	let datalength = buffer[1];
	if (config.logITelexCom&&cv(1)) ll(colors.FgGreen + "decoding package:" +colors.Reset,(config.explainBuffers>0?explainPackage(buffer):buffer));
    switch (packagetype) {
        case 1:
            data = {
                number: buffer.readUIntLE(2,4),
                pin: buffer.readUIntLE(6,2).toString(),
                port: buffer.readUIntLE(8,2).toString()
            };
            break;
        case 2:
            data = {
                ipaddress: buffer.slice(2, 6).join(".")
			};
			if(data.ipaddress == "0.0.0.0") data.ipaddress = "";
            break;
        case 3:
            data = {
                number: buffer.readUIntLE(2,4), 
            };
            if (buffer.slice(6, 7).length > 0) {
                data.version = buffer.readUIntLE(6,1);
            } else {
                data.version = 1;
            }
            break;
        case 4:
            data = {};
            break;
        case 5:

            let flags = buffer.readUIntLE(46,2);

			// <Call-number 4b> 0,4
			// <Name 40b> 		4,44
			// <Flags 2b>		44,46
			// <Type 1b>		46,47
			// <Addr 40b>		47,87
			// <IPAdr 4b>		87,91
			// <Port 2b>		91,93
			// <Extension 1b>	93,94
			// <DynPin 2b>		94,96
			// <Date 4b>		96,100
            data = {
                number: buffer.readUIntLE(2,4),
                name: (<any>buffer).readNullTermString("utf8",6,46),
                disabled: (flags&2)==2?1:0,
                type: buffer.readUIntLE(48,1),
                hostname: (<any>buffer).readNullTermString("utf8",49, 89),
                ipaddress: buffer.slice(89, 93).join("."),
                port: buffer.readUIntLE(93, 2).toString(),
                pin: buffer.readUIntLE(96,2).toString(),
                timestamp: buffer.readUIntLE(98,4) - 2208988800
			};
			if(data.ipaddress == "0.0.0.0") data.ipaddress = "";
			if(data.hostname == "") data.hostname = "";

            let extension:number =  buffer.readUIntLE(95,1);
            if (extension == 0) {
                data.extension = null;
            } else if (extension == 110) {
                data.extension = "0";
            } else if (extension == 100) {
                data.extension = "00";
            } else if (extension > 110) {
                data.extension = null;
            } else if (extension > 100) {
                data.extension = (extension - 100).toString();
            } else if (extension < 10) {
                data.extension = "0" + extension;
            } else {
                data.extension = extension.toString();
            }

            break;
        case 6:
            data = {
                version: buffer.readUIntLE(2,1),
                serverpin: buffer.readUIntLE(3,4)
            };
            break;
        case 7:
            data = {
                version: buffer.readUIntLE(2,1),
                serverpin: buffer.readUIntLE(3,4)
            };
            break;
        case 8:
            data = {};
            break;
        case 9:
            data = {};
            break;
        case 10:
            data = {
                version: buffer.readUIntLE(2,1),
                pattern: (<any>buffer).readNullTermString("utf8",3,43)
            };
            break;
        default:
            lle(colors.FgRed+"invalid/unsupported packagetype: " +colors.FgCyan+ packagetype+colors.Reset);
            return null
	}
    return {
		packagetype,
		datalength,
		data	
	};
}

function decPackages(buffer:number[]|Buffer): Package_decoded[] {
	if(!(buffer instanceof Buffer)) buffer = Buffer.from(buffer);
    if (config.logITelexCom) ll(colors.FgGreen + "decoding data:"+colors.Reset,(config.explainBuffers?explainData(buffer):buffer),colors.Reset);
	var out: Package_decoded[] = [];
	
    for(let typepos = 0;typepos < buffer.length - 1;typepos += datalength + 2) {
        var packagetype:number = +buffer[typepos];
		var datalength:number = +buffer[typepos + 1];
		
		if (packagetype in constants.PackageSizes&&constants.PackageSizes[packagetype] != datalength) {
			if(cv(1)&&config.logITelexCom) ll(`${colors.FgRed}size missmatch: ${constants.PackageSizes[packagetype]} != ${datalength}${colors.Reset}`);
			if (config.allowInvalidPackageSizes) {
				if(cv(1)&&config.logITelexCom) ll(`${colors.FgRed}using package of invalid size!${colors.Reset}`);
			} else {
				if(cv(2)&&config.logITelexCom) ll(`${colors.FgYellow}ignoring package, because it is of invalid size!${colors.Reset}`);
				continue;
			}
		}
		let pkg = decPackage(buffer.slice(typepos,typepos+datalength+2));
		if(pkg) out.push(pkg);
    }
    if (config.logITelexCom) ll(colors.FgGreen + "decoded:", colors.FgCyan, out, colors.Reset);
    return out;
}

function increaseErrorCounter(serverkey:string, error:Error, code:string):void {
	let exists:boolean = Object.keys(serverErrors).findIndex(k => k == serverkey) > -1;
	if (exists) {
		serverErrors[serverkey].errors.push({
			error: error,
			code: code,
			timeStamp: Date.now()
		});
		serverErrors[serverkey].errorCounter++;
	} else {
		serverErrors[serverkey] = {
			errors: [{
				error: error,
				code: code,
				timeStamp: Date.now()
			}],
			errorCounter: 1
		};
	}
	let warn:boolean = config.warnAtErrorCounts.indexOf(serverErrors[serverkey].errorCounter) > -1;
	if (cv(1)) lle(`${colors.FgYellow}increased errorCounter for server ${colors.FgCyan}${serverkey}${colors.FgYellow} to ${warn?colors.FgRed:colors.FgCyan}${serverErrors[serverkey].errorCounter}${colors.Reset}`);
	if (warn) {
		sendEmail("ServerError", {
			"[server]": serverkey,
			"[errorCounter]": serverErrors[serverkey].errorCounter,
			"[lastError]": serverErrors[serverkey].errors.slice(-1)[0].code,
			"[date]": new Date().toLocaleString(),
			"[timeZone]": getTimezone(new Date())
		}, function () {});
	}
}

function ascii(data:number[]|Buffer, client:connections.client, pool:mysql.Pool|mysql.Connection):void {
	var number:string = "";
	for (let byte of data) {
		//if(cv(2)) if (config.logITelexCom) ll(String.fromCharCode(byte));
		let char = String.fromCharCode(byte);
		if (/([0-9])/.test(char)) number += char;
	}
	if (number != "") {
		if (!isNaN(parseInt(number))) {
			if(cv(1)&&config.logITelexCom) ll(colors.FgGreen + "starting lookup for: " + colors.FgCyan + number + colors.Reset);
			SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number], function (result:peerList) {
				if (!result || result.length == 0) {
					let send:string = "";
					send += "fail\r\n";
					send += number + "\r\n";
					send += "unknown\r\n";
					send += "+++\r\n";
					client.connection.end(send, function () { //TODO: .write?
						if (cv(1)) {
							let m:string = colors.FgRed + "Entry not found/visible";
							if (cv(2)) m += ",\nsent:\n" + colors.FgCyan + send;
							m += colors.Reset;
							if (config.logITelexCom) ll(m);
						}
					});
				} else {
					let send:string = "";
					let res = result[0];
					send += "ok\r\n";
					send += res.number + "\r\n";
					send += res.name + "\r\n";
					send += res.type + "\r\n";
					if ([2,4,5].indexOf(res.type)>-1) {						send += res.ipaddress + "\r\n";
					} else if ([1,3,6].indexOf(res.type)>-1) {
						send += res.hostname + "\r\n";
					}/* else if (res.type == 6) {
						send += res.hostname + "\r\n";
					}*/ else{
						send += "ERROR\r\n";
					}
					send += res.port + "\r\n";
					send += (res.extension || "-") + "\r\n";
					send += "+++\r\n";
					client.connection.end(send, function () { //TODO: .write=
						if (cv(1)){
							let m = colors.FgGreen + "Entry found";
							if (cv(2)) m += ",\nsent:\n" + colors.FgCyan + send;
							m += colors.Reset;
							if (config.logITelexCom) ll(m);
						}
					});
				}
			});
		}
	}else{
		//TODO connection.end()?
	}
}

function SqlQuery(sqlPool:mysql.Pool|mysql.Connection, query:string, options:any[], callback:(res:any)=>void):void { //TODO: any-> real type
	if (cv(3)) ll(colors.BgLightCyan+colors.FgBlack+query,options,colors.Reset);

	query = query.replace(/\n/g,"").replace(/\s+/g," ");
	query = mysql.format(query, options);
	if (cv(2) || (cv(1)&&/(update)|(insert)/gi.test(query))) llo(1, colors.BgLightBlue + colors.FgBlack + query + colors.Reset);
	sqlPool.query(query, function (err, res) {
		if(sqlPool["_allConnections"]&&sqlPool["_allConnections"].length){
			if(cv(3)) ll("number of open connections: " + sqlPool["_allConnections"].length);
		}else{
			if(cv(2)) ll("not a pool");
		}
		if (err) {
			if (cv(0)) llo(1, colors.FgRed, err, colors.Reset);
			callback(null);
		} else {
			callback(res);
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
					//console.log(sqlPool);
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
		console.log(sqlPool);
		throw(e);
	}*/
}

async function checkIp(data:number[]|Buffer, client:connections.client, pool:mysql.Pool|mysql.Connection){
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
				return;
				if(cv(3)) ll(e)
			}
		}

		if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
			SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", [], function (peers:peerList) {
				var ipPeers:{
					peer:peer,
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

//#region exports
export{
//#region functions
	getCompletePackages,
	handlePackage,
	decPackage,
	encPackage,
	sendEmail,
	SqlQuery,
	decPackages,
	increaseErrorCounter,
	ascii,
	checkIp,
	cv,
//#endregion
//#region variables
	serverErrors,
//#endregion
//#region interfaces
	peer,
	peerList,
	serverList,
	server,
	queueEntry,
	queue,
	PackageData_decoded,
	Package_decoded,
	PackageData_encoded,
	Package_encoded,
	rawPackage,
	MailTransporter
//#endregion
}
//#endregion