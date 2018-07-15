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
const nodemailer = require("nodemailer");
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const dns_1 = require("dns");
const transporter_js_1 = require("../BINARYSERVER/transporter.js");
//#endregion
var serverErrors = {};
exports.serverErrors = serverErrors;
const cv = config_js_1.default.cv;
const verbosity = config_js_1.default.loggingVerbosity;
const mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;
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
function SqlQuery(sqlPool, query, options) {
    return new Promise((resolve, reject) => {
        if (cv(3))
            logWithLineNumbers_js_1.llo(1, colors_js_1.default.BgLightCyan + colors_js_1.default.FgBlack + query + " " + (options || "") + colors_js_1.default.Reset);
        query = query.replace(/\n/g, "").replace(/\s+/g, " ");
        query = mysql.format(query, options || []);
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
                reject(err);
            }
            else {
                resolve(res);
            }
        });
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
                SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", [])
                    .then(function (peers) {
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
