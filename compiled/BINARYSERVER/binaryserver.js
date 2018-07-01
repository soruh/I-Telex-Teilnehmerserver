"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getTimezone(date) {
    let offset = -1 * date.getTimezoneOffset();
    let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
    return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}
//#region imports
const util = require("util");
const net = require("net");
const dns_1 = require("dns");
const async = require("async");
const mysql = require("mysql");
const ip = require("ip");
const timers = require("../BINARYSERVER/timers.js");
const config_js_1 = require("../COMMONMODULES/config.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const nodemailer = require("nodemailer");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const connections = require("../BINARYSERVER/connections.js");
const constants = require("../BINARYSERVER/constants.js");
const connect_js_1 = require("../BINARYSERVER/connect.js");
//#endregion
const cv = ITelexCom.cv;
const readonly = (config_js_1.default.serverPin == null);
if (readonly)
    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgMagenta}Starting in read-only mode!${colors_js_1.default.Reset}`);
if (config_js_1.default.disableColors)
    colors_js_1.default.disable();
const mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
var transporter;
/*<PKGTYPES>
Client_update: 1
Address_confirm: 2
Peer_query: 3
Peer_not_found: 4
Peer_reply: 5
Sync_FullQuery: 6
Sync_Login: 7
Acknowledge: 8
End_of_List: 9
Peer_search: 10
</PKGTYPES>*/
var handles = {}; //functions for handeling packages
for (let i = 1; i <= 10; i++) {
    handles[i] = {};
}
//handes[packagetype][state of this connection]
//handles[2][constants.states.STANDBY] = (obj,cnum,pool,connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,pool,connection)=>{}; NOT USED
handles[1][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            var number = obj.data.rufnummer;
            var pin = obj.data.pin;
            var port = obj.data.port;
            var ipaddress = connection.remoteAddress.replace(/^.*:/, '');
            if (number < 10000) {
                if (cv(1))
                    logWithLineNumbers_js_1.lle(`${colors_js_1.default.FgRed}client tried to update ${number} which is too small(<10000)${colors_js_1.default.Reset}`);
                ITelexCom.sendEmail(transporter, "invalidNumber", {
                    "[IpFull]": connection.remoteAddress,
                    "[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
                    "[number]": number,
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                }, function () {
                    connection.end();
                    cb();
                });
            }
            else {
                ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`, [number], function (result_a) {
                    let results = [];
                    if (result_a) {
                        for (let r of result_a) {
                            if (r.typ != 0) {
                                results.push(r);
                            }
                        }
                    }
                    if (results.length == 1) {
                        var res = results[0];
                        if (res.pin == pin) {
                            if (res.typ == 5) {
                                if (ipaddress != res.ipaddresse || port != res.port) {
                                    ITelexCom.SqlQuery(pool, `UPDATE teilnehmer
											SET
												port = ?,
												ipaddresse = ?,
												changed = 1,
												moddate = ?
											WHERE
												rufnummer = ?
												OR
												(
													Left(name, ?) = Left(?, ?)
													AND port = ?
													AND pin = ?
													AND typ = 5
												)`, [
                                        port,
                                        ipaddress,
                                        Math.floor(Date.now() / 1000),
                                        number,
                                        config_js_1.default.DynIpUpdateNameDifference,
                                        res.name,
                                        config_js_1.default.DynIpUpdateNameDifference,
                                        res.port,
                                        res.pin
                                    ], function (result_b) {
                                        ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`, [number], function (result_c) {
                                            try {
                                                connection.write(ITelexCom.encPackage({
                                                    packagetype: 2,
                                                    datalength: 4,
                                                    data: {
                                                        ipaddress: result_c[0].ipaddresse
                                                    }
                                                }), "binary", function () {
                                                    if (typeof cb === "function")
                                                        cb();
                                                });
                                            }
                                            catch (e) {
                                                if (cv(0))
                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                                                if (typeof cb === "function")
                                                    cb();
                                            }
                                        });
                                    });
                                }
                                else {
                                    if (cv(2))
                                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgYellow}not UPDATING, nothing to update${colors_js_1.default.Reset}`);
                                    connection.write(ITelexCom.encPackage({
                                        packagetype: 2,
                                        datalength: 4,
                                        data: {
                                            ipaddress: res.ipaddresse
                                        }
                                    }), "binary", function () {
                                        if (typeof cb === "function")
                                            cb();
                                    });
                                }
                            }
                            else {
                                if (cv(1))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "not DynIp type" + colors_js_1.default.Reset);
                                connection.end();
                                ITelexCom.sendEmail(transporter, "wrongDynIpType", {
                                    "[typ]": res.typ,
                                    "[IpFull]": connection.remoteAddress,
                                    "[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
                                    "[number]": res.rufnummer,
                                    "[name]": res.name,
                                    "[date]": new Date().toLocaleString(),
                                    "[timeZone]": getTimezone(new Date())
                                }, cb);
                            }
                        }
                        else {
                            if (cv(1))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "wrong DynIp pin" + colors_js_1.default.Reset);
                            connection.end();
                            ITelexCom.sendEmail(transporter, "wrongDynIpPin", {
                                "[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
                                "[number]": res.rufnummer,
                                "[name]": res.name,
                                "[date]": new Date().toLocaleString(),
                                "[timeZone]": getTimezone(new Date())
                            }, cb);
                        }
                    }
                    else if (results.length == 0) {
                        let insertQuery = `
						INSERT INTO teilnehmer
							(
								name,
								moddate,
								typ,
								rufnummer,
								port,
								pin,
								ipaddresse,
								gesperrt,
								changed
							) VALUES (
								?,
								?,
								?,
								?,
								?,
								?,
								?,
								?,
								?
							);`;
                        let insertOptions = [
                            '?',
                            Math.floor(Date.now() / 1000),
                            5,
                            number,
                            port,
                            pin,
                            connection.remoteAddress.replace(/^.*:/, ''),
                            1,
                            1
                        ];
                        let deleteQuery = `DELETE FROM teilnehmer WHERE rufnummer=?;`;
                        let deleteOptions = [number];
                        let query;
                        let options;
                        let exists = result_a && (result_a.length > 0);
                        if (exists) {
                            query = deleteQuery;
                            options = deleteOptions.concat(insertOptions);
                        }
                        else {
                            query = deleteQuery + insertQuery;
                            options = insertOptions;
                        }
                        ITelexCom.SqlQuery(pool, query, options, function (result_b) {
                            if (result_b) {
                                ITelexCom.sendEmail(transporter, "new", {
                                    "[IpFull]": connection.remoteAddress,
                                    "[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
                                    "[number]": number,
                                    "[date]": new Date().toLocaleString(),
                                    "[timeZone]": getTimezone(new Date())
                                }, cb);
                                ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`, [number], function (result_c) {
                                    try {
                                        connection.write(ITelexCom.encPackage({
                                            packagetype: 2,
                                            datalength: 4,
                                            data: {
                                                ipaddress: result_c[0].ipaddresse
                                            }
                                        }), "binary", function () {
                                            if (typeof cb === "function")
                                                cb();
                                        });
                                    }
                                    catch (e) {
                                        if (cv(0))
                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                                        if (typeof cb === "function")
                                            cb();
                                    }
                                });
                            }
                            else {
                                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "could not create entry", colors_js_1.default.Reset);
                                if (typeof cb === "function")
                                    cb();
                            }
                        });
                    }
                    else {
                        console.error(colors_js_1.default.FgRed, res, colors_js_1.default.Reset);
                        if (typeof cb === "function")
                            cb();
                    }
                });
            }
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[3][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            if (obj.data.version == 1) {
                var rufnummer = obj.data.rufnummer;
                ITelexCom.SqlQuery(pool, `
					SELECT * FROM teilnehmer WHERE
						rufnummer = ?
						and
						typ != 0
						and
						gesperrt != 1
					;`, [rufnummer], function (result) {
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, result, colors_js_1.default.Reset);
                    if ((result[0] != undefined) && (result != [])) {
                        let data = result[0];
                        data.pin = 0;
                        data.port = parseInt(result[0].port);
                        connection.write(ITelexCom.encPackage({
                            packagetype: 5,
                            datalength: 100,
                            data: data
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                    else {
                        connection.write(ITelexCom.encPackage({
                            packagetype: 4,
                            datalength: 0
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                });
            }
            else {
                if (cv(0))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed, "unsupported package version, sending '0x04' package", colors_js_1.default.Reset);
                connection.write(ITelexCom.encPackage({
                    packagetype: 4,
                    datalength: 0
                }), function () {
                    if (typeof cb === "function")
                        cb();
                });
            }
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[5][constants.states.FULLQUERY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            if (cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got dataset for:", colors_js_1.default.FgCyan, obj.data.rufnummer, colors_js_1.default.Reset);
            ITelexCom.SqlQuery(pool, `SELECT * from teilnehmer WHERE rufnummer = ?;`, [obj.data.rufnummer], function (entries) {
                var o = {
                    rufnummer: obj.data.rufnummer,
                    name: obj.data.name,
                    typ: obj.data.typ,
                    hostname: obj.data.addresse,
                    ipaddresse: obj.data.ipaddresse,
                    port: obj.data.port,
                    extension: obj.data.durchwahl,
                    pin: obj.data.pin,
                    gesperrt: obj.data.gesperrt,
                    moddate: obj.data.timestamp,
                    changed: (config_js_1.default.setChangedOnNewerEntry ? 1 : 0)
                };
                // var doLU = ((o.hostname!=""&&o.ipaddresse==null)&&config.doDnsLookups);
                // function lookup(host,callback){
                //   if(host){
                //     if(cv(2)) ll(colors.FgGreen+"starting nslookup for: "+colors.FgCyan+host+colors.FgGreen+" ..."+colors.Reset);
                //    lookup(host,{verbatim:true},function(err, address, family){
                //       if(cv(3)&&err) lle(colors.FgRed,err,colors.Reset);
                //       if(cv(2)&&(!(err))) ll(colors.FgGreen+"nslookup got ip: "+colors.FgCyan+address+colors.Reset);
                //       if(typeof callback === "function") callback(address,entries,o,connection,cb);
                //     });
                //   }else{
                //     if(typeof callback === "function") callback(null,entries,o,connection,cb);
                //   }
                // }
                if (entries.length == 1) {
                    var entry = entries[0];
                    if (obj.data.timestamp > entry.moddate) {
                        // lookup((doLU?o.hostname:false),function(addr,entry,o,connection,cb){
                        //   if(doLU&&addr){
                        //     o.ipaddresse = addr;
                        //   }
                        if (cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "entry is older: " + colors_js_1.default.FgCyan + obj.data.timestamp + colors_js_1.default.FgGreen + " > " + colors_js_1.default.FgCyan + entry.moddate + colors_js_1.default.Reset);
                        var sets = "";
                        for (let k in o) {
                            if (o[k] != undefined) {
                                sets += k + " = " + mysql.escape(o[k]) + ", ";
                            }
                            else {
                                sets += k + " = DEFAULT, ";
                            }
                        }
                        var q = `UPDATE teilnehmer SET ${sets.substring(0, sets.length - 2)} WHERE rufnummer = ?;`;
                        ITelexCom.SqlQuery(pool, q, [obj.data.rufnummer], function (res2) {
                            connection.write(ITelexCom.encPackage({
                                packagetype: 8,
                                datalength: 0
                            }), function () {
                                if (typeof cb === "function")
                                    cb();
                            });
                        });
                        // });
                    }
                    else {
                        if (cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "recieved entry is " + colors_js_1.default.FgCyan + (parseInt(entry.moddate) - parseInt(obj.data.timestamp)) + colors_js_1.default.FgYellow + " seconds older and was ignored" + colors_js_1.default.Reset);
                        connection.write(ITelexCom.encPackage({
                            packagetype: 8,
                            datalength: 0
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                }
                else if (entries.length == 0) {
                    // lookup((doLU?o.hostname:false),function(addr,entry,o,connection,cb){
                    //   if(doLU&&addr){
                    //     o.ipaddresse = addr;
                    //   }
                    var names = "";
                    var values = "";
                    for (let k in o) {
                        if (o[k] != undefined) {
                            names += k + ", ";
                            values += mysql.escape(o[k]) + ", ";
                        }
                    }
                    var q = `INSERT INTO teilnehmer(${names.substring(0, names.length - 2)}) VALUES (${values.substring(0, values.length - 2)});`;
                    ITelexCom.SqlQuery(pool, q, [], function (res2) {
                        connection.write(ITelexCom.encPackage({
                            packagetype: 8,
                            datalength: 0
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    });
                    // });
                }
                else {
                    if (cv(0))
                        logWithLineNumbers_js_1.ll('The "rufnummer" field should be unique! This error should not occur!');
                    if (typeof cb === "function")
                        cb();
                }
            });
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[5][constants.states.LOGIN] = handles[5][constants.states.FULLQUERY];
handles[6][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            if (obj.data.serverpin == config_js_1.default.serverPin || (readonly && config_js_1.default.allowFullQueryInReadonly)) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
                ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer;", [], function (result) {
                    if ((result[0] != undefined) && (result != [])) {
                        client.writebuffer = result;
                        client.state = constants.states.RESPONDING;
                        ITelexCom.handlePackage({
                            packagetype: 8,
                            datalength: 0,
                            data: {}
                        }, cnum, pool, connection, handles, cb);
                    }
                    else {
                        connection.write(ITelexCom.encPackage({
                            packagetype: 9,
                            datalength: 0
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                });
            }
            else {
                if (cv(1)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect! " + colors_js_1.default.FgCyan + obj.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + " ending connection!" + colors_js_1.default.Reset); //TODO: remove pin logging
                    connection.end();
                }
                ITelexCom.sendEmail(transporter, "wrongServerPin", {
                    "[IpFull]": connection.remoteAddress,
                    "[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                }, cb);
            }
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[7][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            if ((obj.data.serverpin == config_js_1.default.serverPin) || (readonly && config_js_1.default.allowLoginInReadonly)) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
                connection.write(ITelexCom.encPackage({
                    packagetype: 8,
                    datalength: 0
                }), function () {
                    client.state = constants.states.LOGIN;
                    if (typeof cb === "function")
                        cb();
                });
            }
            else {
                if (cv(1)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect!" + colors_js_1.default.FgCyan + obj.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + "ending connection!" + colors_js_1.default.Reset);
                    connection.end();
                }
                ITelexCom.sendEmail(transporter, "wrongServerPin", {
                    "[IpFull]": connection.remoteAddress,
                    "[Ip]": (ip.isV4Format(connection.remoteAddress.split("::")[1]) ? connection.remoteAddress.split("::")[1] : connection.remoteAddress),
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                }, cb);
            }
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[8][constants.states.RESPONDING] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            if (cv(1)) {
                var toSend = [];
                for (let o of client.writebuffer) {
                    toSend.push(o.rufnummer);
                }
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "entrys to transmit:" + colors_js_1.default.FgCyan + (cv(2) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors_js_1.default.Reset);
            }
            if (client.writebuffer.length > 0) {
                connection.write(ITelexCom.encPackage({
                    packagetype: 5,
                    datalength: 100,
                    data: client.writebuffer[0]
                }), function () {
                    if (cv(1))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "sent dataset for:", colors_js_1.default.FgCyan, client.writebuffer[0].rufnummer, colors_js_1.default.Reset);
                    client.writebuffer = client.writebuffer.slice(1);
                    if (typeof cb === "function")
                        cb();
                });
            }
            else if (client.writebuffer.length == 0) {
                connection.write(ITelexCom.encPackage({
                    packagetype: 9,
                    datalength: 0
                }), function () {
                    client.writebuffer = [];
                    client.state = constants.states.STANDBY;
                    if (typeof cb === "function")
                        cb();
                });
            }
            else {
                if (typeof cb === "function")
                    cb();
            }
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[9][constants.states.FULLQUERY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            client.state = constants.states.STANDBY;
            if (typeof client.cb === "function")
                client.cb();
            if (typeof cb === "function")
                cb();
            connection.end();
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[9][constants.states.LOGIN] = handles[9][constants.states.FULLQUERY];
handles[10][constants.states.STANDBY] = function (obj, cnum, pool, connection, handles, cb) {
    try {
        let client = ITelexCom.connections.get(cnum);
        if (client) {
            if (cv(2))
                logWithLineNumbers_js_1.ll(obj);
            let version = obj.data.version;
            let query = obj.data.pattern;
            let queryarr = query.split(" ");
            let searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ??".repeat(query.length)};`;
            ITelexCom.SqlQuery(pool, searchstring, queryarr.map(q => `%${q}%`), function (result) {
                if ((result[0] != undefined) && (result != [])) {
                    var towrite = [];
                    for (let o of result) {
                        if (o.gesperrt != 1 && o.typ != 0) {
                            o.pin = "0";
                            towrite.push(o);
                        }
                    }
                    client.writebuffer = towrite;
                    client.state = constants.states.RESPONDING;
                    ITelexCom.handlePackage({
                        packagetype: 8,
                        datalength: 0,
                        data: {}
                    }, cnum, pool, connection, handles, cb);
                }
                else {
                    connection.write(ITelexCom.encPackage({
                        packagetype: 9,
                        datalength: 0
                    }), function () {
                        if (typeof cb === "function")
                            cb();
                    });
                }
            });
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
function init() {
    if (cv(0))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Initialising!" + colors_js_1.default.Reset);
    var server = net.createServer(function (connection) {
        try {
            var cnum = connections.add("C", {
                connection: connection,
                state: constants.states.STANDBY,
                handling: false,
                readbuffer: null,
                writebuffer: null,
                packages: []
            });
            var client = ITelexCom.connections.get(cnum);
            if (cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "client " + colors_js_1.default.FgCyan + cnum + colors_js_1.default.FgGreen + " connected with ipaddress: " + colors_js_1.default.FgCyan + connection.remoteAddress + colors_js_1.default.Reset); //.replace(/^.*:/,'')
            if (connection.remoteAddress == undefined)
                setTimeout(function () {
                    logWithLineNumbers_js_1.ll(connection.remoteAddress);
                }, 1000);
            var queryresultpos = -1;
            var queryresult = [];
            var connectionpin;
            connection.setTimeout(config_js_1.default.connectionTimeout);
            connection.on('timeout', function () {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + cnum + colors_js_1.default.FgYellow + " timed out" + colors_js_1.default.Reset);
                connection.end();
            });
            connection.on('end', function () {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + cnum + colors_js_1.default.FgYellow + " disconnected" + colors_js_1.default.Reset);
                try {
                    clearTimeout(client.timeout);
                }
                catch (e) {
                    if (cv(2))
                        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                }
                if (ITelexCom.connections.has(cnum) && ITelexCom.connections.get(cnum).connection == connection) {
                    setTimeout(function (cnum) {
                        if (ITelexCom.connections.remove(cnum)) {
                            logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + cnum + colors_js_1.default.FgGreen}${colors_js_1.default.Reset}`);
                            cnum = null;
                            client = null;
                        }
                    }, 1000, cnum);
                }
            });
            connection.on('error', function (err) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "client " + colors_js_1.default.FgCyan + cnum + colors_js_1.default.FgRed + " had an error:\n", err, colors_js_1.default.Reset);
                try {
                    clearTimeout(client.timeout);
                }
                catch (e) {
                    if (cv(2))
                        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                }
                if (ITelexCom.connections.has(cnum) && ITelexCom.connections.get(cnum).connection == connection) {
                    setTimeout(function (cnum) {
                        if (ITelexCom.connections.remove(cnum)) {
                            logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + cnum + colors_js_1.default.Reset}`);
                            cnum = null;
                            client = null;
                        }
                    }, 1000, cnum);
                }
            });
            connection.on('data', function (data) {
                if (cv(2)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved data:" + colors_js_1.default.Reset);
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, data.toString().replace(/\u0000/g, "").replace(/[^ -~]/g, " "), colors_js_1.default.Reset);
                }
                if (data[0] == 113 && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving ascii request" + colors_js_1.default.Reset);
                    ITelexCom.ascii(data, connection, pool); //TODO: check for fragmentation //probably not needed
                }
                else if (data[0] == 99) {
                    if (config_js_1.default.doDnsLookups) {
                        var arg = data.slice(1).toString().replace(/\n/g, "").replace(/\r/g, "");
                        if (cv(1))
                            logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}checking if ${colors_js_1.default.FgCyan + arg + colors_js_1.default.FgGreen} belongs to participant${colors_js_1.default.Reset}`);
                        let check = function check(IpAddr) {
                            if (ip.isV4Format(IpAddr) || ip.isV6Format(IpAddr)) {
                                ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE gesperrt != 1 AND typ != 0;", [], function (res) {
                                    var ips = [];
                                    async.eachOf(res, function (r, key, cb) {
                                        if ((!r.ipaddresse) && r.hostname) {
                                            // ll(`hostname: ${r.hostname}`)
                                            dns_1.lookup(r.hostname, {}, function (err, address, family) {
                                                if (cv(3) && err)
                                                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, err, colors_js_1.default.Reset);
                                                if (address) {
                                                    ips.push(address);
                                                    // ll(`${r.hostname} resolved to ${address}`);
                                                }
                                                cb();
                                            });
                                        }
                                        else if (r.ipaddresse && (ip.isV4Format(r.ipaddresse) || ip.isV6Format(r.ipaddresse))) {
                                            // ll(`ip: ${r.ipaddresse}`);
                                            ips.push(r.ipaddresse);
                                            cb();
                                        }
                                        else {
                                            cb();
                                        }
                                    }, function () {
                                        // ips = ips.filter(function(elem, pos){
                                        //   return ips.indexOf(elem) == pos;
                                        // });
                                        // ll(JSON.stringify(ips))
                                        let exists = ips.filter(i => ip.isEqual(i, IpAddr)).length > 0;
                                        // ll(exists);
                                        // var exists = 0;
                                        // for(var i in ips){
                                        //   if(ip.isEqual(ips[i],IpAddr)){
                                        //     exists = 1;
                                        //   }
                                        // }
                                        connection.write(exists + "\r\n");
                                    });
                                });
                            }
                            else {
                                // connection.write("-1\r\n");
                                connection.write("ERROR\r\nnot a valid host or ip\r\n");
                            }
                        };
                        if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
                            check(arg);
                        }
                        else {
                            dns_1.lookup(arg, {}, function (err, address, family) {
                                if (cv(3) && err)
                                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, err, colors_js_1.default.Reset);
                                check(address);
                            });
                        }
                    }
                    else {
                        connection.write("ERROR\r\nthis server does not support this function\r\n");
                    }
                }
                else {
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving binary request" + colors_js_1.default.Reset);
                    if (cv(2))
                        logWithLineNumbers_js_1.ll("Buffer for client " + cnum + ":" + colors_js_1.default.FgCyan, client.readbuffer, colors_js_1.default.Reset);
                    if (cv(2))
                        logWithLineNumbers_js_1.ll("New Data for client " + cnum + ":" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
                    var res = ITelexCom.checkFullPackage(data, client.readbuffer);
                    if (cv(2))
                        logWithLineNumbers_js_1.ll("New Buffer:" + colors_js_1.default.FgCyan, res[1], colors_js_1.default.Reset);
                    if (cv(2))
                        logWithLineNumbers_js_1.ll("Complete Package:" + colors_js_1.default.FgCyan, res[0], colors_js_1.default.Reset);
                    if (res[1].length > 0) {
                        client.readbuffer = res[1];
                    }
                    if (res[0]) {
                        if (typeof client.packages != "object")
                            client.packages = [];
                        client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
                        let timeout = function () {
                            if (cv(2))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling: " + colors_js_1.default.FgCyan + client.handling + colors_js_1.default.Reset);
                            if (client.handling === false) {
                                client.handling = true;
                                if (client.timeout != null) {
                                    clearTimeout(client.timeout);
                                    client.timeout = null;
                                }
                                async.eachOfSeries((client.packages != undefined ? client.packages : []), function (pkg, key, cb) {
                                    if ((cv(1) && (Object.keys(client.packages).length > 1)) || cv(2))
                                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling package " + colors_js_1.default.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors_js_1.default.Reset);
                                    ITelexCom.handlePackage(pkg, cnum, pool, connection, handles, function () {
                                        client.packages.splice(key, 1);
                                        cb();
                                    });
                                }, function () {
                                    client.handling = false;
                                });
                            }
                            else {
                                if (client.timeout == null) {
                                    client.timeout = setTimeout(timeout, 10);
                                }
                            }
                        };
                        timeout();
                    }
                }
            });
        }
        catch (e) {
            if (cv(0))
                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        }
    });
    server.on("error", err => logWithLineNumbers_js_1.lle("server error:", err));
    server.listen(config_js_1.default.binaryPort, function () {
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "server is listening on port " + colors_js_1.default.FgCyan + config_js_1.default.binaryPort, colors_js_1.default.Reset);
        timers.TimeoutWrapper(getFullQuery, config_js_1.default.fullQueryInterval);
        timers.TimeoutWrapper(updateQueue, config_js_1.default.updateQueueInterval);
        timers.TimeoutWrapper(sendQueue, config_js_1.default.queueSendInterval);
        getFullQuery();
        //updateQueue();
    });
}
function updateQueue(callback) {
    if (cv(2))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "updating " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.FgMagenta + "!" + colors_js_1.default.Reset);
    ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE changed = ?;", [1], function (changed) {
        if (changed.length > 0) {
            if (cv(2)) {
                var changed_numbers = [];
                for (let o of changed) {
                    changed_numbers.push(o.rufnummer);
                }
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "numbers to enqueue:" + colors_js_1.default.FgCyan, changed_numbers, colors_js_1.default.Reset);
            }
            if (cv(1) && !cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + changed.length + colors_js_1.default.FgGreen + " numbers to enqueue" + colors_js_1.default.Reset);
            ITelexCom.SqlQuery(pool, "SELECT * FROM servers;", [], function (servers) {
                if (servers.length > 0) {
                    async.each(servers, function (server, cb1) {
                        async.each(changed, function (message, cb2) {
                            ITelexCom.SqlQuery(pool, "SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid], function (qentry) {
                                if (qentry.length == 1) {
                                    ITelexCom.SqlQuery(pool, "UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [Math.floor(Date.now() / 1000), server.uid, message.uid], function () {
                                        //ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
                                        if (cv(2))
                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.rufnummer, colors_js_1.default.Reset);
                                        cb2();
                                        //});
                                    });
                                }
                                else if (qentry.length == 0) {
                                    ITelexCom.SqlQuery(pool, "INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)], function () {
                                        //ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
                                        if (cv(2))
                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.rufnummer, colors_js_1.default.Reset);
                                        cb2();
                                        //});
                                    });
                                }
                                else {
                                    logWithLineNumbers_js_1.lle("duplicate queue entry!");
                                    ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid], function () {
                                        ITelexCom.SqlQuery(pool, "INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)], function () {
                                            //ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
                                            if (cv(2))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.rufnummer, colors_js_1.default.Reset);
                                            cb2();
                                            //});
                                        });
                                    });
                                }
                            });
                        }, cb1);
                    }, function () {
                        if (cv(1))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "finished enqueueing" + colors_js_1.default.Reset);
                        if (cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "reseting changed flags..." + colors_js_1.default.Reset);
                        ITelexCom.SqlQuery(pool, "UPDATE teilnehmer SET changed = ? WHERE uid=" + changed.map(entry => entry.uid).join(" or uid=") + ";", [0], function (res) {
                            if (cv(2))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "reset " + colors_js_1.default.FgCyan + changed.length + colors_js_1.default.FgGreen + " changed flags." + colors_js_1.default.Reset);
                            if (typeof callback === "function")
                                callback();
                        });
                    });
                }
                else {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No configured servers -> aborting " + colors_js_1.default.FgCyan + "updateQueue" + colors_js_1.default.Reset);
                    if (typeof callback === "function")
                        callback();
                }
            });
        }
        else {
            if (cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "no numbers to enqueue" + colors_js_1.default.Reset);
            /*if(qwdec == null){
                qwdec = "unknown";
                //TODO qwd.stdin.write("sendQueue",callback);
        if(typeof callback === "function") callback();
            }else{
        if(typeof callback === "function") callback();
            }*/
            if (typeof callback === "function")
                callback();
            //setTimeout(updateQueue,config.updateQueueInterval);
        }
    });
}
function getFullQuery(callback) {
    if (cv(2))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "geting " + colors_js_1.default.FgCyan + "FullQuery" + colors_js_1.default.FgMagenta + "!" + colors_js_1.default.Reset);
    /*if(readonly){
    ITelexCom.connect(pool,transporter,function(e){
      if(typeof callback === "function") callback();
    },{host:config.readonlyHost,port:config.readonlyPort},handles,function(client,cnum){
      client.write(ITelexCom.encPackage({packagetype:10,datalength:41,data:{pattern:'',version:1}}),function(){
        ITelexCom.connections.get(cnum).state = constants.states.FULLQUERY;
      });
    });
  }else{*/
    ITelexCom.SqlQuery(pool, "SELECT  * FROM servers;", [], function (servers) {
        if (servers.length > 0) {
            for (let i in servers) {
                if (servers[i].addresse == config_js_1.default.fullQueryServer.split(":")[0] && servers[i].port == config_js_1.default.fullQueryServer.split(":")[1]) {
                    servers = [servers[i]];
                }
            }
            async.eachSeries(servers, function (r, cb) {
                connect_js_1.default(pool, transporter, function (e) {
                    try {
                        cb();
                    }
                    catch (e) {
                        if (cv(2))
                            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                    }
                }, {
                    host: r.addresse,
                    port: r.port
                }, handles, function (client, cnum) {
                    try {
                        let request = readonly ? {
                            packagetype: 10,
                            datalength: 41,
                            data: {
                                pattern: '',
                                version: 1
                            }
                        } : {
                            packagetype: 6,
                            datalength: 5,
                            data: {
                                serverpin: config_js_1.default.serverPin,
                                version: 1
                            }
                        };
                        client.write(ITelexCom.encPackage(request), function () {
                            ITelexCom.connections.get(cnum).state = constants.states.FULLQUERY;
                            ITelexCom.connections.get(cnum).cb = cb;
                        });
                    }
                    catch (e) {
                        if (cv(2))
                            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                        try {
                            cb();
                        }
                        catch (e) {
                            if (cv(2))
                                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                        }
                    }
                });
            }, function () {
                if (typeof callback === "function")
                    callback();
            });
        }
        else {
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No configured servers -> aborting " + colors_js_1.default.FgCyan + "FullQuery" + colors_js_1.default.Reset);
            if (typeof callback === "function")
                callback();
        }
    });
    //}
}
function sendQueue(callback) {
    if (cv(2))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "sending " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.FgMagenta + "!" + colors_js_1.default.Reset);
    if (readonly) {
        if (cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "Read-only mode -> aborting " + colors_js_1.default.FgCyan + "sendQueue" + colors_js_1.default.Reset);
        if (typeof callback === "function")
            callback();
    }
    else {
        ITelexCom.SqlQuery(pool, "SELECT * FROM teilnehmer;", [], function (teilnehmer) {
            ITelexCom.SqlQuery(pool, "SELECT * FROM queue;", [], function (queue) {
                if (queue.length > 0) {
                    var servers = {};
                    for (let q of queue) {
                        if (!servers[q.server])
                            servers[q.server] = [];
                        servers[q.server].push(q);
                    }
                    async.eachSeries(servers, function (server, cb) {
                        ITelexCom.SqlQuery(pool, "SELECT  * FROM servers WHERE uid=??;", [server[0].server], function (result2) {
                            if (result2.length == 1) {
                                var serverinf = result2[0];
                                if (cv(2))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, serverinf, colors_js_1.default.Reset);
                                try {
                                    var isConnected = false;
                                    for (let key in ITelexCom.connections) {
                                        if (ITelexCom.connections.has(key)) {
                                            var c = ITelexCom.connections[key];
                                        }
                                        if (c.servernum == server[0].server) {
                                            var isConnected = true;
                                        }
                                    }
                                    if (!isConnected) {
                                        connect_js_1.default(pool, transporter, cb, {
                                            host: serverinf.addresse,
                                            port: serverinf.port
                                        }, handles, function (client, cnum) {
                                            ITelexCom.connections.get(cnum).servernum = server[0].server;
                                            if (cv(1))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + 'connected to server ' + server[0].server + ': ' + serverinf.addresse + " on port " + serverinf.port + colors_js_1.default.Reset);
                                            ITelexCom.connections.get(cnum).writebuffer = [];
                                            async.each(server, function (serverdata, scb) {
                                                if (cv(2))
                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, serverdata, colors_js_1.default.Reset);
                                                var existing = null;
                                                for (let t of teilnehmer) {
                                                    if (t.uid == serverdata.message) {
                                                        existing = t;
                                                    }
                                                }
                                                if (existing) {
                                                    ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE uid=?;", [serverdata.uid], function (res) {
                                                        if (res.affectedRows > 0) {
                                                            ITelexCom.connections.get(cnum).writebuffer.push(existing); //TODO
                                                            if (cv(1))
                                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "deleted queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgGreen + " from queue" + colors_js_1.default.Reset);
                                                            scb();
                                                        }
                                                        else {
                                                            if (cv(1))
                                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "could not delete queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgRed + " from queue" + colors_js_1.default.Reset);
                                                            scb();
                                                        }
                                                    });
                                                }
                                                else {
                                                    if (cv(2))
                                                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "entry does not exist" + colors_js_1.default.FgCyan + colors_js_1.default.Reset);
                                                    scb();
                                                }
                                            }, function () {
                                                client.write(ITelexCom.encPackage({
                                                    packagetype: 7,
                                                    datalength: 5,
                                                    data: {
                                                        serverpin: config_js_1.default.serverPin,
                                                        version: 1
                                                    }
                                                }), function () {
                                                    ITelexCom.connections.get(cnum).state = constants.states.RESPONDING;
                                                    cb();
                                                });
                                            });
                                        });
                                    }
                                    else {
                                        if (cv(1))
                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "already connected to server " + server[0].server + colors_js_1.default.Reset);
                                        cb();
                                    }
                                }
                                catch (e) {
                                    if (cv(2))
                                        logWithLineNumbers_js_1.lle(e);
                                    cb();
                                }
                            }
                            else {
                                ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE server=?;", [server[0].server], cb);
                            }
                        });
                    }, function () {
                        if (typeof callback === "function")
                            callback();
                    });
                }
                else {
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No queue!", colors_js_1.default.Reset);
                    if (typeof callback === "function")
                        callback();
                }
            });
        });
    }
}
var pool = mysql.createPool(mySqlConnectionOptions); //TODO: pool(to many open connections)
pool.getConnection(function (err, connection) {
    if (err) {
        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, "Could not connect to database!", colors_js_1.default.Reset);
        throw err;
    }
    else {
        connection.release();
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Successfully connected to database!" + colors_js_1.default.Reset);
        if (module.parent === null) {
            if (config_js_1.default.eMail.useTestAccount) {
                nodemailer.createTestAccount(function (err, account) {
                    if (err) {
                        logWithLineNumbers_js_1.lle(err);
                        transporter = {
                            sendMail: function sendMail() {
                                logWithLineNumbers_js_1.lle("can't send mail after Mail error");
                            },
                            options: {
                                host: "Failed to get test Account"
                            }
                        };
                    }
                    else {
                        if (cv(0))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Got email test account:\n" + colors_js_1.default.FgCyan + util.inspect(account) + colors_js_1.default.Reset);
                        transporter = nodemailer.createTransport({
                            host: 'smtp.ethereal.email',
                            port: 587,
                            secure: false,
                            auth: {
                                user: account.user,
                                pass: account.pass // generated ethereal password
                            }
                        });
                    }
                    init();
                });
            }
            else {
                transporter = nodemailer.createTransport(config_js_1.default.eMail.account);
                init();
            }
        }
        else {
            if (cv(0))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Was required by another file -> Initialising exports" + colors_js_1.default.Reset);
            module.exports = {
                init: init,
                updateQueue: updateQueue,
                getFullQuery: getFullQuery,
                ITelexCom: ITelexCom
            };
        }
    }
});
if (cv(3)) {
    let exitHandler = function exitHandler(options, err) {
        if (options.cleanup)
            logWithLineNumbers_js_1.ll(`serverErrors:\n${util.inspect(ITelexCom.serverErrors, { depth: null })}`);
        if (options.exit)
            process.exit();
    };
    process.on('exit', exitHandler.bind(null, {
        cleanup: true
    }));
    process.on('SIGINT', exitHandler.bind(null, {
        exit: true
    }));
    process.on('SIGUSR1', exitHandler.bind(null, {
        exit: true
    }));
    process.on('SIGUSR2', exitHandler.bind(null, {
        exit: true
    }));
    process.on('uncaughtException', exitHandler.bind(null, {
        exit: true
    }));
}
