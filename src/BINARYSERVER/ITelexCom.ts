"use strict";
//TODO: Object.defineProperty(Date.prototype, 'getTimezone', { value:

Object.defineProperty(Buffer.prototype, 'readNullTermString', { value:
	function readNullTermString(encoding:string="utf8",start:number=0,end:number=this.length){
		// lle(highlightBuffer(this));
		// lle("start:"+start);
		// lle("end:"+end);
		// lle(highlightBuffer(this,start,end));
		let firstZero = this.indexOf(0,start);
		// lle("firstZero:"+firstZero);
		let stop = firstZero>=start&&firstZero<=end?firstZero:end;
		// lle("stop:"+firstZero);
		// lle(highlightBuffer(this,start,stop));
		// lle("result:\x1b[030m"+this.toString(encoding,start,stop)+"\x1b[000m\n\n");
		
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

		// lle(typepos,datalength+2,typepos+datalength+2);
		
		// lle(highlightBuffer(data,typepos,datalength+2));
		
		// lle(data.slice(typepos,typepos+datalength+2));
		
		let array = Array.from(data.slice(typepos,typepos+datalength+2)).map(x=>(x<16?"0":"")+x.toString(16));
		// lle(array);
		
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
		return ` [${name}: ${inspectBuffer(buffer)}]`;
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
import * as mysql from "mysql";
import * as ip from "ip";
import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";
import * as constants from "../BINARYSERVER/constants.js";
import * as connections from "../BINARYSERVER/connections.js"
import handles from "../BINARYSERVER/handles.js";
import * as misc from "../BINARYSERVER/misc.js";
import { version } from "punycode";
//#endregion

const cv = config.cv;

type Package_decoded =
Package_decoded_1|
Package_decoded_2|
Package_decoded_3|
Package_decoded_4|
Package_decoded_5|
Package_decoded_6|
Package_decoded_7|
Package_decoded_8|
Package_decoded_9|
Package_decoded_10|
Package_decoded_255;

type PackageData_decoded =
PackageData_decoded_1|
PackageData_decoded_2|
PackageData_decoded_3|
PackageData_decoded_4|
PackageData_decoded_5|
PackageData_decoded_6|
PackageData_decoded_7|
PackageData_decoded_8|
PackageData_decoded_9|
PackageData_decoded_10|
PackageData_decoded_255;


interface Package_decoded_1{
	packagetype: 1,
	datalength?: 8,
	data: PackageData_decoded_1
}
interface Package_decoded_2{
	packagetype: 2,
	datalength?: 4,
	data: PackageData_decoded_2
}
interface Package_decoded_3{
	packagetype: 3,
	datalength?: 5,
	data: PackageData_decoded_3
}
interface Package_decoded_4{
	packagetype: 4,
	datalength?: 0,
	data?: PackageData_decoded_4
}
interface Package_decoded_5{
	packagetype: 5,
	datalength?: 100,
	data: PackageData_decoded_5
}
interface Package_decoded_6{
	packagetype: 6,
	datalength?: 5,
	data: PackageData_decoded_6
}
interface Package_decoded_7{
	packagetype: 7,
	datalength?: 5,
	data: PackageData_decoded_7
}
interface Package_decoded_8{
	packagetype: 8,
	datalength?: 0,
	data?: PackageData_decoded_8
}
interface Package_decoded_9{
	packagetype: 9,
	datalength?: 0,
	data?: PackageData_decoded_9
}
interface Package_decoded_10{
	packagetype: 10,
	datalength?: 41,
	data: PackageData_decoded_10
}
interface Package_decoded_255{
	packagetype: 255,
	datalength?: number,
	data: PackageData_decoded_255
}
interface PackageData_decoded_1{
	number: number,
	pin: string,
	port: string
}
interface PackageData_decoded_2{
	ipaddress: string,
}
interface PackageData_decoded_3{
	number: number,
	version: number,
}
interface PackageData_decoded_4{

}
interface PackageData_decoded_5{
	number: number,
	name: string,
	disabled: number,
	type: number,
	hostname: string,
	ipaddress: string,
	port: string,
	extension: string,
	pin: string,
	timestamp: number,
}
interface PackageData_decoded_6{
	version: number,
	serverpin: number,
}
interface PackageData_decoded_7{
	version: number,
	serverpin: number,
}
interface PackageData_decoded_8{

}
interface PackageData_decoded_9{

}
interface PackageData_decoded_10{
	version: number,
	pattern: string
}
type PackageData_decoded_255 = Buffer|number[];

/*
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
            {
                version: buffer.readUIntLE(2,1),
                pattern: (<any>buffer).readNullTermString("utf8",3,43)
            };
*/

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
	var combined = part?Buffer.concat([part,data]):data;
	if(cv(3)) if (config.logITelexCom) ll("combined: ",combined);
	var packagetype = combined[0]; //TODO check for valid type
	var packagelength = (combined[1] != undefined?combined[1]:Infinity) + 2;
	if(cv(3)) if (config.logITelexCom) ll("packagetype: ",packagetype);
	if(cv(3)) if (config.logITelexCom) ll("packagelength: ",packagelength);
	if (combined.length == packagelength) {
		if(cv(3)) if (config.logITelexCom) ll("combined.length == packagelength");
		if(cv(3)) if (config.logITelexCom) ll(`${colors.FgGreen}recieved ${colors.FgCyan}${combined.length}${colors.FgGreen}/${colors.FgCyan}${packagelength}${colors.FgGreen} bytes for next package${colors.Reset}`);
		return [
			combined,
			new Buffer(0)
		];
	} else if (combined.length > packagelength) {
		if(cv(3)) if (config.logITelexCom) ll("combined.length > packagelength");
		let rest = getCompletePackages(combined.slice(packagelength, combined.length), null);
		return [
			Buffer.concat([combined.slice(0, packagelength),rest[0]]),
			rest[1]
		];
	} else if (combined.length < packagelength) {
		if(cv(2)) if (config.logITelexCom) ll(`${colors.FgGreen}recieved ${colors.FgCyan}${combined.length}${colors.FgGreen}/${colors.FgCyan}${packagelength}${colors.FgGreen} bytes for next package${colors.Reset}`);
		if(cv(3)) if (config.logITelexCom) ll("combined.length < packagelength");
		return [
			new Buffer(0),
			combined
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
function encPackage(pkg:Package_decoded):Buffer{
	if (config.logITelexCom) ll(colors.FgGreen + "encoding:" + colors.FgCyan, pkg, colors.Reset);
	if(pkg.datalength == null) pkg.datalength = constants.PackageSizes[pkg.packagetype];
	var buffer:PackageData_encoded = new Buffer(pkg.datalength+2);
	
	buffer[0] = pkg.packagetype;
	buffer[1] = pkg.datalength;
		
    switch (pkg.packagetype) {
		case 1:
			buffer.writeUIntLE(pkg.data.number||0,2,4);
			buffer.writeUIntLE(+pkg.data.pin||0,6,2);
			buffer.writeUIntLE(+pkg.data.port||0,8,2);
            break;
        case 2:
			(<any>buffer).writeByteArray(unmapIpV4fromIpV6(pkg.data.ipaddress).split("."),2) // .map(x=>+x)
            break;
		case 3:
			buffer.writeUIntLE(pkg.data.number||0,2,4);
            buffer.writeUIntLE(pkg.data.version||0,6,1);
            break;
        case 4:
            break;
        case 5:
			let flags = pkg.data.disabled?2:0;
			
            let ext = 0;
            if (!pkg.data.extension) {
                ext = 0;
            } else if (pkg.data.extension == "0") {
                ext = 110;
            } else if (pkg.data.extension == "00") {
                ext = 100;
            } else if (pkg.data.extension.toString().length == 1) {
                ext = parseInt(pkg.data.extension) + 100;
            } else {
                ext = parseInt(pkg.data.extension);
            }
			// lle("\n");
			// ll(buffer);
			// ll(pkg.data.number, 2, 4);
			buffer.writeUIntLE(pkg.data.number||0, 2, 4);
			// ll(highlightBuffer(buffer, 2, 4));
			// ll(pkg.data.name, 6, 40);
			buffer.write(pkg.data.name||"", 6, 40);
			// ll(highlightBuffer(buffer, 6, 40));
			// ll(flags, 46, 2);
			buffer.writeUIntLE(flags||0, 46, 2);
			// ll(highlightBuffer(buffer, 46, 2));
			// ll(pkg.data.type, 48, 1);
			buffer.writeUIntLE(pkg.data.type||0, 48, 1);
			// ll(highlightBuffer(buffer, 48, 1));
			// ll(pkg.data.hostname, 49, 40);
			buffer.write(pkg.data.hostname||"", 49, 40);
			// ll(highlightBuffer(buffer, 49, 40));
			// ll(unmapIpV4fromIpV6(pkg.data.ipaddress).split("."),89);
			(<any>buffer).writeByteArray(unmapIpV4fromIpV6(pkg.data.ipaddress).split("."),89); // .map(x=>+x)
			// ll(highlightBuffer(buffer, 89, 4));
			// ll(+pkg.data.port, 93, 2);
			buffer.writeUIntLE(+pkg.data.port||0, 93, 2);
			// ll(highlightBuffer(buffer, 93, 2));
			// ll(ext, 95, 1);
			buffer.writeUIntLE(ext||0, 95, 1);
			// ll(highlightBuffer(buffer, 95, 1));
			// ll(+pkg.data.pin, 96, 2);
			buffer.writeUIntLE(+pkg.data.pin||0, 96, 2);
			// ll(highlightBuffer(buffer, 96, 2));
			// ll(pkg.data.timestamp + 2208988800, 98, 4);
			buffer.writeUIntLE((pkg.data.timestamp||0) + 2208988800, 98, 4);
			// ll(highlightBuffer(buffer, 98, 4));
				
            break;
        case 6:
			buffer.writeUIntLE(pkg.data.version||0, 2, 1);
            buffer.writeUIntLE(pkg.data.serverpin||0, 3, 4);
            break;
        case 7:
			buffer.writeUIntLE(pkg.data.version||0, 2, 1);
			buffer.writeUIntLE(pkg.data.serverpin||0, 3, 4);
            break;
        case 8:
            break;
        case 9:
            break;
        case 10:
			buffer.writeUIntLE(pkg.data.version||0, 2, 1);
            buffer.write(pkg.data.pattern||"", 3, 40);
            break;
    }
    if (config.logITelexCom&&cv(1)) ll(colors.FgGreen + "encoded:" +colors.Reset,(config.explainBuffers>0?explainPackage(buffer):buffer));
    return buffer;
}


function decPackage(buffer:Buffer): Package_decoded {
	let pkg:Package_decoded = {
		packagetype: <any>buffer[0],
		datalength: <any>buffer[1],
		data: null
	};
	if (config.logITelexCom&&cv(1)) ll(colors.FgGreen + "decoding package:" +colors.Reset,(config.explainBuffers>0?explainPackage(buffer):buffer));
    switch (pkg.packagetype) {
        case 1:
			pkg.data = {
                number: buffer.readUIntLE(2,4),
                pin: buffer.readUIntLE(6,2).toString(),
                port: buffer.readUIntLE(8,2).toString()
            };
            break;
        case 2:
            pkg.data = {
                ipaddress: buffer.slice(2, 6).join(".")
			};
			if(pkg.data.ipaddress == "0.0.0.0") pkg.data.ipaddress = "";
            break;
        case 3:
            pkg.data = {
				number: buffer.readUIntLE(2,4),
				version: buffer.slice(6, 7).length > 0?buffer.readUIntLE(6,1):1
            };
            break;
        case 4:
            pkg.data = {};
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
            pkg.data = {
                number: buffer.readUIntLE(2,4),
                name: (<any>buffer).readNullTermString("utf8",6,46),
                disabled: (flags&2)==2?1:0,
                type: buffer.readUIntLE(48,1),
                hostname: (<any>buffer).readNullTermString("utf8",49, 89),
                ipaddress: buffer.slice(89, 93).join("."),
                port: buffer.readUIntLE(93, 2).toString(),
                pin: buffer.readUIntLE(96,2).toString(),
				timestamp: buffer.readUIntLE(98,4) - 2208988800,
				extension: null
			};
			if(pkg.data.ipaddress == "0.0.0.0") pkg.data.ipaddress = "";
			if(pkg.data.hostname == "") pkg.data.hostname = "";

            let extension:number =  buffer.readUIntLE(95,1);
            if (extension == 0) {
                pkg.data.extension = null;
            } else if (extension == 110) {
                pkg.data.extension = "0";
            } else if (extension == 100) {
                pkg.data.extension = "00";
            } else if (extension > 110) {
                pkg.data.extension = null;
            } else if (extension > 100) {
                pkg.data.extension = (extension - 100).toString();
            } else if (extension < 10) {
                pkg.data.extension = "0" + extension;
            } else {
                pkg.data.extension = extension.toString();
            }

            break;
        case 6:
            pkg.data = {
                version: buffer.readUIntLE(2,1),
                serverpin: buffer.readUIntLE(3,4)
            };
            break;
        case 7:
            pkg.data = {
                version: buffer.readUIntLE(2,1),
                serverpin: buffer.readUIntLE(3,4)
            };
            break;
        case 8:
            pkg.data = {};
            break;
        case 9:
            pkg.data = {};
            break;
        case 10:
            pkg.data = {
                version: buffer.readUIntLE(2,1),
                pattern: (<any>buffer).readNullTermString("utf8",3,43)
            };
            break;
        default:
            lle(colors.FgRed+"invalid/unsupported packagetype: " +colors.FgCyan+ pkg.packagetype+colors.Reset);
            return null
	}
    return pkg;
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
			misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number])
			.then(function (result:peerList) {
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
			})
			.catch(err=>lle(err));
		}
	}else{
		//TODO connection.end()?
	}
}




//#region exports
export{
//#region functions
	getCompletePackages,
	handlePackage,
	decPackage,
	encPackage,
	decPackages,
	ascii,
	cv,

	explainPackage,
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
	PackageData_decoded_1,
	PackageData_decoded_2,
	PackageData_decoded_3,
	PackageData_decoded_4,
	PackageData_decoded_5,
	PackageData_decoded_6,
	PackageData_decoded_7,
	PackageData_decoded_8,
	PackageData_decoded_9,
	PackageData_decoded_10,
	PackageData_decoded_255,
	Package_decoded_1,
	Package_decoded_2,
	Package_decoded_3,
	Package_decoded_4,
	Package_decoded_5,
	Package_decoded_6,
	Package_decoded_7,
	Package_decoded_8,
	Package_decoded_9,
	Package_decoded_10,
	Package_decoded_255,
//#endregion
}
//#endregion
