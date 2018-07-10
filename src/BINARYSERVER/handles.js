"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getTimezone(date) {
    let offset = -1 * date.getTimezoneOffset();
    let offsetStr = ("0" + Math.floor(offset / 60)).slice(-2) + ":" + ("0" + offset % 60).slice(-2);
    return ("UTC" + (offsetStr[0] == "-" ? "" : "+") + offsetStr);
}
//#region imports
const util = require("util");
const ip = require("ip");
const config_js_1 = require("../COMMONMODULES/config.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const ITelexCom_js_1 = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const connections = require("../BINARYSERVER/connections.js");
const misc = require("../BINARYSERVER/misc.js");
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
//handles[2][constants.states.STANDBY] = (pkg,cnum,pool,client.connection)=>{}; NOT USED
//handles[4][WAITING] = (pkg,cnum,pool,client.connection)=>{}; NOT USED
handles[1][constants.states.STANDBY] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            var number = pkg.data.number;
            var pin = pkg.data.pin;
            var port = pkg.data.port;
            var ipaddress = client.connection.remoteAddress.replace(/^.*:/, '');
            if (number < 10000) {
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.lle(`${colors_js_1.default.FgRed}client tried to update ${number} which is too small(<10000)${colors_js_1.default.Reset}`);
                misc.sendEmail("invalidNumber", {
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
                misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number = ?;`, [number])
                    .then(function (result_a) {
                    let results = [];
                    if (result_a) {
                        for (let r of result_a) {
                            if (r.type != 0) {
                                results.push(r);
                            }
                        }
                    }
                    if (results.length == 1) {
                        var res = results[0];
                        if (res.type == 5) {
                            if (res.pin == pin) {
                                if (ipaddress != res.ipaddress || port != res.port) {
                                    misc.SqlQuery(pool, `UPDATE teilnehmer SET
										port = ?,
										ipaddress = ?,
										changed = 1,
										timestamp = ?
										WHERE number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`, [
                                        port,
                                        ipaddress,
                                        Math.floor(Date.now() / 1000),
                                        number,
                                        config_js_1.default.DynIpUpdateNameDifference,
                                        res.name,
                                        config_js_1.default.DynIpUpdateNameDifference,
                                        res.port,
                                        res.pin,
                                    ])
                                        .then(function (result_b) {
                                        misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number = ?;`, [number])
                                            .then(function (result_c) {
                                            try {
                                                client.connection.write(ITelexCom.encPackage({
                                                    packagetype: 2,
                                                    data: {
                                                        ipaddress: result_c[0].ipaddress
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
                                        data: {
                                            ipaddress: res.ipaddress
                                        }
                                    }), "binary", function () {
                                        if (typeof cb === "function")
                                            cb();
                                    });
                                }
                            }
                            else {
                                if (ITelexCom_js_1.cv(1))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "wrong DynIp pin" + colors_js_1.default.Reset);
                                client.connection.end();
                                misc.sendEmail("wrongDynIpPin", {
                                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
                                    "[number]": res.number,
                                    "[name]": res.name,
                                    "[date]": new Date().toLocaleString(),
                                    "[timeZone]": getTimezone(new Date())
                                }, cb);
                            }
                        }
                        else {
                            if (ITelexCom_js_1.cv(1))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "not DynIp type" + colors_js_1.default.Reset);
                            client.connection.end();
                            misc.sendEmail("wrongDynIpType", {
                                "[type]": res.type,
                                "[IpFull]": client.connection.remoteAddress,
                                "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
                                "[number]": res.number,
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
								timestamp,
								type,
								number,
								port,
								pin,
								hostname,
								extension,
								ipaddress,
								disabled,
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
                            "",
                            "",
                            client.connection.remoteAddress.replace(/^.*:/, ''),
                            1,
                            1
                        ];
                        let deleteQuery = `DELETE FROM teilnehmer WHERE number=?;`;
                        let deleteOptions = [number];
                        let query;
                        let options;
                        let exists = result_a && (result_a.length > 0);
                        if (exists) {
                            query = deleteQuery + insertQuery;
                            options = deleteOptions.concat(insertOptions);
                        }
                        else {
                            query = insertQuery;
                            options = insertOptions;
                        }
                        misc.SqlQuery(pool, query, options)
                            .then(function (result_b) {
                            if (result_b) {
                                misc.sendEmail("new", {
                                    "[IpFull]": client.connection.remoteAddress,
                                    "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
                                    "[number]": number,
                                    "[date]": new Date().toLocaleString(),
                                    "[timeZone]": getTimezone(new Date())
                                }, cb);
                                misc.SqlQuery(pool, `SELECT * FROM teilnehmer WHERE number = ?;`, [number])
                                    .then(function (result_c) {
                                    if (result_c.length > 0) {
                                        try {
                                            client.connection.write(ITelexCom.encPackage({
                                                packagetype: 2,
                                                data: {
                                                    ipaddress: result_c[0].ipaddress
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
                                    }
                                    else {
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
handles[3][constants.states.STANDBY] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            if (pkg.data.version == 1) {
                var number = pkg.data.number;
                misc.SqlQuery(pool, `
					SELECT * FROM teilnehmer WHERE
						number = ?
						and
						type != 0
						and
						disabled != 1
					;`, [number])
                    .then(function (result) {
                    if (ITelexCom_js_1.cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, result, colors_js_1.default.Reset);
                    if ((result[0] != undefined) && (result != [])) {
                        let data = result[0];
                        data.pin = "0";
                        client.connection.write(ITelexCom.encPackage({
                            packagetype: 5,
                            data
                        }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                    else {
                        client.connection.write(ITelexCom.encPackage({ packagetype: 4 }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                });
            }
            else {
                if (ITelexCom_js_1.cv(0))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed, "unsupported package version, sending '0x04' package", colors_js_1.default.Reset);
                client.connection.write(ITelexCom.encPackage({ packagetype: 4 }), function () {
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
handles[5][constants.states.FULLQUERY] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            if (ITelexCom_js_1.cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got dataset for:", colors_js_1.default.FgCyan, pkg.data.number, colors_js_1.default.Reset);
            misc.SqlQuery(pool, `SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
                .then(function (entries) {
                let names = [
                    "number",
                    "name",
                    "type",
                    "hostname",
                    "ipaddress",
                    "port",
                    "extension",
                    "pin",
                    "disabled",
                    "timestamp",
                ];
                names = names.filter(name => pkg.data[name] !== undefined);
                let values = names.map(name => pkg.data[name]);
                if (entries.length == 1) {
                    var entry = entries[0];
                    if (typeof client.newEntries != "number")
                        client.newEntries = 0;
                    if (pkg.data.timestamp > +entry.timestamp) {
                        client.newEntries++;
                        if (ITelexCom_js_1.cv(1) && !ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got new dataset for:", colors_js_1.default.FgCyan, pkg.data.number, colors_js_1.default.Reset);
                        if (ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved entry is " + colors_js_1.default.FgCyan + (pkg.data.timestamp - +entry.timestamp) + "seconds newer" + colors_js_1.default.FgGreen + " > " + colors_js_1.default.FgCyan + entry.timestamp + colors_js_1.default.Reset);
                        misc.SqlQuery(pool, `UPDATE teilnehmer SET ${names.map(name => name + " = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([
                            config_js_1.default.setChangedOnNewerEntry ? 1 : 0,
                            pkg.data.number
                        ]))
                            .then(function (res2) {
                            client.connection.write(ITelexCom.encPackage({ packagetype: 8 }), function () {
                                if (typeof cb === "function")
                                    cb();
                            });
                        });
                    }
                    else {
                        if (ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "recieved entry is " + colors_js_1.default.FgCyan + (+entry.timestamp - pkg.data.timestamp) + colors_js_1.default.FgYellow + " seconds older and was ignored" + colors_js_1.default.Reset);
                        client.connection.write(ITelexCom.encPackage({ packagetype: 8 }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                }
                else if (entries.length == 0) {
                    misc.SqlQuery(pool, `
						INSERT INTO teilnehmer 
						(
							${names.join(",")}		
							${names.length > 0 ? "," : ""}changed
						)
						VALUES
						(${"?,".repeat(names.length + 1).slice(0, -1)})
					;`, values.concat([
                        config_js_1.default.setChangedOnNewerEntry ? 1 : 0
                    ]))
                        .then(function (res2) {
                        client.connection.write(ITelexCom.encPackage({ packagetype: 8 }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    });
                }
                else {
                    if (ITelexCom_js_1.cv(0))
                        logWithLineNumbers_js_1.ll('The "number" field should be unique! This error should not occur!');
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
handles[6][constants.states.STANDBY] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            if (pkg.data.serverpin == config_js_1.default.serverPin || (readonly && config_js_1.default.allowFullQueryInReadonly)) {
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
                client = connections.get(connections.move(client.cnum, "S"));
                misc.SqlQuery(pool, "SELECT  * FROM teilnehmer;")
                    .then(function (result) {
                    if ((result[0] != undefined) && (result != [])) {
                        client.writebuffer = result;
                        client.state = constants.states.RESPONDING;
                        ITelexCom.handlePackage({ packagetype: 8 }, client, pool, cb);
                    }
                    else {
                        client.connection.write(ITelexCom.encPackage({ packagetype: 9 }), function () {
                            if (typeof cb === "function")
                                cb();
                        });
                    }
                });
            }
            else {
                if (ITelexCom_js_1.cv(1)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect! " + colors_js_1.default.FgCyan + pkg.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + " ending client.connection!" + colors_js_1.default.Reset); //TODO: remove pin logging
                    client.connection.end();
                }
                misc.sendEmail("wrongServerPin", {
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
handles[7][constants.states.STANDBY] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            if ((pkg.data.serverpin == config_js_1.default.serverPin) || (readonly && config_js_1.default.allowLoginInReadonly)) {
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
                client = connections.get(connections.move(client.cnum, "S"));
                client.connection.write(ITelexCom.encPackage({ packagetype: 8 }), function () {
                    client.state = constants.states.LOGIN;
                    if (typeof cb === "function")
                        cb();
                });
            }
            else {
                if (ITelexCom_js_1.cv(1)) {
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect!" + colors_js_1.default.FgCyan + pkg.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + "ending client.connection!" + colors_js_1.default.Reset);
                    client.connection.end();
                }
                misc.sendEmail("wrongServerPin", {
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
handles[8][constants.states.RESPONDING] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            if (ITelexCom_js_1.cv(1)) {
                var toSend = [];
                for (let o of client.writebuffer) {
                    toSend.push(o.number);
                }
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "entrys to transmit:" + colors_js_1.default.FgCyan + (ITelexCom_js_1.cv(2) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors_js_1.default.Reset);
            }
            if (client.writebuffer.length > 0) {
                client.connection.write(ITelexCom.encPackage({
                    packagetype: 5,
                    data: client.writebuffer[0]
                }), function () {
                    if (ITelexCom_js_1.cv(1))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "sent dataset for:", colors_js_1.default.FgCyan, client.writebuffer[0].number, colors_js_1.default.Reset);
                    client.writebuffer = client.writebuffer.slice(1);
                    if (typeof cb === "function")
                        cb();
                });
            }
            else if (client.writebuffer.length == 0) {
                client.connection.write(ITelexCom.encPackage({ packagetype: 9 }), function () {
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
handles[9][constants.states.FULLQUERY] = function (pkg, client, pool, cb) {
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
handles[10][constants.states.STANDBY] = function (pkg, client, pool, cb) {
    try {
        if (client) {
            if (ITelexCom_js_1.cv(2))
                logWithLineNumbers_js_1.ll(pkg);
            //			let version = pkg.data.version;
            let query = pkg.data.pattern;
            let queryarr = query.split(" ");
            let searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ?".repeat(queryarr.length)};`;
            misc.SqlQuery(pool, searchstring, queryarr.map(q => `%${q}%`))
                .then(function (result) {
                if ((result[0] != undefined) && (result != [])) {
                    var towrite = [];
                    for (let o of result) {
                        if (o.disabled != 1 && o.type != 0) {
                            o.pin = "0";
                            towrite.push(o);
                        }
                    }
                    client.writebuffer = towrite;
                    client.state = constants.states.RESPONDING;
                    ITelexCom.handlePackage({ packagetype: 8 }, client, pool, cb);
                }
                else {
                    client.connection.write(ITelexCom.encPackage({ packagetype: 9 }), function () {
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
