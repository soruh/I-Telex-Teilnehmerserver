"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const ip = require("ip");
const config_js_1 = require("../SHARED/config.js");
const colors_js_1 = require("../SHARED/colors.js");
const constants = require("../BINARYSERVER/constants.js");
const handles_js_1 = require("../BINARYSERVER/handles.js");
const misc_js_1 = require("../SHARED/misc.js");
const stream_1 = require("stream");
//#endregion
const logger = global.logger;
Object.defineProperty(Buffer.prototype, 'readNullTermString', {
    value: function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        // logger.error(inspect`${highlightBuffer(this)}`);
        // logger.error(inspect`start: ${start}`);
        // logger.error(inspect`end:${end}`);
        // logger.error(inspect`${highlightBuffer(this,start,end)}`);
        let firstZero = this.indexOf(0, start);
        // logger.error(inspect`firstZero: ${firstZero}`);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        // logger.error(inspect`stop: ${firstZero}`);
        // logger.error(inspect`${highlightBuffer(this,start,stop)}`);
        // logger.error(inspect`result:\x1b[030m${this.toString(encoding,start,stop)}\n\n`);
        return this.toString(encoding, start, stop);
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
// function explainData(data: Buffer): string {
// 	let str = "<Buffer";
// 	var type: number;
// 	var datalength: number;
// 	for (let typepos = 0; typepos < data.length - 1; typepos += datalength + 2) {
// 		type = +data[typepos];
// 		datalength = +data[typepos + 1];
// 		let array = Array.from(data.slice(typepos, typepos + datalength + 2)).map(x => (x < 16 ? "0" : "") + x.toString(16));
// 		array = array.map((value, index) =>
// 			index == 0 ?
// 			"\x1b[036m" + value + "\x1b[000m" :
// 			index == 1 ?
// 			"\x1b[032m" + value + "\x1b[000m" :
// 			"\x1b[000m" + value + "\x1b[000m"
// 		);
// 		str += " " + array.join(" ");
// 	}
// 	str += ">";
// 	return str;
// }
function inspectBuffer(buffer) {
    return Array.from(buffer).map(x => x.toString(16).padStart(2, "0")).join(" ");
}
function explainPackagePart(buffer, name, color) {
    if (config_js_1.default.explainBuffers > 1) {
        return ` ${color}[${name}: ${inspectBuffer(buffer)}]${colors_js_1.default.Reset}`;
    }
    else {
        return ` [${name}: ${inspectBuffer(buffer)}]`;
    }
}
function explainPackage(pkg) {
    let res = (config_js_1.default.explainBuffers > 1 ? colors_js_1.default.Reset : "") + "<Buffer";
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
exports.explainPackage = explainPackage;
//#endregion
function handlePackage(obj, client) {
    return new Promise((resolve, reject) => {
        if (!obj) {
            logger.warn(misc_js_1.inspect `no package to handle`);
            resolve();
        }
        else {
            logger.verbose(misc_js_1.inspect `state: ${misc_js_1.symbolName(client.state)}`);
            try {
                logger.info(misc_js_1.inspect `handling type: ${obj.type} for: ${client.name}`);
                logger.verbose(misc_js_1.inspect `handling package: ${obj} for: ${client.name}`);
                if (typeof handles_js_1.default[obj.type][client.state] == "function") {
                    logger.verbose(misc_js_1.inspect `calling handler for type ${constants.PackageNames[obj.type]} (${obj.type}) in state ${misc_js_1.symbolName(client.state)}`);
                    try {
                        handles_js_1.default[obj.type][client.state](obj, client)
                            .then(resolve)
                            .catch(reject);
                    }
                    catch (e) {
                        logger.error(misc_js_1.inspect `${e}`);
                        resolve();
                    }
                }
                else {
                    logger.warn(misc_js_1.inspect `type ${constants.PackageNames[obj.type]} (${obj.type}) not supported in state ${misc_js_1.symbolName(client.state)}`);
                    resolve();
                }
            }
            catch (e) {
                logger.error(misc_js_1.inspect `${e}`);
                resolve();
            }
        }
    });
}
exports.handlePackage = handlePackage;
class ChunkPackages extends stream_1.Transform {
    constructor(options) {
        super(options);
        this.buffer = Buffer.alloc(0);
    }
    _transform(chunk, encoding, callback) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        let packageLength = (this.buffer[1] + 2) || Infinity;
        while (packageLength <= this.buffer.length) {
            this.push(this.buffer.slice(0, packageLength));
            this.buffer = this.buffer.slice(packageLength);
            packageLength = (this.buffer[1] + 2) || Infinity;
        }
        callback();
    }
}
exports.ChunkPackages = ChunkPackages;
function unmapIpV4fromIpV6(ipaddress) {
    if (ip.isV4Format(ipaddress)) {
        return ipaddress;
    }
    if (ip.isV6Format(ipaddress)) {
        if (ip.isV4Format(ipaddress.toLowerCase().split("::ffff:")[1])) {
            return ipaddress.toLowerCase().split("::ffff:")[1];
        }
        else {
            return "0.0.0.0";
        }
    }
    return "0.0.0.0";
}
function encPackage(pkg) {
    if (config_js_1.default.logITelexCom)
        logger.verbose(misc_js_1.inspect `encoding: ${pkg}`);
    if (pkg.datalength == null) {
        if (pkg.type == 255) {
            if (pkg.data.message != null)
                pkg.datalength = pkg.data.message.length;
        }
        else {
            pkg.datalength = constants.PackageSizes[pkg.type];
        }
    }
    var buffer = Buffer.alloc(pkg.datalength + 2);
    buffer[0] = pkg.type;
    buffer[1] = pkg.datalength;
    switch (pkg.type) {
        case 1:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(+pkg.data.pin || 0, 6, 2);
            buffer.writeUIntLE(+pkg.data.port || 0, 8, 2);
            break;
        case 2:
            ip.toBuffer(unmapIpV4fromIpV6(pkg.data.ipaddress), buffer, 2);
            break;
        case 3:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(pkg.data.version || 0, 6, 1);
            break;
        case 4:
            break;
        case 5:
            let flags = pkg.data.disabled ? 2 : 0;
            let ext = 0;
            if (!pkg.data.extension) {
                ext = 0;
            }
            else if (pkg.data.extension == "0") {
                ext = 110;
            }
            else if (pkg.data.extension == "00") {
                ext = 100;
            }
            else if (pkg.data.extension.toString().length == 1) {
                ext = parseInt(pkg.data.extension) + 100;
            }
            else {
                ext = parseInt(pkg.data.extension);
            }
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.write(pkg.data.name || "", 6, 40);
            buffer.writeUIntLE(flags || 0, 46, 2);
            buffer.writeUIntLE(pkg.data.type || 0, 48, 1);
            buffer.write(pkg.data.hostname || "", 49, 40);
            ip.toBuffer(unmapIpV4fromIpV6(pkg.data.ipaddress), buffer, 89);
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
    if (config_js_1.default.logITelexCom)
        logger.verbose(misc_js_1.inspect `encoded: ${buffer}`);
    return buffer;
}
exports.encPackage = encPackage;
function decPackage(buffer) {
    let pkg = {
        type: buffer[0],
        datalength: buffer[1],
        data: null
    };
    if (config_js_1.default.logITelexCom)
        logger.verbose(misc_js_1.inspect `decoding package: ${(config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer)}`);
    switch (pkg.type) {
        case 1:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                pin: buffer.readUIntLE(6, 2).toString(),
                port: buffer.readUIntLE(8, 2).toString()
            };
            break;
        case 2:
            pkg.data = {
                ipaddress: ip.toString(buffer, 2, 4)
            };
            if (pkg.data.ipaddress == "0.0.0.0")
                pkg.data.ipaddress = "";
            break;
        case 3:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                version: buffer.slice(6, 7).length > 0 ? buffer.readUIntLE(6, 1) : 1 //some clients don't provide a version
                //TODO: change package length accordingly
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
                disabled: (flags & 2) == 2 ? 1 : 0,
                type: buffer.readUIntLE(48, 1),
                hostname: buffer.readNullTermString("utf8", 49, 89),
                ipaddress: ip.toString(buffer, 89, 4),
                port: buffer.readUIntLE(93, 2).toString(),
                pin: buffer.readUIntLE(96, 2).toString(),
                timestamp: buffer.readUIntLE(98, 4) - 2208988800,
                extension: null
            };
            if (pkg.data.ipaddress == "0.0.0.0")
                pkg.data.ipaddress = "";
            if (pkg.data.hostname == "")
                pkg.data.hostname = "";
            let extension = buffer.readUIntLE(95, 1);
            if (extension == 0) {
                pkg.data.extension = null;
            }
            else if (extension == 110) {
                pkg.data.extension = "0";
            }
            else if (extension == 100) {
                pkg.data.extension = "00";
            }
            else if (extension > 110) {
                pkg.data.extension = null;
            }
            else if (extension > 100) {
                pkg.data.extension = (extension - 100).toString();
            }
            else if (extension < 10) {
                pkg.data.extension = "0" + extension;
            }
            else {
                pkg.data.extension = extension.toString();
            }
            break;
        case 6:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4)
            };
            break;
        case 7:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4)
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
                pattern: buffer.readNullTermString("utf8", 3, 43)
            };
            break;
        case 255:
            pkg.data = {
                message: buffer.readNullTermString("utf8", 2),
            };
            break;
        default:
            logger.error(misc_js_1.inspect `invalid/unsupported type: ${pkg.type}`);
            return null;
    }
    return pkg;
}
exports.decPackage = decPackage;
function decPackages(buffer) {
    if (!(buffer instanceof Buffer))
        buffer = Buffer.from(buffer);
    if (config_js_1.default.logITelexCom)
        logger.verbose(misc_js_1.inspect `decoding data: ${buffer}`);
    var out = [];
    for (let typepos = 0; typepos < buffer.length - 1; typepos += datalength + 2) {
        var type = +buffer[typepos];
        var datalength = +buffer[typepos + 1];
        if (type in constants.PackageSizes && constants.PackageSizes[type] != datalength) {
            if (config_js_1.default.logITelexCom)
                logger.info(misc_js_1.inspect `size missmatch: ${constants.PackageSizes[type]} != ${datalength}`);
            if (config_js_1.default.allowInvalidPackageSizes) {
                if (config_js_1.default.logITelexCom)
                    logger.info(misc_js_1.inspect `using package of invalid size!`);
            }
            else {
                if (config_js_1.default.logITelexCom)
                    logger.verbose(misc_js_1.inspect `ignoring package, because it is of invalid size!`);
                continue;
            }
        }
        let pkg = decPackage(buffer.slice(typepos, typepos + datalength + 2));
        if (pkg)
            out.push(pkg);
    }
    if (config_js_1.default.logITelexCom)
        logger.verbose(misc_js_1.inspect `decoded: ${out}`);
    return out;
}
exports.decPackages = decPackages;
function ascii(data, client) {
    var number = "";
    for (let byte of data) {
        //if (config.logITelexCom) logger.debug(inspect`${String.fromCharCode(byte)}`);
        let char = String.fromCharCode(byte);
        if (/([0-9])/.test(char))
            number += char;
    }
    if (number != "" && (!isNaN(parseInt(number)))) {
        if (config_js_1.default.logITelexCom)
            logger.info(misc_js_1.inspect `starting lookup for: ${number}`);
        misc_js_1.SqlQuery(`SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number])
            .then(function (result) {
            if (!result || result.length == 0) {
                let send = "";
                send += "fail\r\n";
                send += number + "\r\n";
                send += "unknown\r\n";
                send += "+++\r\n";
                client.connection.end /*.write*/(send, function () {
                    if (config_js_1.default.logITelexCom)
                        logger.info(misc_js_1.inspect `Entry not found/visible`);
                    if (config_js_1.default.logITelexCom)
                        logger.verbose(misc_js_1.inspect `sent:\n${send}`);
                });
            }
            else {
                let send = "";
                let res = result[0];
                send += "ok\r\n";
                send += res.number + "\r\n";
                send += res.name + "\r\n";
                send += res.type + "\r\n";
                if ([2, 4, 5].indexOf(res.type) > -1) {
                    send += res.ipaddress + "\r\n";
                }
                else if ([1, 3, 6].indexOf(res.type) > -1) {
                    send += res.hostname + "\r\n";
                }
                /* else if (res.type == 6) {
                                        send += res.hostname + "\r\n";
                                    }*/
                else {
                    send += "ERROR\r\n";
                }
                send += res.port + "\r\n";
                send += (res.extension || "-") + "\r\n";
                send += "+++\r\n";
                client.connection.end(send, function () {
                    if (config_js_1.default.logITelexCom)
                        logger.info(misc_js_1.inspect `Entry found`);
                    if (config_js_1.default.logITelexCom)
                        logger.verbose(misc_js_1.inspect `sent:\n${send}`);
                });
            }
        })
            .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
    }
    else {
        client.connection.end();
    }
}
exports.ascii = ascii;
