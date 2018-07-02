"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getTimezone(date) {
    let offset = -1 * date.getTimezoneOffset();
    let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
    return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}
//#region imports
const util = require("util");
const mysql = require("mysql");
const ip = require("ip");
const config_js_1 = require("../COMMONMODULES/config.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const ITelexCom_js_1 = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const connections = require("../BINARYSERVER/connections.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
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
//handes[packagetype][state of this client.connection]
//handles[2][constants.states.STANDBY] = (obj,cnum,pool,client.connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,pool,client.connection)=>{}; NOT USED
handles[1][constants.states.STANDBY] = function (obj, client, pool, cb) {
    try {
        if (client) {
            var number = obj.data.rufnummer;
            var pin = obj.data.pin;
            var port = obj.data.port;
            var ipaddress = client.connection.remoteAddress.replace(/^.*:/, '');
            if (number < 10000) {
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.lle(`${colors_js_1.default.FgRed}client tried to update ${number} which is too small(<10000)${colors_js_1.default.Reset}`);
                ITelexCom.sendEmail("invalidNumber", {
                    "[IpFull]": client.connection.remoteAddress,
                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
                    "[number]": number,
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                }, function () {
                    client.connection.end();
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
                                                client.connection.write(ITelexCom.encPackage({
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
                                                if (ITelexCom_js_1.cv(0))
                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                                                if (typeof cb === "function")
                                                    cb();
                                            }
                                        });
                                    });
                                }
                                else {
                                    if (ITelexCom_js_1.cv(2))
                                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgYellow}not UPDATING, nothing to update${colors_js_1.default.Reset}`);
                                    client.connection.write(ITelexCom.encPackage({
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
                                if (ITelexCom_js_1.cv(1))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "not DynIp type" + colors_js_1.default.Reset);
                                client.connection.end();
                                ITelexCom.sendEmail("wrongDynIpType", {
                                    "[typ]": res.typ,
                                    "[IpFull]": client.connection.remoteAddress,
                                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
                                    "[number]": res.rufnummer,
                                    "[name]": res.name,
                                    "[date]": new Date().toLocaleString(),
                                    "[timeZone]": getTimezone(new Date())
                                }, cb);
                            }
                        }
                        else {
                            if (ITelexCom_js_1.cv(1))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "wrong DynIp pin" + colors_js_1.default.Reset);
                            client.connection.end();
                            ITelexCom.sendEmail("wrongDynIpPin", {
                                "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
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
                            client.connection.remoteAddress.replace(/^.*:/, ''),
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
                                ITelexCom.sendEmail("new", {
                                    "[IpFull]": client.connection.remoteAddress,
                                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
                                    "[number]": number,
                                    "[date]": new Date().toLocaleString(),
                                    "[timeZone]": getTimezone(new Date())
                                }, cb);
                                ITelexCom.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE rufnummer = ?;`, [number], function (result_c) {
                                    try {
                                        client.connection.write(ITelexCom.encPackage({
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
                                        if (ITelexCom_js_1.cv(0))
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[3][constants.states.STANDBY] = function (obj, client, pool, cb) {
    try {
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
                    if (ITelexCom_js_1.cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, result, colors_js_1.default.Reset);
                    if ((result[0] != undefined) && (result != [])) {
                        let data = result[0];
                        data.pin = 0;
                        data.port = parseInt(result[0].port);
                        client.connection.write(ITelexCom.encPackage({
                            packagetype: 5,
                            datalength: 100,
                            data: data
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                    else {
                        client.connection.write(ITelexCom.encPackage({
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
                if (ITelexCom_js_1.cv(0))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed, "unsupported package version, sending '0x04' package", colors_js_1.default.Reset);
                client.connection.write(ITelexCom.encPackage({
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[5][constants.states.FULLQUERY] = function (obj, client, pool, cb) {
    try {
        if (client) {
            if (ITelexCom_js_1.cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got dataset for:", colors_js_1.default.FgCyan, obj.data.rufnummer, colors_js_1.default.Reset);
            ITelexCom.SqlQuery(pool, `SELECT * from teilnehmer WHERE rufnummer = ?;`, [obj.data.rufnummer], function (entries) {
                var o = {
                    rufnummer: obj.data.rufnummer,
                    name: obj.data.name,
                    typ: obj.data.type,
                    hostname: obj.data.hostname,
                    ipaddresse: obj.data.ipaddress,
                    port: obj.data.port,
                    extension: obj.data.extension,
                    pin: obj.data.pin,
                    gesperrt: obj.data.disabled,
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
                //       if(typeof callback === "function") callback(address,entries,o,client.connection,cb);
                //     });
                //   }else{
                //     if(typeof callback === "function") callback(null,entries,o,client.connection,cb);
                //   }
                // }
                if (entries.length == 1) {
                    var entry = entries[0];
                    if (typeof client.newEntries != "number")
                        client.newEntries = 0;
                    if (obj.data.timestamp > +entry.moddate) {
                        client.newEntries++;
                        if (ITelexCom_js_1.cv(1) && !ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got new dataset for:", colors_js_1.default.FgCyan, obj.data.rufnummer, colors_js_1.default.Reset);
                        // lookup((doLU?o.hostname:false),function(addr,entry,o,client.connection,cb){
                        //   if(doLU&&addr){
                        //     o.ipaddresse = addr;
                        //   }
                        if (ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved entry is " + colors_js_1.default.FgCyan + (obj.data.timestamp - +entry.moddate) + "seconds newer" + colors_js_1.default.FgGreen + " > " + colors_js_1.default.FgCyan + entry.moddate + colors_js_1.default.Reset);
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
                            client.connection.write(ITelexCom.encPackage({
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
                        if (ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "recieved entry is " + colors_js_1.default.FgCyan + (+entry.moddate - obj.data.timestamp) + colors_js_1.default.FgYellow + " seconds older and was ignored" + colors_js_1.default.Reset);
                        client.connection.write(ITelexCom.encPackage({
                            packagetype: 8,
                            datalength: 0
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                }
                else if (entries.length == 0) {
                    // lookup((doLU?o.hostname:false),function(addr,entry,o,client.connection,cb){
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
                        client.connection.write(ITelexCom.encPackage({
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
                    if (ITelexCom_js_1.cv(0))
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[5][constants.states.LOGIN] = handles[5][constants.states.FULLQUERY];
handles[6][constants.states.STANDBY] = function (obj, client, pool, cb) {
    try {
        if (client) {
            if (obj.data.serverpin == config_js_1.default.serverPin || (readonly && config_js_1.default.allowFullQueryInReadonly)) {
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
                client = connections.get(connections.move(client.cnum, "S"));
                ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer;", [], function (result) {
                    if ((result[0] != undefined) && (result != [])) {
                        client.writebuffer = result;
                        client.state = constants.states.RESPONDING;
                        ITelexCom.handlePackage({
                            packagetype: 8,
                            datalength: 0,
                            data: {}
                        }, client, pool, cb);
                    }
                    else {
                        client.connection.write(ITelexCom.encPackage({
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
                if (ITelexCom_js_1.cv(1)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect! " + colors_js_1.default.FgCyan + obj.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + " ending client.connection!" + colors_js_1.default.Reset); //TODO: remove pin logging
                    client.connection.end();
                }
                ITelexCom.sendEmail("wrongServerPin", {
                    "[IpFull]": client.connection.remoteAddress,
                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[7][constants.states.STANDBY] = function (obj, client, pool, cb) {
    try {
        if (client) {
            if ((obj.data.serverpin == config_js_1.default.serverPin) || (readonly && config_js_1.default.allowLoginInReadonly)) {
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
                client = connections.get(connections.move(client.cnum, "S"));
                client.connection.write(ITelexCom.encPackage({
                    packagetype: 8,
                    datalength: 0
                }), function () {
                    client.state = constants.states.LOGIN;
                    if (typeof cb === "function")
                        cb();
                });
            }
            else {
                if (ITelexCom_js_1.cv(1)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect!" + colors_js_1.default.FgCyan + obj.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + "ending client.connection!" + colors_js_1.default.Reset);
                    client.connection.end();
                }
                ITelexCom.sendEmail("wrongServerPin", {
                    "[IpFull]": client.connection.remoteAddress,
                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[8][constants.states.RESPONDING] = function (obj, client, pool, cb) {
    try {
        if (client) {
            if (ITelexCom_js_1.cv(1)) {
                var toSend = [];
                for (let o of client.writebuffer) {
                    toSend.push(o.rufnummer);
                }
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "entrys to transmit:" + colors_js_1.default.FgCyan + (ITelexCom_js_1.cv(2) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors_js_1.default.Reset);
            }
            if (client.writebuffer.length > 0) {
                client.connection.write(ITelexCom.encPackage({
                    packagetype: 5,
                    datalength: 100,
                    data: client.writebuffer[0]
                }), function () {
                    if (ITelexCom_js_1.cv(1))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "sent dataset for:", colors_js_1.default.FgCyan, client.writebuffer[0].rufnummer, colors_js_1.default.Reset);
                    client.writebuffer = client.writebuffer.slice(1);
                    if (typeof cb === "function")
                        cb();
                });
            }
            else if (client.writebuffer.length == 0) {
                client.connection.write(ITelexCom.encPackage({
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[9][constants.states.FULLQUERY] = function (obj, client, pool, cb) {
    try {
        if (client) {
            client.state = constants.states.STANDBY;
            if (typeof client.cb === "function")
                client.cb();
            if (typeof cb === "function")
                cb();
            client.connection.end();
        }
        else {
            if (typeof cb === "function")
                cb();
        }
    }
    catch (e) {
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
handles[9][constants.states.LOGIN] = handles[9][constants.states.FULLQUERY];
handles[10][constants.states.STANDBY] = function (obj, client, pool, cb) {
    try {
        if (client) {
            if (ITelexCom_js_1.cv(2))
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
                    }, client, pool, cb);
                }
                else {
                    client.connection.write(ITelexCom.encPackage({
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
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        if (typeof cb === "function")
            cb();
    }
};
exports.default = handles;