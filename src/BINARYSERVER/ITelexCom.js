"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//TODO: Object.defineProperty(Date.prototype, 'getTimezone', { value:
function getTimezone(date) {
    let offset = -1 * date.getTimezoneOffset();
    let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
    return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}
Object.defineProperty(Buffer.prototype, 'readNullTermString', { value: function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        // console.log(highlightBuffer(this));
        // console.log("start:"+start);
        // console.log("end:"+end);
        // console.log(highlightBuffer(this,start,end));
        let firstZero = this.indexOf(0, start);
        // console.log("firstZero:"+firstZero);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        // console.log("stop:"+firstZero);
        // console.log(highlightBuffer(this,start,stop));
        // console.log("result:\x1b[030m"+this.toString(encoding,start,stop)+"\x1b[000m\n\n");
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
        // console.log(typepos,datalength+2,typepos+datalength+2);
        // console.log(highlightBuffer(data,typepos,datalength+2));
        // console.log(data.slice(typepos,typepos+datalength+2));
        let array = Array.from(data.slice(typepos, typepos + datalength + 2)).map(x => (x < 16 ? "0" : "") + x.toString(16));
        // console.log(array);
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
        return ` ${color}${inspectBuffer(buffer)}\x1b[000m`;
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
//#region imports
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const util = require("util");
const mysql = require("mysql");
const async = require("async");
const ip = require("ip");
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const constants = require("../BINARYSERVER/constants.js");
const nodemailer = require("nodemailer");
const handles_js_1 = require("../BINARYSERVER/handles.js");
const transporter_js_1 = require("../BINARYSERVER/transporter.js");
const dns_1 = require("dns");
//#endregion
const verbosity = config_js_1.default.loggingVerbosity;
const cv = level => level <= verbosity; //check verbosity
exports.cv = cv;
const mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;
//#region constants
//#endregion
var serverErrors = {};
exports.serverErrors = serverErrors;
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
    var buffer = part ? Buffer.concat([part, data]) : data;
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("combined: ", buffer);
    var packagetype = buffer[0]; //TODO check for valid type
    var packagelength = buffer[1] + 2;
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("packagetype: ", packagetype);
    if (cv(3))
        if (config_js_1.default.logITelexCom)
            logWithLineNumbers_js_1.ll("packagelength: ", packagelength);
    if (buffer.length == packagelength) {
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll("buffer.length == packagelength");
        return [
            buffer,
            new Buffer(0)
        ];
    }
    else if (buffer.length > packagelength) {
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll("buffer.length > packagelength");
        let rest = getCompletePackages(buffer.slice(packagelength, buffer.length), null);
        return [
            Buffer.concat([buffer.slice(0, packagelength), rest[0]]),
            rest[1]
        ];
    }
    else if (buffer.length < packagelength) {
        if (cv(3))
            if (config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll("buffer.length < packagelength");
        return [
            new Buffer(0),
            buffer
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
function encPackage(obj) {
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "encoding:" + colors_js_1.default.FgCyan, obj, colors_js_1.default.Reset);
    var data = obj.data;
    var buffer = new Buffer(obj.datalength + 2);
    buffer[0] = obj.packagetype;
    buffer[1] = obj.datalength;
    switch (obj.packagetype) {
        case 1:
            buffer.writeUIntLE(data.number, 2, 4);
            buffer.writeUIntLE(+data.pin, 6, 2);
            buffer.writeUIntLE(+data.port, 8, 2);
            break;
        case 2:
            buffer.writeByteArray(unmapIpV4fromIpV6(data.ipaddress).split("."), 2); // .map(x=>+x)
            break;
        case 3:
            buffer.writeUIntLE(data.number, 2, 4);
            buffer.writeUIntLE(data.version, 6, 1);
            break;
        case 4:
            break;
        case 5:
            let flags = data.disabled ? 2 : 0;
            let ext = 0;
            if (!data.extension) {
                ext = 0;
            }
            else if (data.extension == "0") {
                ext = 110;
            }
            else if (data.extension == "00") {
                ext = 100;
            }
            else if (data.extension.toString().length == 1) {
                ext = parseInt(data.extension) + 100;
            }
            else {
                ext = parseInt(data.extension);
            }
            // console.log("\n");
            // ll(buffer);
            // ll(data.number, 2, 4);
            buffer.writeUIntLE(data.number, 2, 4);
            // ll(highlightBuffer(buffer, 2, 4));
            // ll(data.name, 6, 40);
            buffer.write(data.name, 6, 40);
            // ll(highlightBuffer(buffer, 6, 40));
            // ll(flags, 46, 2);
            buffer.writeUIntLE(flags, 46, 2);
            // ll(highlightBuffer(buffer, 46, 2));
            // ll(data.type, 48, 1);
            buffer.writeUIntLE(data.type, 48, 1);
            // ll(highlightBuffer(buffer, 48, 1));
            // ll(data.hostname, 49, 40);
            buffer.write(data.hostname, 49, 40);
            // ll(highlightBuffer(buffer, 49, 40));
            // ll(unmapIpV4fromIpV6(data.ipaddress).split("."),89);
            buffer.writeByteArray(unmapIpV4fromIpV6(data.ipaddress).split("."), 89); // .map(x=>+x)
            // ll(highlightBuffer(buffer, 89, 4));
            // ll(+data.port, 93, 2);
            buffer.writeUIntLE(+data.port, 93, 2);
            // ll(highlightBuffer(buffer, 93, 2));
            // ll(ext, 95, 1);
            buffer.writeUIntLE(ext || 0, 95, 1);
            // ll(highlightBuffer(buffer, 95, 1));
            // ll(+data.pin, 96, 2);
            buffer.writeUIntLE(+data.pin, 96, 2);
            // ll(highlightBuffer(buffer, 96, 2));
            // ll(data.timestamp + 2208988800, 98, 4);
            buffer.writeUIntLE(data.timestamp + 2208988800, 98, 4);
            // ll(highlightBuffer(buffer, 98, 4));
            break;
        case 6:
            buffer.writeUIntLE(data.version, 2, 1);
            buffer.writeUIntLE(data.serverpin, 3, 4);
            break;
        case 7:
            buffer.writeUIntLE(data.version, 2, 1);
            buffer.writeUIntLE(data.serverpin, 3, 4);
            break;
        case 8:
            break;
        case 9:
            break;
        case 10:
            buffer.writeUIntLE(data.version, 2, 1);
            buffer.write(data.pattern, 3, 40);
            break;
    }
    if (config_js_1.default.logITelexCom && cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "encoded:" + colors_js_1.default.Reset, (config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer));
    return buffer;
}
exports.encPackage = encPackage;
function decPackage(buffer) {
    var data;
    let packagetype = buffer[0];
    let datalength = buffer[1];
    if (config_js_1.default.logITelexCom && cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "decoding package:" + colors_js_1.default.Reset, (config_js_1.default.explainBuffers > 0 ? explainPackage(buffer) : buffer));
    switch (packagetype) {
        case 1:
            data = {
                number: buffer.readUIntLE(2, 4),
                pin: buffer.readUIntLE(6, 2).toString(),
                port: buffer.readUIntLE(8, 2).toString()
            };
            break;
        case 2:
            data = {
                ipaddress: buffer.slice(2, 6).join(".")
            };
            if (data.ipaddress == "0.0.0.0")
                data.ipaddress = "";
            break;
        case 3:
            data = {
                number: buffer.readUIntLE(2, 4),
            };
            if (buffer.slice(6, 7).length > 0) {
                data.version = buffer.readUIntLE(6, 1);
            }
            else {
                data.version = 1;
            }
            break;
        case 4:
            data = {};
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
            data = {
                number: buffer.readUIntLE(2, 4),
                name: buffer.readNullTermString("utf8", 6, 46),
                disabled: (flags & 2) == 2 ? 1 : 0,
                type: buffer.readUIntLE(48, 1),
                hostname: buffer.readNullTermString("utf8", 49, 89),
                ipaddress: buffer.slice(89, 93).join("."),
                port: buffer.readUIntLE(93, 2).toString(),
                pin: buffer.readUIntLE(96, 2).toString(),
                timestamp: buffer.readUIntLE(98, 4) - 2208988800
            };
            if (data.ipaddress == "0.0.0.0")
                data.ipaddress = "";
            if (data.hostname == "")
                data.hostname = "";
            let extension = buffer.readUIntLE(95, 1);
            if (extension == 0) {
                data.extension = null;
            }
            else if (extension == 110) {
                data.extension = "0";
            }
            else if (extension == 100) {
                data.extension = "00";
            }
            else if (extension > 110) {
                data.extension = null;
            }
            else if (extension > 100) {
                data.extension = (extension - 100).toString();
            }
            else if (extension < 10) {
                data.extension = "0" + extension;
            }
            else {
                data.extension = extension.toString();
            }
            break;
        case 6:
            data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4)
            };
            break;
        case 7:
            data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4)
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
                version: buffer.readUIntLE(2, 1),
                pattern: buffer.readNullTermString("utf8", 3, 43)
            };
            break;
        default:
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "invalid/unsupported packagetype: " + colors_js_1.default.FgCyan + packagetype + colors_js_1.default.Reset);
            return null;
    }
    return {
        packagetype,
        datalength,
        data
    };
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
function increaseErrorCounter(serverkey, error, code) {
    let exists = Object.keys(serverErrors).findIndex(k => k == serverkey) > -1;
    if (exists) {
        serverErrors[serverkey].errors.push({
            error: error,
            code: code,
            timeStamp: Date.now()
        });
        serverErrors[serverkey].errorCounter++;
    }
    else {
        serverErrors[serverkey] = {
            errors: [{
                    error: error,
                    code: code,
                    timeStamp: Date.now()
                }],
            errorCounter: 1
        };
    }
    let warn = config_js_1.default.warnAtErrorCounts.indexOf(serverErrors[serverkey].errorCounter) > -1;
    if (cv(1))
        logWithLineNumbers_js_1.lle(`${colors_js_1.default.FgYellow}increased errorCounter for server ${colors_js_1.default.FgCyan}${serverkey}${colors_js_1.default.FgYellow} to ${warn ? colors_js_1.default.FgRed : colors_js_1.default.FgCyan}${serverErrors[serverkey].errorCounter}${colors_js_1.default.Reset}`);
    if (warn) {
        sendEmail("ServerError", {
            "[server]": serverkey,
            "[errorCounter]": serverErrors[serverkey].errorCounter,
            "[lastError]": serverErrors[serverkey].errors.slice(-1)[0].code,
            "[date]": new Date().toLocaleString(),
            "[timeZone]": getTimezone(new Date())
        }, function () { });
    }
}
exports.increaseErrorCounter = increaseErrorCounter;
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
            SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number=? and disabled!=1 and type!=0;`, [number], function (result) {
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
            });
        }
    }
    else {
        //TODO connection.end()?
    }
}
exports.ascii = ascii;
function SqlQuery(sqlPool, query, options, callback) {
    if (cv(3))
        logWithLineNumbers_js_1.ll(colors_js_1.default.BgLightCyan + colors_js_1.default.FgBlack + query, options, colors_js_1.default.Reset);
    query = query.replace(/\n/g, "").replace(/\s+/g, " ");
    query = mysql.format(query, options);
    if (cv(2) || (cv(1) && /(update)|(insert)/gi.test(query)))
        logWithLineNumbers_js_1.llo(1, colors_js_1.default.BgLightBlue + colors_js_1.default.FgBlack + query + colors_js_1.default.Reset);
    sqlPool.query(query, function (err, res) {
        if (sqlPool["_allConnections"] && sqlPool["_allConnections"].length) {
            if (cv(3))
                logWithLineNumbers_js_1.ll("number of open connections: " + sqlPool["_allConnections"].length);
        }
        else {
            if (cv(2))
                logWithLineNumbers_js_1.ll("not a pool");
        }
        if (err) {
            if (cv(0))
                logWithLineNumbers_js_1.llo(1, colors_js_1.default.FgRed, err, colors_js_1.default.Reset);
            callback(null);
        }
        else {
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
exports.SqlQuery = SqlQuery;
function checkIp(data, client, pool) {
    return __awaiter(this, void 0, void 0, function* () {
        if (config_js_1.default.doDnsLookups) {
            var arg = data.slice(1).toString().split("\n")[0].split("\r")[0];
            if (cv(1))
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}checking if ${colors_js_1.default.FgCyan + arg + colors_js_1.default.FgGreen} belongs to any participant${colors_js_1.default.Reset}`);
            let ipAddr = "";
            if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
                ipAddr = arg;
            }
            else {
                try {
                    let { address, family } = yield util.promisify(dns_1.lookup)(arg);
                    ipAddr = address;
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgCyan + arg + colors_js_1.default.FgGreen} resolved to ${colors_js_1.default.FgCyan + ipAddr + colors_js_1.default.Reset}`);
                }
                catch (e) {
                    client.connection.end("ERROR\r\nnot a valid host or ip\r\n");
                    return;
                    if (cv(3))
                        logWithLineNumbers_js_1.ll(e);
                }
            }
            if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
                SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", [], function (peers) {
                    var ipPeers = [];
                    async.each(peers, function (peer, cb) {
                        if ((!peer.ipaddress) && peer.hostname) {
                            // if(cv(3)) ll(`hostname: ${peer.hostname}`)
                            dns_1.lookup(peer.hostname, {}, function (err, address, family) {
                                // if (cv(3) && err) lle(colors.FgRed, err, colors.Reset);
                                if (address) {
                                    ipPeers.push({
                                        peer,
                                        ipaddress: address
                                    });
                                    // if(cv(3)) ll(`${peer.hostname} resolved to ${address}`);
                                }
                                cb();
                            });
                        }
                        else if (peer.ipaddress && (ip.isV4Format(peer.ipaddress) || ip.isV6Format(peer.ipaddress))) {
                            // if(cv(3)) ll(`ip: ${peer.ipaddress}`);
                            ipPeers.push({
                                peer,
                                ipaddress: peer.ipaddress
                            });
                            cb();
                        }
                        else {
                            cb();
                        }
                    }, function () {
                        let matches = ipPeers.filter(peer => ip.isEqual(peer.ipaddress, ipAddr)).map(x => x.peer.name);
                        if (cv(3))
                            logWithLineNumbers_js_1.ll("matching peers:", matches);
                        if (matches.length > 0) {
                            client.connection.end("ok\r\n" + matches.join("\r\n") + "\r\n+++\r\n");
                        }
                        else {
                            client.connection.end("fail\r\n+++\r\n");
                        }
                    });
                });
            }
            else {
                client.connection.end("ERROR\r\nnot a valid host or ip\r\n");
            }
        }
        else {
            client.connection.end("error\r\nthis server does not support this function\r\n");
        }
    });
}
exports.checkIp = checkIp;
function sendEmail(messageName, values, callback) {
    let message = config_js_1.default.eMail.messages[messageName];
    if (!message) {
        callback();
    }
    else {
        let mailOptions = {
            from: config_js_1.default.eMail.from,
            to: config_js_1.default.eMail.to,
            subject: message.subject,
            text: "",
            html: ""
        };
        let type;
        if (message.html) {
            type = "html";
        }
        else if (message.text) {
            type = "text";
        }
        else {
            type = null;
            mailOptions.text = "configuration error in config/mailMessages.json";
        }
        if (type) {
            mailOptions[type] = message[type];
            for (let k in values) {
                mailOptions[type] = mailOptions[type].replace(new RegExp(k.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g"), values[k]);
            }
        }
        if (cv(2) && config_js_1.default.logITelexCom) {
            logWithLineNumbers_js_1.ll("sending mail:\n", mailOptions, "\nto server", transporter_js_1.getTransporter().options["host"]);
        }
        else if (cv(1)) {
            logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}sending email of type ${colors_js_1.default.FgCyan + messageName || "config error(text)" + colors_js_1.default.Reset}`);
        }
        transporter_js_1.getTransporter().sendMail(mailOptions, function (error, info) {
            if (error) {
                if (cv(2))
                    logWithLineNumbers_js_1.lle(error);
                if (typeof callback === "function")
                    callback();
            }
            else {
                if (cv(1) && config_js_1.default.logITelexCom)
                    logWithLineNumbers_js_1.ll('Message sent:', info.messageId);
                if (config_js_1.default.eMail.useTestAccount)
                    if (config_js_1.default.logITelexCom)
                        logWithLineNumbers_js_1.ll('Preview URL:', nodemailer.getTestMessageUrl(info));
                if (typeof callback === "function")
                    callback();
            }
        });
    }
}
exports.sendEmail = sendEmail;
