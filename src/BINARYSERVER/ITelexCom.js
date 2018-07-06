//TODO: impelement logITelexCom
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
function getTimezone(date) {
    let offset = -1 * date.getTimezoneOffset();
    let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
    return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
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
function checkFullPackage(buffer, part) {
    //if(cv(2)) if (config.logITelexCom) ll(part);
    //if(cv(2)) if (config.logITelexCom) ll(buffer);
    buffer = Array.prototype.slice.call(buffer, 0); //TODO find out what this does
    var data = buffer;
    if (part)
        data = part.concat(buffer);
    //if(cv(2)) if (config.logITelexCom) ll(data);
    var packagetype = data[0];
    var packagelength = data[1] + 2;
    if (data.length == packagelength) {
        return [
            data,
            []
        ];
    }
    else if (data.length > packagelength) {
        let res = checkFullPackage(data.slice(packagelength + 1, data.length));
        return [
            data.slice(0, packagelength).concat(res[0]),
            res[1]
        ];
    }
    else if (data.length < packagelength) {
        return [
            [],
            data
        ];
    }
    else {
        return ([
            [],
            []
        ]);
    }
}
exports.checkFullPackage = checkFullPackage;
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
    var array = [];
    switch (obj.packagetype) {
        case 1:
            array = ValueToBytearray(data.number, 4)
                .concat(ValueToBytearray(+data.pin, 2))
                .concat(ValueToBytearray(+data.port, 2));
            if (obj.datalength == null)
                obj.datalength = 8;
            break;
        case 2:
            array = ValueToBytearray(unmapIpV4fromIpV6(data.ipaddress).split(".").map(x => +x), 4);
            if (obj.datalength == null)
                obj.datalength = 4;
            break;
        case 3:
            array = ValueToBytearray(data.number, 4)
                .concat(ValueToBytearray(data.version, 1));
            if (obj.datalength == null)
                obj.datalength = 5;
            break;
        case 4:
            array = [];
            if (obj.datalength == null)
                obj.datalength = 0;
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
            array = ValueToBytearray(data.number, 4)
                .concat(ValueToBytearray(data.name, 40))
                .concat(ValueToBytearray(flags, 2))
                .concat(ValueToBytearray(data.type, 1))
                .concat(ValueToBytearray(data.hostname, 40))
                .concat(unmapIpV4fromIpV6(data.ipaddress).split(".").map(x => +x))
                .concat(ValueToBytearray(+data.port, 2))
                .concat(ValueToBytearray(ext, 1))
                .concat(ValueToBytearray(+data.pin, 2))
                .concat(ValueToBytearray(data.timestamp + 2208988800, 4));
            if (obj.datalength == null)
                obj.datalength = 100;
            break;
        case 6:
            array = ValueToBytearray(data.version, 1)
                .concat(ValueToBytearray(config_js_1.default.serverPin, 4));
            if (obj.datalength == null)
                obj.datalength = 5;
            break;
        case 7:
            array = ValueToBytearray(data.version, 1)
                .concat(ValueToBytearray(config_js_1.default.serverPin, 4));
            if (obj.datalength == null)
                obj.datalength = 5;
            break;
        case 8:
            array = [];
            if (obj.datalength == null)
                obj.datalength = 0;
            break;
        case 9:
            array = [];
            if (obj.datalength == null)
                obj.datalength = 0;
            break;
        case 10:
            // array = ValueToBytearray(data.version,1)
            // .concat(ValueToBytearray(data.pattern,40));
            array = ValueToBytearray(data.version, 1)
                .concat(ValueToBytearray(data.pattern, 40));
            if (obj.datalength == null)
                obj.datalength = 41;
            break;
    }
    var header = [obj.packagetype, array.length];
    if (array.length != obj.datalength) {
        logWithLineNumbers_js_1.lle("Buffer had unexpected size:\n" + array.length + " != " + obj.datalength);
        return Buffer.from([]);
    }
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "encoded:" + colors_js_1.default.FgCyan, Buffer.from(header.concat(array)), colors_js_1.default.Reset);
    return Buffer.from(header.concat(array));
}
exports.encPackage = encPackage;
function decPackageData(packagetype, buffer) {
    var data;
    switch (packagetype) {
        case 1:
            data = {
                number: BytearrayToValue(buffer.slice(0, 4), "number"),
                pin: BytearrayToValue(buffer.slice(4, 6), "number").toString(),
                port: BytearrayToValue(buffer.slice(6, 8), "number").toString()
            };
            break;
        case 2:
            data = {
                ipaddress: buffer.slice(0, 4).join(".")
            };
            if (data.ipaddress == "0.0.0.0")
                data.ipaddress = "";
            break;
        case 3:
            data = {
                number: BytearrayToValue(buffer.slice(0, 4), "number")
            };
            if (buffer.slice(4, 5).length > 0) {
                data.version = BytearrayToValue(buffer.slice(4, 5), "number");
            }
            else {
                data.version = 1;
            }
            break;
        case 4:
            data = {};
            break;
        case 5:
            let flags = buffer.slice(44, 46);
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
                number: BytearrayToValue(buffer.slice(0, 4), "number"),
                name: BytearrayToValue(buffer.slice(4, 44), "string"),
                disabled: (flags[0] & 2) == 2 ? 1 : 0,
                type: BytearrayToValue(buffer.slice(46, 47), "number"),
                hostname: BytearrayToValue(buffer.slice(47, 87), "string"),
                ipaddress: buffer.slice(87, 91).join("."),
                port: BytearrayToValue(buffer.slice(91, 93), "number").toString(),
                pin: BytearrayToValue(buffer.slice(94, 96), "number").toString(),
                timestamp: BytearrayToValue(buffer.slice(96, 100), "number") - 2208988800
            };
            if (data.ipaddress == "0.0.0.0")
                data.ipaddress = "";
            if (data.hostname == "")
                data.hostname = "";
            let extension = BytearrayToValue(buffer.slice(93, 94), "number");
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
            logWithLineNumbers_js_1.lle("invalid/unsupported packagetype: " + packagetype);
            data = {};
            break;
    }
    return data;
}
exports.decPackageData = decPackageData;
function decPackages(buffer) {
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "decoding:" + colors_js_1.default.FgCyan, Buffer.from(buffer), colors_js_1.default.Reset);
    var typepos = 0;
    var out = [];
    while (typepos < buffer.length - 1) {
        var packagetype = +buffer[typepos];
        var datalength = +buffer[typepos + 1];
        var blockdata = [];
        for (let i = 0; i < datalength; i++) {
            blockdata[i] = buffer[typepos + 2 + i];
        }
        var data = decPackageData(packagetype, blockdata);
        if (data) {
            if (constants.PackageSizes[packagetype] != datalength) {
                if (cv(1) && config_js_1.default.logITelexCom)
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgRed}size missmatch: ${constants.PackageSizes[packagetype]} != ${datalength}${colors_js_1.default.Reset}`);
                if (config_js_1.default.allowInvalidPackageSizes) {
                    if (cv(2) && config_js_1.default.logITelexCom)
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgRed}handling package of invalid size.${colors_js_1.default.Reset}`);
                }
                else {
                    if (cv(1) && config_js_1.default.logITelexCom)
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgYellow}not handling package, because it is of invalid size!${colors_js_1.default.Reset}`);
                    continue;
                }
            }
            out.push({
                packagetype: packagetype,
                datalength: datalength,
                data: data
            });
        }
        else {
            logWithLineNumbers_js_1.lle("error, no data");
        }
        typepos += datalength + 2;
    }
    if (config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "decoded:", colors_js_1.default.FgCyan, out, colors_js_1.default.Reset);
    return out;
}
exports.decPackages = decPackages;
function BytearrayToValue(arr, type) {
    if (cv(3) && config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}decoding Value:${colors_js_1.default.FgCyan}`, Buffer.from(arr), `${colors_js_1.default.FgGreen}as ${colors_js_1.default.FgCyan}${type}${colors_js_1.default.Reset}`);
    switch (type) {
        case "number":
            var num = 0;
            for (let i = arr.length - 1; i >= 0; i--) {
                num *= 256;
                num += arr[i];
            }
            if (cv(3) && config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}decoded to: ${colors_js_1.default.FgCyan}${num}${colors_js_1.default.Reset}`);
            return (num);
        case "string":
            var str = "";
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] != 0) {
                    str += String.fromCharCode(arr[i]);
                }
                else {
                    break;
                }
            }
            if (cv(3) && config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}decoded Value: ${colors_js_1.default.FgCyan}${str}${colors_js_1.default.Reset}`);
            return (str);
        default:
            if (cv(3) && config_js_1.default.logITelexCom)
                logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgRed}invalid type: ${type}${colors_js_1.default.Reset}`);
            return null;
    }
}
exports.BytearrayToValue = BytearrayToValue;
function ValueToBytearray(value, size) {
    if (cv(3) && config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}encoding Value:${colors_js_1.default.FgCyan}`, value, `${colors_js_1.default.FgGreen}(${colors_js_1.default.FgCyan}${typeof value}${colors_js_1.default.FgGreen}) to a Buffer of size: ${colors_js_1.default.FgCyan}${size}${colors_js_1.default.Reset}`);
    //if(cv(2)) if (config.logITelexCom) ll(value);
    let array = [];
    if (typeof value === "string") {
        for (let i = 0; i < value.length; i++) {
            array[i] = value.charCodeAt(i);
        }
    }
    else if (typeof value === "number") {
        while (value > 0) {
            array[array.length] = value % 256;
            value = Math.floor(value / 256);
        }
    }
    if (array.length > size || array.length == undefined) {
        logWithLineNumbers_js_1.lle("Value " + value + " turned into a bigger than expecte Bytearray!\n" + array.length + " > " + size);
    }
    while (array.length < size) {
        array[array.length] = 0;
    }
    if (cv(3) && config_js_1.default.logITelexCom)
        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}encoded Value:${colors_js_1.default.FgCyan}`, Buffer.from(array), colors_js_1.default.Reset);
    return (array);
}
exports.ValueToBytearray = ValueToBytearray;
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
        if (message.html == "") {
            type = "text";
        }
        else if (message.text == "") {
            type = "html";
        }
        else {
            type = null;
            mailOptions.text = "configuration error in config.json";
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
