//TODO: impelement logITelexCom
"use strict";
function getTimezone(date) { //TODO: figure out way to not hav this in all files where it is used
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
	return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
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

import {MailOptions} from "nodemailer/lib/json-transport.js";
//#endregion

const verbosity = config.loggingVerbosity;
var cv = level => level <= verbosity; //check verbosity

const mySqlConnectionOptions = config['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;

//#region constants



//#endregion

var serverErrors = {};

interface PackageData_decoded {
    rufnummer ? : number;
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
	rufnummer:number;
	name:string;
	typ:number;
	hostname:string;
	ipaddresse:string;
	port:string;
	extension:string;
	pin:string;
	gesperrt:number;
	moddate:string;
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

      
function handlePackage(obj, cnum, pool, connection, handles, cb) {
	if (!obj) {
		if (cv(0)) lle(colors.FgRed + "no package to handle" + colors.Reset);
		if (typeof cb === "function") cb();
	} else {
		if (cv(2)) if (config.logITelexCom) ll(colors.FgGreen + "state: " + colors.FgCyan + constants.stateNames[connections.get(cnum).state] + "(" + connections.get(cnum).state + ")" + colors.Reset);
		if (obj.packagetype == 0xff) {
			if (cv(0)) lle(colors.FgRed + "remote client had error:", Buffer.from(obj.data).toString());
			if (typeof cb === "function") cb();
		} else {
			try {
				if (cv(2)) {
					if (config.logITelexCom) ll(colors.FgGreen + "handling package:" + colors.FgCyan, obj, colors.FgGreen + "for: " + colors.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.rufnummer : connection.remoteAddress) + colors.Reset);
				} else if (cv(1)) {
					if (config.logITelexCom) ll(colors.FgGreen + "handling packagetype:" + colors.FgCyan, obj.packagetype, colors.FgGreen + "for: " + colors.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.rufnummer : connection.remoteAddress) + colors.Reset);
				}
				if (typeof handles[obj.packagetype][connections.get(cnum).state] == "function") {
					if (cv(2)) if (config.logITelexCom) ll(colors.FgGreen + "calling handler for packagetype " + colors.FgCyan + constants.PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors.FgGreen + " in state " + colors.FgCyan + constants.stateNames[connections.get(cnum).state] + "(" + connections.get(cnum).state + ")" + colors.Reset);
					try {
						handles[obj.packagetype][connections.get(cnum).state](obj, cnum, pool, connection, handles, cb);
					} catch (e) {
						if (cv(0)) lle(colors.FgRed, e, colors.Reset);
						if (typeof cb === "function") cb();
					}
				} else {
					if (cv(0)) lle(colors.FgRed + "packagetype " + colors.FgCyan + constants.PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors.FgRed + " not supported in state " + colors.FgCyan + constants.stateNames[connections.get(cnum).state] + "(" + connections.get(cnum).state + ")" + colors.Reset);
					if (typeof cb === "function") cb();
				}
			} catch (e) {
				if (cv(0)) lle(colors.FgRed, e, colors.Reset);
				if (typeof cb === "function") cb();
			}
		}
	}
}

function checkFullPackage(buffer, part?) {
	//if(cv(2)) if (config.logITelexCom) ll(part);
	//if(cv(2)) if (config.logITelexCom) ll(buffer);
	buffer = Array.prototype.slice.call(buffer, 0); //TODO find out what this does
	var data = buffer;
	if (part) data = part.concat(buffer);
	//if(cv(2)) if (config.logITelexCom) ll(data);
	var packagetype = data[0];
	var packagelength = data[1] + 2;
	if (data.length == packagelength) {
		return [data, []];
	} else if (data.length > packagelength) {
		let res = checkFullPackage(data.slice(packagelength + 1, data.length));
		return [
			data.slice(0, packagelength).concat(res[0]),
			res[1]
		];
	} else if (data.length < packagelength) {
		return [
			[], data
		];
	} else {
		return ([
			[],
			[]
		]);
	}
} //return(data, part)
/*
function encPackage(obj) {
	if (cv(2)) if (config.logITelexCom) ll(colors.FgGreen + "encoding:" + colors.FgCyan, obj, colors.Reset);
	var data = obj.data;
	var array;
	switch (obj.packagetype) {
		case 1:
			array = ValueToBytearray(data.rufnummer, 4)
				.concat(ValueToBytearray(data.pin, 2))
				.concat(ValueToBytearray(data.port, 2));
			if (obj.datalength == null) obj.datalength = 8;
			break;
		case 2:
			data.ipaddresse = ip.isV4Format(data.ipaddresse) ? data.ipaddresse : (ip.isV6Format(data.ipaddresse) ? (ip.isV4Format(data.ipaddresse.split("::")[1]) ? data.ipaddresse.split("::")[1] : "") : "");
			var iparr = data.ipaddresse == null ? [] : data.ipaddresse.split(".");
			var numip = 0;
			for (let i in iparr) {
				numip += iparr[i] * Math.pow(2, (i * 8));
			}
			array = ValueToBytearray(numip, 4);
			if (obj.datalength == null) obj.datalength = 4;
			break;
		case 3:
			array = ValueToBytearray(data.rufnummer, 4)
				.concat(ValueToBytearray(data.version, 1));
			if (obj.datalength == null) obj.datalength = 5;
			break;
		case 4:
			array = [];
			if (obj.datalength == null) obj.datalength = 0;
			break;
		case 5:
			let flags = data.gesperrt * 2;
			var iparr = data.ipaddresse == null ? [] : data.ipaddresse.split(".");
			var numip = 0;
			for (let i in iparr) {
				numip += iparr[i] * Math.pow(2, (i * 8));
			}

			let ext;
			if (data.extension == "" || data.extension == null) {
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

			array = ValueToBytearray(data.rufnummer, 4)
				.concat(ValueToBytearray(data.name, 40))
				.concat(ValueToBytearray(flags, 2))
				.concat(ValueToBytearray(data.typ, 1))
				.concat(ValueToBytearray(data.hostname, 40))
				.concat(ValueToBytearray(numip, 4))
				.concat(ValueToBytearray(parseInt(data.port), 2))
				.concat(ValueToBytearray(ext, 1))
				.concat(ValueToBytearray(parseInt(data.pin), 2))
				.concat(ValueToBytearray(parseInt(data.moddate) + 2208988800, 4));
			if (obj.datalength == null) obj.datalength = 100;
			break;
		case 6:
			array = ValueToBytearray(data.version, 1)
				.concat(ValueToBytearray(config.serverPin, 4));
			if (obj.datalength == null) obj.datalength = 5;
			break;
		case 7:
			array = ValueToBytearray(data.version, 1)
				.concat(ValueToBytearray(config.serverPin, 4));
			if (obj.datalength == null) obj.datalength = 5;
			break;
		case 8:
			array = [];
			if (obj.datalength == null) obj.datalength = 0;
			break;
		case 9:
			array = [];
			if (obj.datalength == null) obj.datalength = 0;
			break;
		case 10:
			// array = ValueToBytearray(data.version,1)
			// .concat(ValueToBytearray(data.pattern,40));
			array = ValueToBytearray(data.pattern, 40)
				.concat(ValueToBytearray(data.version, 1));
			if (obj.datalength == null) obj.datalength = 41;
			break;
		default:
			array = [];
	}
	var header = [obj.packagetype, array.length];
	if (array.length != obj.datalength) {
		if (cv(0)) lle("Buffer had unexpected size:\n" + array.length + " != " + obj.datalength);
		return (Buffer.from([]));
	}
	if (cv(2)) if (config.logITelexCom) ll(colors.FgGreen + "encoded:" + colors.FgCyan, Buffer.from(header.concat(array)), colors.Reset);
	return Buffer.from(header.concat(array));
}

function decPackage(packagetype, buffer) {
	let data;
	switch (packagetype) {
		case 1:
			data = {
				rufnummer: BytearrayToValue(buffer.slice(0, 4), "number"),
				pin: BytearrayToValue(buffer.slice(4, 6), "number"),
				port: BytearrayToValue(buffer.slice(6, 8), "number")
			};
			break;
		case 2:
			data = {
				ipaddresse: BytearrayToValue(buffer.slice(0, 4), "ip")
			};
			break;
		case 3:
			data = {
				rufnummer: BytearrayToValue(buffer.slice(0, 4), "number")
			};
			if (buffer.slice(4, 5).length > 0) {
				data.version = BytearrayToValue(buffer.slice(4, 5), "number");
			} else {
				data.version = 1;
			}
			break;
		case 4:
			data = {};
			break;
		case 5:

			var flags = buffer.slice(44, 46);

			data = {
				rufnummer: BytearrayToValue(buffer.slice(0, 4), "number"),
				name: BytearrayToValue(buffer.slice(4, 44), "string"),
				gesperrt: flags[0] / 2,
				typ: BytearrayToValue(buffer.slice(46, 47), "number"),
				addresse: BytearrayToValue(buffer.slice(47, 87), "string"),
				ipaddresse: BytearrayToValue(buffer.slice(87, 91), "ip"),
				port: BytearrayToValue(buffer.slice(91, 93), "number"),
				durchwahl: BytearrayToValue(buffer.slice(93, 94), "number"),
				pin: BytearrayToValue(buffer.slice(94, 96), "number"),
				timestamp: BytearrayToValue(buffer.slice(96, 100), "number") - 2208988800
			};
			if (data.durchwahl == 0) {
				data.durchwahl = null;
			} else if (data.durchwahl == 110) {
				data.durchwahl = "0";
			} else if (data.durchwahl == 100) {
				data.durchwahl = "00";
			} else if (data.durchwahl > 110) {
				data.durchwahl = null;
			} else if (data.durchwahl > 100) {
				data.durchwahl = (data.durchwahl - 100).toString();
			} else if (data.durchwahl < 10) {
				data.durchwahl = "0" + data.durchwahl;
			} else {
				data.durchwahl = data.durchwahl.toString();
			}

			break;
		case 6:
			data = {
				version: BytearrayToValue(buffer.slice(0, 1), "number"),
				serverpin: BytearrayToValue(buffer.slice(1, 5), "number")
			};
			break;
		case 7:
			data = {
				version: BytearrayToValue(buffer.slice(0, 1), "number"),
				serverpin: BytearrayToValue(buffer.slice(1, 5), "number")
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
				version: BytearrayToValue(buffer.slice(0, 1), "number"),
				pattern: BytearrayToValue(buffer.slice(1, 41), "string")
				//pattern:BytearrayToValue(buffer.slice(0,40),"string"),
				//version:BytearrayToValue(buffer.slice(40,41),"number")
			};
			break;
		default:
			if (cv(1)) lle("invalid/unsupported packagetype: " + packagetype);
			data = false;
			break;
	}
	return (data);
}

function decData(buffer) {
	if (cv(2)) if (config.logITelexCom) ll(colors.FgGreen + "decoding:", colors.FgCyan, Buffer.from(buffer), colors.Reset);
	var out = [];
	for (var typepos = 0; typepos < buffer.length - 1; typepos += datalength + 2) {
		var packagetype = parseInt(buffer[typepos], 10);
		var datalength = parseInt(buffer[typepos + 1], 10);

		var blockdata = [];
		for (let i = 0; i < datalength; i++) {
			blockdata[i] = buffer[typepos + 2 + i];
		}
		var data = decPackage(packagetype, blockdata);
		if (data) {
			if (PackageSizes[packagetype] != datalength) {
				if (cv(1)) if (config.logITelexCom) ll(`${colors.FgRed}size missmatch: ${PackageSizes[packagetype]} != ${datalength}${colors.Reset}`);
				if (config.allowInvalidPackageSizes) {
					if (cv(2)) if (config.logITelexCom) ll(`${colors.FgRed}handling package of invalid size!${colors.Reset}`);
				} else {
					if (cv(2)) if (config.logITelexCom) ll(`${colors.FgYellow}not handling package.${colors.Reset}`);
					continue;
				}
			}
			out.push({
				packagetype: packagetype,
				datalength: datalength,
				data: data
			});
		} else {
			if (cv(1)) lle("error, no data");
		}
	}
	if (cv(2)) if (config.logITelexCom) ll(colors.FgGreen + "decoded:", colors.FgCyan, out, colors.Reset);
	return (out);
}
*/
function encPackage(obj:Package_decoded):Buffer{
    if (config.logITelexCom) ll(colors.FgGreen + "encoding:" + colors.FgCyan, obj, colors.Reset);
    var data:PackageData_decoded = obj.data;
    var array:PackageData_encoded = [];

    var iparr: number[] = [];
    var numip: number = 0;
    switch (obj.packagetype) {
        case 1:
            array = ValueToBytearray(data.rufnummer, 4)
                .concat(ValueToBytearray(data.pin, 2))
                .concat(ValueToBytearray(data.port, 2));
            if (obj.datalength == null) obj.datalength = 8;
            break;
        case 2:
            data.ipaddress = ip.isV4Format(data.ipaddress) ? data.ipaddress : (ip.isV6Format(data.ipaddress) ? (ip.isV4Format(data.ipaddress.split("::")[1]) ? data.ipaddress.split("::")[1] : "") : "");
            iparr = data.ipaddress == null ? [] : data.ipaddress.split(".").map(byte => +byte);
            numip = 0;
            for (let i in iparr) {
                numip += iparr[i] * Math.pow(2, (+i * 8));
            }
            array = ValueToBytearray(numip, 4);
            if (obj.datalength == null) obj.datalength = 4;
            break;
        case 3:
            array = ValueToBytearray(data.rufnummer, 4)
                .concat(ValueToBytearray(data.version, 1));
            if (obj.datalength == null) obj.datalength = 5;
            break;
        case 4:
            array = [];
            if (obj.datalength == null) obj.datalength = 0;
            break;
        case 5:
            let flags = data.disabled * 2;

            iparr = data.ipaddress == null ? [] : data.ipaddress.split(".").map(x=>+x);
            numip = 0;
            for (let i=0;i<4;i++) {
                numip += iparr[i] << i*8;
            }

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

            array = ValueToBytearray(data.rufnummer, 4)
                .concat(ValueToBytearray(data.name, 40))
                .concat(ValueToBytearray(flags, 2))
                .concat(ValueToBytearray(data.type, 1))
                .concat(ValueToBytearray(data.hostname, 40))
                .concat(ValueToBytearray(numip, 4))
                .concat(ValueToBytearray(data.port, 2))
                .concat(ValueToBytearray(ext, 1))
                .concat(ValueToBytearray(data.pin, 2))
                .concat(ValueToBytearray(data.timestamp + 2208988800, 4));
            if (obj.datalength == null) obj.datalength = 100;
            break;
        case 6:
            array = ValueToBytearray(data.version, 1)
                .concat(ValueToBytearray(config.serverPin, 4));
            if (obj.datalength == null) obj.datalength = 5;
            break;
        case 7:
            array = ValueToBytearray(data.version, 1)
                .concat(ValueToBytearray(config.serverPin, 4));
            if (obj.datalength == null) obj.datalength = 5;
            break;
        case 8:
            array = [];
            if (obj.datalength == null) obj.datalength = 0;
            break;
        case 9:
            array = [];
            if (obj.datalength == null) obj.datalength = 0;
            break;
        case 10:
            // array = ValueToBytearray(data.version,1)
            // .concat(ValueToBytearray(data.pattern,40));
            array = ValueToBytearray(data.version, 1)
                .concat(ValueToBytearray(data.pattern, 40));
            if (obj.datalength == null) obj.datalength = 41;
            break;
    }
    var header = [obj.packagetype, array.length];
    if (array.length != obj.datalength) {
        lle("Buffer had unexpected size:\n" + array.length + " != " + obj.datalength);
        return Buffer.from([]);
    }
    if (config.logITelexCom) ll(colors.FgGreen + "encoded:" + colors.FgCyan, Buffer.from(header.concat(array)), colors.Reset);
    return Buffer.from(header.concat(array));
}

function decPackageData(packagetype: number, buffer:Buffer|number[]): PackageData_decoded {
    var data: PackageData_decoded;
    switch (packagetype) {
        case 1:
            data = {
                rufnummer: < number > BytearrayToValue(buffer.slice(0, 4), "number"),
                pin: < string > BytearrayToValue(buffer.slice(4, 6), "number").toString(),
                port: < string > BytearrayToValue(buffer.slice(6, 8), "number").toString()
            };
            break;
        case 2:
            data = {
                ipaddress: < string > BytearrayToValue(buffer.slice(0, 4), "ip")
            };
            break;
        case 3:
            data = {
                rufnummer: < number > BytearrayToValue(buffer.slice(0, 4), "number")
            };
            if (buffer.slice(4, 5).length > 0) {
                data.version = < number > BytearrayToValue(buffer.slice(4, 5), "number");
            } else {
                data.version = 1;
            }
            break;
        case 4:
            data = {};
            break;
        case 5:

            let flags = buffer.slice(44, 46);

            data = {
                rufnummer: < number > BytearrayToValue(buffer.slice(0, 4), "number"),
                name: < string > BytearrayToValue(buffer.slice(4, 44), "string"),
                disabled: flags[0] & 1,
                type: < number > BytearrayToValue(buffer.slice(46, 47), "number"),
                hostname: < string > BytearrayToValue(buffer.slice(47, 87), "string"),
                ipaddress: < string > BytearrayToValue(buffer.slice(87, 91), "ip"),
                port: < string > BytearrayToValue(buffer.slice(6, 8), "number").toString(),
                pin: < string > BytearrayToValue(buffer.slice(4, 6), "number").toString(),
                timestamp: < number > BytearrayToValue(buffer.slice(96, 100), "number") - 2208988800
            };

            let extension:number = < number > BytearrayToValue(buffer.slice(93, 94), "number");
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
                version: < number > BytearrayToValue(buffer.slice(0, 1), "number"),
                serverpin: < number > BytearrayToValue(buffer.slice(1, 5), "number")
            };
            break;
        case 7:
            data = {
                version: < number > BytearrayToValue(buffer.slice(0, 1), "number"),
                serverpin: < number > BytearrayToValue(buffer.slice(1, 5), "number")
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
                version: < number > BytearrayToValue(buffer.slice(0, 1), "number"),
                pattern: < string > BytearrayToValue(buffer.slice(1, 41), "string")
                //pattern:BytearrayToValue(buffer.slice(0,40),"string"),
                //version:BytearrayToValue(buffer.slice(40,41),"number")
            };
            break;
        default:
            lle("invalid/unsupported packagetype: " + packagetype);
            data = {};
            break;
    }
    return data;
}

function decPackages(buffer:number[]|Buffer): Package_decoded[] {
    if (config.logITelexCom) ll(colors.FgGreen + "decoding:", colors.FgCyan, buffer, colors.Reset);
    var typepos: number = 0;
    var out: Package_decoded[] = [];
    while (typepos < buffer.length - 1) {
        var packagetype: number = +buffer[typepos];
        var datalength: number = +buffer[typepos + 1];
        var blockdata: number[] = [];
        for (let i = 0; i < datalength; i++) {
            blockdata[i] = buffer[typepos + 2 + i];
        }
        var data: PackageData_decoded = decPackageData(packagetype, blockdata);
        if (data) {
            out.push({
                packagetype: packagetype,
                datalength: datalength,
                data: data
            });
        } else {
            lle("error, no data");
        }
        typepos += datalength + 2;
    }
    if (config.logITelexCom) ll(colors.FgGreen + "decoded:", colors.FgCyan, out, colors.Reset);
    return out;
}

/*

function BytearrayToValue(arr, type) {
	if (type === "number") {
		var num = 0;
		for (let i = arr.length - 1; i >= 0; i--) {
			num *= 256;
			num += arr[i];
		}
		return (num);
	} else if (type === "string") {
		var str = "";
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] != 0) {
				str += String.fromCharCode(arr[i]);
			} else {
				break;
			}
		}
		return (str.replace(/(\u0000)/g, ""));
	} else if (type === "ip") {
		let numip = BytearrayToValue(arr, "number");
		if (numip == 0) {
			return (null);
		} else {
			let str = "";
			for (let i = 0; i < 4; i++) {
				str += ((numip >> (8 * i)) & 255) + (i == 3 ? "" : ".");
			}
			return (str);
		}
	}
}

function ValueToBytearray(value, size) {
	//if(cv(2)) if (config.logITelexCom) ll(value);
	var array = [];
	if (typeof value === "string") {
		for (let i = 0; i < value.length; i++) {
			array[i] = value.charCodeAt(i);
		}
	} else if (typeof value === "number") {
		while (value > 0) {
			array[array.length] = value % 256;
			value = Math.floor(value / 256);
		}
	}
	if (array.length > size || array.length == undefined) {
		if (cv(0)) lle("Value " + value + " turned into a bigger than expecte Bytearray!\n" + array.length + " > " + size);
	}
	while (array.length < size) {
		array[array.length] = 0;
	}
	return (array);
}

*/

function BytearrayToValue(arr:number[]|Buffer, type:string):string|number{
    if (type === "number") {
        var num = 0;
        for (let i = arr.length - 1; i >= 0; i--) {
            num *= 256;
            num += arr[i];
        }
        return (num);
    } else if (type === "string") {
        var str = "";
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] != 0) {
                str += String.fromCharCode(arr[i]);
            } else {
                break;
            }
        }
        return (str.replace(/(\u0000)/g, ""));
    } else if (type === "ip") {
        let numip: number = < number > BytearrayToValue(arr, "number");
        if (numip == 0) {
            return (null);
        } else {
            let str = "";
            for (let i = 0; i < 4; i++) {
                str += ((numip >> (8 * i)) & 255) + (i == 3 ? "" : ".");
            }
            return (str);
        }
    }
}

function ValueToBytearray(value:string|number, size:number):number[]{
    //if(cv(2)) if (config.logITelexCom) ll(value);
    let array = [];
    if (typeof value === "string") {
        for (let i = 0; i < value.length; i++) {
            array[i] = value.charCodeAt(i);
        }
    } else if (typeof value === "number") {
        while (value > 0) {
            array[array.length] = value % 256;
            value = Math.floor(value / 256);
        }
    }
    if (array.length > size || array.length == undefined) {
        lle("Value " + value + " turned into a bigger than expecte Bytearray!\n" + array.length + " > " + size);
    }
    while (array.length < size) {
        array[array.length] = 0;
    }
    return (array);
}

function increaseErrorCounter(transporter, serverkey, error, code) {
	let exists = Object.keys(serverErrors).findIndex(k => k == serverkey) > -1;
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
	let warn = config.warnAtErrorCounts.indexOf(serverErrors[serverkey].errorCounter) > -1;
	if (cv(1)) lle(`${colors.FgYellow}increased errorCounter for server ${colors.FgCyan}${serverkey}${colors.FgYellow} to ${warn?colors.FgRed:colors.FgCyan}${serverErrors[serverkey].errorCounter}${colors.Reset}`);
	if (warn) {
		sendEmail(transporter, "ServerError", {
			"[server]": serverkey,
			"[errorCounter]": serverErrors[serverkey].errorCounter,
			"[lastError]": serverErrors[serverkey].errors.slice(-1)[0].code,
			"[date]": new Date().toLocaleString(),
			"[timeZone]": getTimezone(new Date())
		}, function () {});
	}
}



function ascii(data, connection, pool:mysql.Pool|mysql.Connection) {
	var number:string = "";
	for (let byte of data) {
		//if(cv(2)) if (config.logITelexCom) ll(String.fromCharCode(byte));
		let char = String.fromCharCode(byte);
		if (/([0-9])/.test(char)) number += char;
	}
	if (number != "") {
		if (!isNaN(parseInt(number))) {
			if (cv(1)) if (config.logITelexCom) ll(colors.FgGreen + "starting lookup for: " + colors.FgCyan + number + colors.Reset);
			SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer=? and gesperrt!=1 and typ!=0;`, [number], function (result:peerList) {
				if (!result || result.length == 0) {
					let send:string = "";
					send += "fail\r\n";
					send += number + "\r\n";
					send += "unknown\r\n";
					send += "+++\r\n";
					connection.write(send, function () {
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
					send += res.rufnummer + "\r\n";
					send += res.name + "\r\n";
					send += res.typ + "\r\n";
					if (res.typ in [2,4,5]) {
						send += res.ipaddresse + "\r\n";
					} else if (res.typ in [1,3,6]) {
						send += res.hostname + "\r\n";
					}/* else if (res.typ == 6) {
						send += res.hostname + "\r\n";
					}*/ else{
						send += "\r\n";
					}
					send += res.port + "\r\n";
					send += (res.extension || "-") + "\r\n";
					send += "+++\r\n";
					connection.write(send, function () {
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

function SqlQuery(sqlPool:mysql.Pool|mysql.Connection, query:string, options:any[], callback:(res:any)=>void) { //TODO: any-> real type
	if(cv(3)){
		if (config.logITelexCom) ll(colors.BgLightCyan+colors.FgBlack+query,options,colors.Reset);
	}

	query = query.replace(/\n/g,"").replace(/\s+/g," ");
	query = mysql.format(query, options);
	if (cv(2) || (cv(1)&&/(update)|(insert)/gi.test(query))) llo(1, colors.BgLightBlue + colors.FgBlack + query + colors.Reset);
	sqlPool.query(query, function (err, res) {
		if(sqlPool["_allConnections"]&&sqlPool["_allConnections"].length){
			if (cv(3)) if (config.logITelexCom) ll("number of open connections: " + sqlPool["_allConnections"].length);
		}else{
			if (cv(2)) if (config.logITelexCom) ll("not a pool");
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

type MailTransporter = nodemailer.Transporter|{
	sendMail: (...rest:any[])=>void,
	options: {
		host: string
	}
}

function sendEmail(transporter:MailTransporter, messageName:string, values, callback) {
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
		if(message.html == ""){
			type = "text";
		}else if(message.text == ""){
			type = "html";
		}else{
			type = null;
			mailOptions.text = "configuration error in config.json";
		}
		if(type){
			mailOptions[type] = message[type];
			for (let k in values) {
				mailOptions[type] = mailOptions[type].replace(new RegExp(k.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g"), values[k]);
			}
		}
		if (cv(2)) {
			if (config.logITelexCom) ll("sending mail:\n", mailOptions, "\nto server", transporter.options["host"]);
		} else if (cv(1)) {
			if (config.logITelexCom) ll(`${colors.FgGreen}sending email of type ${colors.FgCyan+messageName||"config error(text)"+colors.Reset}`);
		}
		
		(<(MailOptions: MailOptions,callback:(err: Error,info:any)=>void)=>void>transporter.sendMail)(mailOptions, function (error, info) {
			if (error) {
				if (cv(2)) lle(error);
				if (typeof callback === "function") callback();
			} else {
				if (cv(1)) if (config.logITelexCom) ll('Message sent:', info.messageId);
				if (config.eMail.useTestAccount) if (config.logITelexCom) ll('Preview URL:', nodemailer.getTestMessageUrl(info));
				if (typeof callback === "function") callback();
			}
		});
	}
}

//#region exports
export{
//#region functions
	checkFullPackage,
	BytearrayToValue,
	ValueToBytearray,
	handlePackage,
	decPackageData,
	encPackage,
	sendEmail,
	SqlQuery,
	decPackages,
	increaseErrorCounter,
	ascii,
	cv,
//#endregion
//#region variables
	connections,
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