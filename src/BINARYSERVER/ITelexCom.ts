"use strict";

//#region imports
import * as ip from "ip";
import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";
import * as constants from "../BINARYSERVER/constants.js";
import { inspect, normalizeIp } from "../SHARED/misc.js";
import { Transform } from "stream";

//#endregion





Buffer.prototype.readNullTermString =  function readNullTermString(encoding: string = "utf8", start: number = 0, end: number = this.length):string {
	let firstZero = this.indexOf(0, start);
	let stop = firstZero >= start && firstZero <= end ? firstZero : end;
	return this.toString(encoding, start, stop);
};

function inspectBuffer(buffer: Buffer): string {
	return Array.from(buffer).map(x => x.toString(16).padStart(2, "0")).join(" ");
}

function explainPackagePart(buffer: Buffer, name: string, color: string) {
	if (config.explainBuffers > 1) {
		return ` ${color}[${name}: ${inspectBuffer(buffer)}]${colors.Reset}`;
	} else {
		return ` [${name}: ${inspectBuffer(buffer)}]`;
	}
}

function explainPackage(pkg: Buffer): string {
	let res: string = (config.explainBuffers > 1 ? colors.Reset : "")+"<Buffer";

	let type = pkg[0];
	let datalength = pkg[1];
	res += explainPackagePart(Buffer.from([type]), "type", "\x1b[036m");
	res += explainPackagePart(Buffer.from([datalength]), "datalength", "\x1b[032m");
	switch (type) {
		case 1:
			res += explainPackagePart(pkg.slice(2, 6), "number", "\x1b[034m");
			res += explainPackagePart(pkg.slice(6, 8), "pin", "\x1b[031m");
			res += explainPackagePart(pkg.slice(8, 10), "port", "\x1b[042m");
			break;
		case 2:
			res += explainPackagePart(pkg.slice(2, 6), "ipaddress", "\x1b[043m");

			break;
		case 3:
			res += explainPackagePart(pkg.slice(2, 6), "number", "\x1b[034m");
			res += explainPackagePart(pkg.slice(6, 7), "version", "\x1b[106m");
			break;
		case 4:
			res += " ";
			break;
		case 5:
			res += explainPackagePart(pkg.slice(2, 6), "number", "\x1b[034m");
			res += explainPackagePart(pkg.slice(6, 46), "name", "\x1b[000m");
			res += explainPackagePart(pkg.slice(46, 48), "flags", "\x1b[047m");
			res += explainPackagePart(pkg.slice(48, 49), "type", "\x1b[035m");
			res += explainPackagePart(pkg.slice(49, 89), "hostname", "\x1b[033m");
			res += explainPackagePart(pkg.slice(89, 93), "ipaddress", "\x1b[043m");
			res += explainPackagePart(pkg.slice(93, 95), "port", "\x1b[042m");
			res += explainPackagePart(pkg.slice(95, 96), "extension", "\x1b[045m");
			res += explainPackagePart(pkg.slice(96, 98), "pin", "\x1b[031m");
			res += explainPackagePart(pkg.slice(98, 102), "timestamp", "\x1b[047m");
			break;
		case 6:
			res += explainPackagePart(pkg.slice(2, 3), "version", "\x1b[106m");
			res += explainPackagePart(pkg.slice(3, 7), "serverpin", "\x1b[041m");
			break;
		case 7:
			res += explainPackagePart(pkg.slice(2, 3), "version", "\x1b[106m");
			res += explainPackagePart(pkg.slice(3, 7), "serverpin", "\x1b[041m");
			break;
		case 8:
			res += " ";
			break;
		case 9:
			res += " ";
			break;
		case 10:
			res += explainPackagePart(pkg.slice(2, 3), "version", "\x1b[106m");
			res += explainPackagePart(pkg.slice(3, 43), "pattern", "\x1b[000m");

			break;
		default:
			res = inspectBuffer(pkg);
	}
	res += ">";
	return res;
}

//#region types
type Package_decoded =
	Package_decoded_1 |
	Package_decoded_2 |
	Package_decoded_3 |
	Package_decoded_4 |
	Package_decoded_5 |
	Package_decoded_6 |
	Package_decoded_7 |
	Package_decoded_8 |
	Package_decoded_9 |
	Package_decoded_10 |
	Package_decoded_255;

type PackageData_decoded =
	PackageData_decoded_1 |
	PackageData_decoded_2 |
	PackageData_decoded_3 |
	PackageData_decoded_4 |
	PackageData_decoded_5 |
	PackageData_decoded_6 |
	PackageData_decoded_7 |
	PackageData_decoded_8 |
	PackageData_decoded_9 |
	PackageData_decoded_10 |
	PackageData_decoded_255;


interface Package_decoded_1 {
	type: 1;
	datalength ? : 8;
	data: PackageData_decoded_1;
}
interface Package_decoded_2 {
	type: 2;
	datalength ? : 4;
	data: PackageData_decoded_2;
}
interface Package_decoded_3 {
	type: 3;
	datalength ? : 5;
	data: PackageData_decoded_3;
}
interface Package_decoded_4 {
	type: 4;
	datalength ? : 0;
	data ? : PackageData_decoded_4;
}
interface Package_decoded_5 {
	type: 5;
	datalength ? : 100;
	data: PackageData_decoded_5;
}
interface Package_decoded_6 {
	type: 6;
	datalength ? : 5;
	data: PackageData_decoded_6;
}
interface Package_decoded_7 {
	type: 7;
	datalength ? : 5;
	data: PackageData_decoded_7;
}
interface Package_decoded_8 {
	type: 8;
	datalength ? : 0;
	data ? : PackageData_decoded_8;
}
interface Package_decoded_9 {
	type: 9;
	datalength ? : 0;
	data ? : PackageData_decoded_9;
}
interface Package_decoded_10 {
	type: 10;
	datalength ? : 41;
	data: PackageData_decoded_10;
}
interface Package_decoded_255 {
	type: 255;
	datalength ? : number;
	data: PackageData_decoded_255;
}
interface PackageData_decoded_1 {
	number: number;
		pin: string;
		port: string;
}
interface PackageData_decoded_2 {
	ipaddress: string;
}
interface PackageData_decoded_3 {
	number: number;
		version: number;
}
interface PackageData_decoded_4 {

}
interface PackageData_decoded_5 {
	number: number;
		name: string;
		disabled: number;
		type: number;
		hostname: string;
		ipaddress: string;
		port: string;
		extension: string;
		pin: string;
		timestamp: number;
}
interface PackageData_decoded_6 {
	version: number;
		serverpin: number;
}
interface PackageData_decoded_7 {
	version: number;
		serverpin: number;
}
interface PackageData_decoded_8 {

}
interface PackageData_decoded_9 {

}
interface PackageData_decoded_10 {
	version: number;
		pattern: string;
}
interface PackageData_decoded_255 {
	message: string;
}


type PackageData_encoded = number[] | Buffer;

interface Package_encoded {
	data ? : PackageData_encoded;
	type ? : number;
	datalength ? : number;
}

interface rawPackage {
	type: number;
		datalength: number;
		data: PackageData_encoded;
}

interface Peer {
	uid: number;
	number: number;
	name: string;
	type: number;
	hostname: string;
	ipaddress: string;
	port: string;
	extension: string;
	pin: string;
	disabled: number;
	timestamp: number;
	changed: number;
}
type peerList = Peer[];

interface server {
	uid: number;
	addresse: string;
	port: string;
}
type serverList = server[];

interface queueEntry {
	uid: number;
	server: number;
	message: number;
	timestamp: number;
}
type queue = queueEntry[];

//#endregion

class ChunkPackages extends Transform {
	public buffer = Buffer.alloc(0);
	constructor(options?){
		super(options);
	}
	public _transform(chunk:Buffer, encoding:string, callback:(err?:Error, data?:Buffer)=>void) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		
		let packageLength = (this.buffer[1]+2)||Infinity;
		while(packageLength <= this.buffer.length){
			this.push(this.buffer.slice(0,packageLength));
			this.buffer = this.buffer.slice(packageLength);
			packageLength = (this.buffer[1]+2)||Infinity;
		}
		callback();
	}
}

function encPackage(pkg: Package_decoded): Buffer {
	logger.log('iTelexCom', inspect`encoding package : ${pkg}`);
	
	if (pkg.datalength == null){
		if (pkg.type === 255){
			if(pkg.data.message!=null) pkg.datalength = pkg.data.message.length;
		}else{
			pkg.datalength = constants.PackageSizes[pkg.type];
		}
	}
	let buffer: PackageData_encoded = Buffer.alloc(pkg.datalength + 2);

	buffer[0] = pkg.type;
	buffer[1] = pkg.datalength;

	switch (pkg.type) {
		case 1:
			buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
			buffer.writeUIntLE(+pkg.data.pin || 0, 6, 2);
			buffer.writeUIntLE(+pkg.data.port || 0, 8, 2);
			break;
		case 2:
			{
				let normalizedIp = normalizeIp(pkg.data.ipaddress);
				if(normalizedIp&&normalizedIp.family === 4){
					ip.toBuffer(normalizedIp.address, buffer as any, 2); // error in @types/ip: buffer should be of type Buffer
				}
			}
			break;
		case 3:
			buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
			buffer.writeUIntLE(pkg.data.version || 0, 6, 1);
			break;
		case 4:
			break;
		case 5:
			let flags = pkg.data.disabled ? 2 : 0;

			// TODO:extract into function
			let ext = 0;
			if (!pkg.data.extension) {
				ext = 0;
			} else if (pkg.data.extension === "0") {
				ext = 110;
			} else if (pkg.data.extension === "00") {
				ext = 100;
			} else if (pkg.data.extension.toString().length === 1) {
				ext = parseInt(pkg.data.extension) + 100;
			} else {
				ext = parseInt(pkg.data.extension);
			}

			buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
			buffer.write(pkg.data.name || "", 6, 40);
			buffer.writeUIntLE(flags || 0, 46, 2);
			buffer.writeUIntLE(pkg.data.type || 0, 48, 1);
			buffer.write(pkg.data.hostname || "", 49, 40);

			{
				let normalizedIp = normalizeIp(pkg.data.ipaddress);
				if(normalizedIp&&normalizedIp.family === 4){
					ip.toBuffer(normalizedIp.address, buffer as any, 89);
				}
			}

			buffer.writeUIntLE(+pkg.data.port || 0, 93, 2);
			buffer.writeUIntLE(ext || 0, 95, 1);
			buffer.writeUIntLE(+pkg.data.pin || 0, 96, 2);
			buffer.writeUIntLE((+pkg.data.timestamp || 0) + 2208988800, 98, 4);
			break;
		case 6:
			buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
			buffer.writeUIntLE(pkg.data.serverpin || 0, 3, 4);
			break;
		case 7:
			buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
			buffer.writeUIntLE(pkg.data.serverpin || 0, 3, 4);
			break;
		case 8:
			break;
		case 9:
			break;
		case 10:
			buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
			buffer.write(pkg.data.pattern || "", 3, 40);
			break;
		case 255:
			buffer.write(pkg.data.message || "", 2, pkg.datalength);
			break;
	}
	logger.log('iTelexCom', inspect`encoded: ${(config.explainBuffers > 0 ? explainPackage(buffer) : buffer)}`);
	return buffer;
}


function decPackage(buffer: Buffer): Package_decoded {
	let pkg: Package_decoded = {
		type: buffer[0] as any,
		datalength: buffer[1] as any,
		data: null,
	};
	logger.log('iTelexCom', inspect`decoding package: ${(config.explainBuffers > 0 ? explainPackage(buffer) : buffer)}`);
	switch (pkg.type) {
		case 1:
			pkg.data = {
				number: buffer.readUIntLE(2, 4),
				pin: buffer.readUIntLE(6, 2).toString(),
				port: buffer.readUIntLE(8, 2).toString(),
			};
			break;
		case 2:
			pkg.data = {
				ipaddress: ip.toString(buffer, 2, 4),
			};
			if (pkg.data.ipaddress === "0.0.0.0") pkg.data.ipaddress = "";
			break;
		case 3:
			pkg.data = {
				number: buffer.readUIntLE(2, 4),
				version: buffer.slice(6, 7).length > 0 ? buffer.readUIntLE(6, 1) : 1, // some clients don't provide a version
				// TODO: change package length accordingly
			};
			break;
		case 4:
			pkg.data = {};
			break;
		case 5:

			let flags = buffer.readUIntLE(46, 2);

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
				number: buffer.readUIntLE(2, 4),
				name: buffer.readNullTermString("utf8", 6, 46),
				disabled: (flags & 2) === 2 ? 1 : 0,
				type: buffer.readUIntLE(48, 1),
				hostname: buffer.readNullTermString("utf8", 49, 89),
				ipaddress: ip.toString(buffer, 89, 4),
				port: buffer.readUIntLE(93, 2).toString(),
				pin: buffer.readUIntLE(96, 2).toString(),
				timestamp: buffer.readUIntLE(98, 4) - 2208988800,
				extension: null,
			};
			if (pkg.data.ipaddress === "0.0.0.0") pkg.data.ipaddress = "";
			if (pkg.data.hostname === "") pkg.data.hostname = "";

			// TODO: extract into function
			let extension: number = buffer.readUIntLE(95, 1);
			if (extension === 0) {
				pkg.data.extension = null;
			} else if (extension === 110) {
				pkg.data.extension = "0";
			} else if (extension === 100) {
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
				version: buffer.readUIntLE(2, 1),
				serverpin: buffer.readUIntLE(3, 4),
			};
			break;
		case 7:
			pkg.data = {
				version: buffer.readUIntLE(2, 1),
				serverpin: buffer.readUIntLE(3, 4),
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
				version: buffer.readUIntLE(2, 1),
				pattern: buffer.readNullTermString("utf8", 3, 43),
			};
			break;
		case 255:
			pkg.data = {
				message: buffer.readNullTermString("utf8", 2),
			};
			break;
		default:
			logger.log('warning', inspect`recieved a package of invalid/unsupported type: ${(pkg as any).type}`);
			return null;
	}
	return pkg;
}






//#region exports
export {
	//#region functions
	// getCompletePackages,
	ChunkPackages,
	decPackage,
	encPackage,

	explainPackage,
	//#endregion
	//#region interfaces
	Peer,
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
};
//#endregion
