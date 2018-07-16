"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//TODO: Object.defineProperty(Date.prototype, 'getTimezone', { value:
Object.defineProperty(Buffer.prototype, 'readNullTermString', { value: function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        // lle(highlightBuffer(this));
        // lle("start:"+start);
        // lle("end:"+end);
        // lle(highlightBuffer(this,start,end));
        let firstZero = this.indexOf(0, start);
        // lle("firstZero:"+firstZero);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        // lle("stop:"+firstZero);
        // lle(highlightBuffer(this,start,stop));
        // lle("result:\x1b[030m"+this.toString(encoding,start,stop)+"\x1b[000m\n\n");
        return this.toString(encoding, start, stop);
    }
});
Object.defineProperty(Buffer.prototype, 'writeByteArray', { value: function writeByteArray(array, offset = 0) {
        if (array.length + offset > this.length) {
            throw new RangeError("array is too big");
        }
        else {
            for (let i in array) {
                this[+i + offset] = array[i];
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
function explainData(data) {
    let str = "<Buffer";
    var packagetype;
    var datalength;
    for (let typepos = 0; typepos < data.length - 1; typepos += datalength + 2) {
        packagetype = +data[typepos];
        datalength = +data[typepos + 1];
        // lle(typepos,datalength+2,typepos+datalength+2);
        // lle(highlightBuffer(data,typepos,datalength+2));
        // lle(data.slice(typepos,typepos+datalength+2));
        let array = Array.from(data.slice(typepos, typepos + datalength + 2)).map(x => (x < 16 ? "0" : "") + x.toString(16));
        // lle(array);
        array = array.map((value, index) => index == 0 ?
            "\x1b[036m" + value + "\x1b[000m" :
            index == 1 ?
                "\x1b[032m" + value + "\x1b[000m" :
                "\x1b[000m" + value + "\x1b[000m");
        str += " " + array.join(" ");
    }
    str += ">";
    return str;
}
function inspectBuffer(buffer) {
    return Array.from(buffer).map((x => (x < 16 ? "0" : "") + x.toString(16))).join(" ");
}
function explainPackagePart(buffer, name, color) {
    if (config_js_1.default.explainBuffers > 1) {
        return ` ${color}[${name}: ${inspectBuffer(buffer)}]\x1b[000m`;
    }
    else {
        return ` [${name}: ${inspectBuffer(buffer)}]`;
    }
}
function explainPackage(pkg) {
    let res = "<Buffer";
    let packagetype = pkg[0];
    let datalength = pkg[1];
    res += explainPackagePart(Buffer.from([packagetype]), "packagetype", "\x1b[036m");
    res += explainPackagePart(Buffer.from([datalength]), "datalength", "\x1b[032m");
    switch (packagetype) {
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
    res += "]\x1b[000m>";
    return res;
}
exports.explainPackage = explainPackage;
//#region imports
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const ip = require("ip");
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const constants = require("../BINARYSERVER/constants.js");
const handles_js_1 = require("../BINARYSERVER/handles.js");
const misc = require("../BINARYSERVER/misc.js");
//#endregion
const cv = config_js_1.default.cv;
exports.cv = cv;
function handlePackage(obj, client, pool, cb) {
    if (!obj) {
        if (cv(0))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "no package to handle" + colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
    else {
        if (cv(2) && config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "state: " + colors_js_1.default.FgCyan + constants.stateNames[client.state] + "(" + client.state + ")" + colors_js_1.default.Reset);
        if (obj.packagetype == 0xff) {
            if (cv(0))
                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "remote client had error:", Buffer.from(obj.data).toString());
            if (typeof cb === "function")
                cb();
        }
        else {
            try {
                if (cv(2)) {
                    if (config_js_1.default.logITelexCom)
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling package:" + colors_js_1.default.FgCyan, obj, colors_js_1.default.FgGreen + "for: " + colors_js_1.default.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.number : client.connection.remoteAddress) + colors_js_1.default.Reset);
                }
                else if (cv(1)) {
                    if (config_js_1.default.logITelexCom)
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling packagetype:" + colors_js_1.default.FgCyan, obj.packagetype, colors_js_1.default.FgGreen + "for: " + colors_js_1.default.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.number : client.connection.remoteAddress) + colors_js_1.default.Reset);
                }
                if (typeof handles_js_1.default[obj.packagetype][client.state] == "function") {
                    if (cv(2) && config_js_1.default.logITelexCom)
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "calling handler for packagetype " + colors_js_1.default.FgCyan + constants.PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors_js_1.default.FgGreen + " in state " + colors_js_1.default.FgCyan + constants.stateNames[client.state] + "(" + client.state + ")" + colors_js_1.default.Reset);
                    try {
                        handles_js_1.default[obj.packagetype][client.state](obj, client, pool, cb);
                    }
                    catch (e) {
                        if (cv(0))
                            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                        if (typeof cb === "function")
                            cb();
                    }
                }
                else {
                    if (cv(0))
                        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "packagetype " + colors_js_1.default.FgCyan + constants.PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors_js_1.default.FgRed + " not supported in state " + colors_js_1.default.FgCyan + constants.stateNames[client.state] + "(" + client.state + ")" + colors_js_1.default.Reset);
                    if (typeof cb === "function")
                        cb();
                }
            }
            catch (e) {
                if (cv(0))
                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                if (typeof cb === "function")
                    cb();
            }
        }
    }
}
exports.handlePackage = handlePackage;
function getCompletePackages(data, part) {
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("\nextracting packages from data:");
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("data: ", data);
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("part: ", part);
    var combined = part ? Buffer.concat([part, data]) : data;
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("combined: ", combined);
    var packagetype = combined[0]; //TODO check for valid type
    var packagelength = (combined[1] != undefined ? combined[1] : Infinity) + 2;
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("packagetype: ", packagetype);
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("packagelength: ", packagelength);
    if (combined.length == packagelength) {
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll("combined.length == packagelength");
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${combined.length}${colors_js_1.default.FgGreen}/${colors_js_1.default.FgCyan}${packagelength}${colors_js_1.default.FgGreen} bytes for next package${colors_js_1.default.Reset}`);
        return [
            combined,
            new Buffer(0)
        ];
    }
    else if (combined.length > packagelength) {
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll("combined.length > packagelength");
        let rest = getCompletePackages(combined.slice(packagelength, combined.length), null);
        return [
            Buffer.concat([combined.slice(0, packagelength), rest[0]]),
            rest[1]
        ];
    }
    else if (combined.length < packagelength) {
        if (cv(2))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${combined.length}${colors_js_1.default.FgGreen}/${colors_js_1.default.FgCyan}${packagelength}${colors_js_1.default.FgGreen} bytes for next package${colors_js_1.default.Reset}`);
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll("combined.length < packagelength");
        return [
            new Buffer(0),
            combined
        ];
    }
    else {
        return ([
            new Buffer(0),
            new Buffer(0)
        ]);
    }
}
exports.getCompletePackages = getCompletePackages;
function unmapIpV4fromIpV6(ipaddress) {
    if (ip.isV4Format(ipaddress)) {
        return ipaddress;
    }
    else if (ip.isV6Format(ipaddress)) {
        if (ip.isV4Format(ipaddress.toLowerCase().split("::ffff:")[1])) {
            return ipaddress.toLowerCase().split("::ffff:")[1];
        }
        else {
            return "0.0.0.0";
        }
    }
    else {
        return "0.0.0.0";
    }
}
function encPackage(pkg) {
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "encoding:" + colors_js_1.default.FgCyan, pkg, colors_js_1.default.Reset);
    if (pkg.datalength == null)
        pkg.datalength = constants.PackageSizes[pkg.packagetype];
    var buffer = new Buffer(pkg.datalength + 2);
    buffer[0] = pkg.packagetype;
    buffer[1] = pkg.datalength;
    switch (pkg.packagetype) {
        case 1:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(+pkg.data.pin || 0, 6, 2);
            buffer.writeUIntLE(+pkg.data.port || 0, 8, 2);
            break;
        case 2:
            buffer.writeByteArray(unmapIpV4fromIpV6(pkg.data.ipaddress).split("."), 2); // .map(x=>+x)
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
            // lle("\n");
            // ll(buffer);
            // ll(pkg.data.number, 2, 4);
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            // ll(highlightBuffer(buffer, 2, 4));
            // ll(pkg.data.name, 6, 40);
            buffer.write(pkg.data.name || "", 6, 40);
            // ll(highlightBuffer(buffer, 6, 40));
            // ll(flags, 46, 2);
            buffer.writeUIntLE(flags || 0, 46, 2);
            // ll(highlightBuffer(buffer, 46, 2));
            // ll(pkg.data.type, 48, 1);
            buffer.writeUIntLE(pkg.data.type || 0, 48, 1);
            // ll(highlightBuffer(buffer, 48, 1));
            // ll(pkg.data.hostname, 49, 40);
            buffer.write(pkg.data.hostname || "", 49, 40);
            // ll(highlightBuffer(buffer, 49, 40));
            // ll(unmapIpV4fromIpV6(pkg.data.ipaddress).split("."),89);
            buffer.writeByteArray(unmapIpV4fromIpV6(pkg.data.ipaddress).split("."), 89); // .map(x=>+x)
            // ll(highlightBuffer(buffer, 89, 4));
            // ll(+pkg.data.port, 93, 2);
            buffer.writeUIntLE(+pkg.data.port || 0, 93, 2);
            // ll(highlightBuffer(buffer, 93, 2));
            // ll(ext, 95, 1);
            buffer.writeUIntLE(ext || 0, 95, 1);
            // ll(highlightBuffer(buffer, 95, 1));
            // ll(+pkg.data.pin, 96, 2);
            buffer.writeUIntLE(+pkg.data.pin || 0, 96, 2);
            // ll(highlightBuffer(buffer, 96, 2));
            // ll(pkg.data.timestamp + 2208988800, 98, 4);
            buffer.writeUIntLE((pkg.data.timestamp || 0) + 2208988800, 98, 4);
            // ll(highlightBuffer(buffer, 98, 4));
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
    }
    if (config_js_1.default.logITelexCom && cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "encoded:" + colors_js_1.default.Reset, (config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer));
    return buffer;
}
exports.encPackage = encPackage;
function decPackage(buffer) {
    let pkg = {
        packagetype: buffer[0],
        datalength: buffer[1],
        data: null
    };
    if (config_js_1.default.logITelexCom && cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "decoding package:" + colors_js_1.default.Reset, (config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer));
    switch (pkg.packagetype) {
        case 1:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                pin: buffer.readUIntLE(6, 2).toString(),
                port: buffer.readUIntLE(8, 2).toString()
            };
            break;
        case 2:
            pkg.data = {
                ipaddress: buffer.slice(2, 6).join(".")
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
                ipaddress: buffer.slice(89, 93).join("."),
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
        default:
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "invalid/unsupported packagetype: " + colors_js_1.default.FgCyan + pkg.packagetype + colors_js_1.default.Reset);
            return null;
    }
    return pkg;
}
exports.decPackage = decPackage;
function decPackages(buffer) {
    if (!(buffer instanceof Buffer))
        buffer = Buffer.from(buffer);
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "decoding data:" + colors_js_1.default.Reset, (config_js_1.default.explainBuffers ? explainData(buffer) : buffer), colors_js_1.default.Reset);
    var out = [];
    for (let typepos = 0; typepos < buffer.length - 1; typepos += datalength + 2) {
        var packagetype = +buffer[typepos];
        var datalength = +buffer[typepos + 1];
        if (packagetype in constants.PackageSizes && constants.PackageSizes[packagetype] != datalength) {
            if (cv(1) && config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgRed}size missmatch: ${constants.PackageSizes[packagetype]} != ${datalength}${colors_js_1.default.Reset}`);
            if (config_js_1.default.allowInvalidPackageSizes) {
                if (cv(1) && config_js_1.default.logITelexCom)
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgRed}using package of invalid size!${colors_js_1.default.Reset}`);
            }
            else {
                if (cv(2) && config_js_1.default.logITelexCom)
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgYellow}ignoring package, because it is of invalid size!${colors_js_1.default.Reset}`);
                continue;
            }
        }
        let pkg = decPackage(buffer.slice(typepos, typepos + datalength + 2));
        if (pkg)
            out.push(pkg);
    }
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "decoded:", colors_js_1.default.FgCyan, out, colors_js_1.default.Reset);
    return out;
}
exports.decPackages = decPackages;
function ascii(data, client, pool) {
    var number = "";
    for (let byte of data) {
        //if(cv(2)) if (config.logITelexCom) ll(String.fromCharCode(byte));
        let char = String.fromCharCode(byte);
        if (/([0-9])/.test(char))
            number += char;
    }
    if (number != "") {
        if (!isNaN(parseInt(number))) {
            if (cv(1) && config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "starting lookup for: " + colors_js_1.default.FgCyan + number + colors_js_1.default.Reset);
            misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number])
                .then(function (result) {
                if (!result || result.length == 0) {
                    let send = "";
                    send += "fail\r\n";
                    send += number + "\r\n";
                    send += "unknown\r\n";
                    send += "+++\r\n";
                    client.connection.end(send, function () {
                        if (cv(1)) {
                            let m = colors_js_1.default.FgRed + "Entry not found/visible";
                            if (cv(2))
                                m += ",\nsent:\n" + colors_js_1.default.FgCyan + send;
                            m += colors_js_1.default.Reset;
                            if (config_js_1.default.logITelexCom)
                                logWithLineNumbers_js_1.ll(m);
                        }
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
                    } /* else if (res.type == 6) {
                        send += res.hostname + "\r\n";
                    }*/
                    else {
                        send += "ERROR\r\n";
                    }
                    send += res.port + "\r\n";
                    send += (res.extension || "-") + "\r\n";
                    send += "+++\r\n";
                    client.connection.end(send, function () {
                        if (cv(1)) {
                            let m = colors_js_1.default.FgGreen + "Entry found";
                            if (cv(2))
                                m += ",\nsent:\n" + colors_js_1.default.FgCyan + send;
                            m += colors_js_1.default.Reset;
                            if (config_js_1.default.logITelexCom)
                                logWithLineNumbers_js_1.ll(m);
                        }
                    });
                }
            })
                .catch(err => logWithLineNumbers_js_1.lle(err));
        }
    }
    else {
        //TODO connection.end()?
    }
}
exports.ascii = ascii;
