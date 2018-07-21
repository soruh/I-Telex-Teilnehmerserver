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
const constants = require("../BINARYSERVER/constants.js");
const misc_js_1 = require("./misc.js");
const misc_js_2 = require("./misc.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
const cv = config_js_1.default.cv;
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
for (let i = 1; i <= 10; i++)
    handles[i] = {};
//handes[type][state of this client.connection]
//handles[2][constants.states.STANDBY] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
//handles[4][WAITING] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
handles[1][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    var { number, pin, port } = pkg.data;
    var ipaddress = client.connection.remoteAddress.replace(/^.*:/, '');
    if (number < 10000) {
        if (cv(1))
            logWithLineNumbers_js_1.lle(`${colors_js_1.default.FgRed}client ${colors_js_1.default.FgCyan + client.name + colors_js_1.default.FgRed} tried to update ${number} which is too small(<10000)${colors_js_1.default.Reset}`);
        return void misc_js_1.sendEmail("invalidNumber", {
            "[IpFull]": client.connection.remoteAddress,
            "[Ip]": ipaddress,
            "[number]": number,
            "[date]": new Date().toLocaleString(),
            "[timeZone]": getTimezone(new Date())
        })
            .then(() => {
            client.connection.end();
            resolve();
        })
            .catch(logWithLineNumbers_js_1.lle);
    }
    misc_js_2.SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number])
        .then((entries) => {
        if (!entries)
            return void resolve();
        let [entry] = entries.filter(x => x.type != 0);
        if (entry) {
            if (entry.type != 5) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "not DynIp type" + colors_js_1.default.Reset);
                client.connection.end();
                return void misc_js_1.sendEmail("wrongDynIpType", {
                    "[type]": entry.type,
                    "[IpFull]": client.connection.remoteAddress,
                    "[Ip]": ipaddress,
                    "[number]": entry.number,
                    "[name]": entry.name,
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                })
                    .then(resolve)
                    .catch(logWithLineNumbers_js_1.lle);
            }
            if (entry.pin != pin) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "wrong DynIp pin" + colors_js_1.default.Reset);
                client.connection.end();
                return void misc_js_1.sendEmail("wrongDynIpPin", {
                    "[Ip]": ipaddress,
                    "[number]": entry.number,
                    "[name]": entry.name,
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                })
                    .then(resolve)
                    .catch(logWithLineNumbers_js_1.lle);
            }
            if (ipaddress == entry.ipaddress && port == entry.port) {
                if (cv(2))
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgYellow}not UPDATING, nothing to update${colors_js_1.default.Reset}`);
                return void client.connection.write(ITelexCom.encPackage({ type: 2, data: { ipaddress } }), () => resolve());
            }
            misc_js_2.SqlQuery(`UPDATE teilnehmer SET 
				port = ?, ipaddress = ?, changed = 1, timestamp = ? WHERE
				number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`, [
                port, ipaddress, Math.floor(Date.now() / 1000), number,
                config_js_1.default.DynIpUpdateNameDifference, entry.name, config_js_1.default.DynIpUpdateNameDifference, entry.port, entry.pin
            ])
                // .then(()=>SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number]))
                // .then((result_c:ITelexCom.peerList)=>{
                // 	ipaddress = result_c[0].ipaddress;
                // 	client.connection.write(ITelexCom.encPackage({type: 2, data: {ipaddress}}), ()=>resolve());
                // })
                .then(() => {
                client.connection.write(ITelexCom.encPackage({ type: 2, data: { ipaddress } }), () => resolve());
            })
                .catch(logWithLineNumbers_js_1.lle);
        }
        else {
            misc_js_2.SqlQuery(`DELETE FROM teilnehmer WHERE number=?;`, [number])
                .then(() => misc_js_2.SqlQuery(`INSERT INTO teilnehmer(name, timestamp, type, number, port, pin, hostname, extension, ipaddress, disabled, changed)
				VALUES (${"?, ".repeat(11)});`, ['?', Math.floor(Date.now() / 1000), 5, number, port, pin, "", "", ipaddress, 1, 1]))
                .then(function (result) {
                if (!(result && result.affectedRows)) {
                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "could not create entry", colors_js_1.default.Reset);
                    return void resolve();
                }
                misc_js_1.sendEmail("new", {
                    "[IpFull]": client.connection.remoteAddress,
                    "[Ip]": ipaddress,
                    "[number]": number,
                    "[date]": new Date().toLocaleString(),
                    "[timeZone]": getTimezone(new Date())
                })
                    .catch(logWithLineNumbers_js_1.lle);
                client.connection.write(ITelexCom.encPackage({ type: 2, data: { ipaddress } }), () => resolve());
            })
                .catch(logWithLineNumbers_js_1.lle);
        }
    })
        .catch(logWithLineNumbers_js_1.lle);
});
handles[3][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (pkg.data.version != 1) {
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "unsupported package version, sending '0x04' package" + colors_js_1.default.Reset);
        return void client.connection.write(ITelexCom.encPackage({ type: 4 }), () => resolve());
    }
    misc_js_2.SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0 AND disabled != 1;`, [pkg.data.number])
        .then(function (result) {
        if (cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, result, colors_js_1.default.Reset);
        if (result && result.length == 1) {
            let [data] = result;
            data.pin = "0";
            client.connection.write(ITelexCom.encPackage({ type: 5, data }), () => resolve());
        }
        else {
            client.connection.write(ITelexCom.encPackage({ type: 4 }), () => resolve());
        }
    })
        .catch(logWithLineNumbers_js_1.lle);
});
handles[5][constants.states.FULLQUERY] =
    handles[5][constants.states.LOGIN] = (pkg, client) => new Promise((resolve, reject) => {
        if (!client)
            return void resolve();
        var names = ["number", "name", "type", "hostname", "ipaddress", "port", "extension", "pin", "disabled", "timestamp"];
        names = names.filter(name => pkg.data[name] !== undefined);
        var values = names.map(name => pkg.data[name]);
        if (cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got dataset for:" + colors_js_1.default.FgCyan + pkg.data.number + colors_js_1.default.Reset);
        misc_js_2.SqlQuery(`SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
            .then((entries) => {
            if (!entries)
                return void resolve();
            var [entry] = entries;
            if (entry) {
                if (typeof client.newEntries != "number")
                    client.newEntries = 0;
                if (pkg.data.timestamp <= entry.timestamp) {
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "recieved entry is " + colors_js_1.default.FgCyan + (+entry.timestamp - pkg.data.timestamp) + colors_js_1.default.FgYellow + " seconds older and was ignored" + colors_js_1.default.Reset);
                    return void client.connection.write(ITelexCom.encPackage({ type: 8 }), () => resolve());
                }
                client.newEntries++;
                if (cv(1) && !cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "got new dataset for:" + colors_js_1.default.FgCyan + pkg.data.number + colors_js_1.default.Reset);
                if (cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved entry is " + colors_js_1.default.FgCyan + (pkg.data.timestamp - entry.timestamp) + "seconds newer" + colors_js_1.default.FgGreen + " > " + colors_js_1.default.FgCyan + entry.timestamp + colors_js_1.default.Reset);
                misc_js_2.SqlQuery(`UPDATE teilnehmer SET ${names.map(name => name + " = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([config_js_1.default.setChangedOnNewerEntry ? 1 : 0, pkg.data.number]))
                    .then(() => client.connection.write(ITelexCom.encPackage({ type: 8 }), () => resolve()))
                    .catch(logWithLineNumbers_js_1.lle);
            }
            else {
                misc_js_2.SqlQuery(`
				INSERT INTO teilnehmer (
					${names.join(",") + (names.length > 0 ? "," : "")} changed
				) VALUES(
				${"?,".repeat(names.length + 1).slice(0, -1)});`, values.concat([
                    config_js_1.default.setChangedOnNewerEntry ? 1 : 0
                ]))
                    .then(() => client.connection.write(ITelexCom.encPackage({ type: 8 }), () => resolve()))
                    .catch(logWithLineNumbers_js_1.lle);
            }
        })
            .catch(logWithLineNumbers_js_1.lle);
    });
handles[6][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (pkg.data.serverpin != config_js_1.default.serverPin && !(readonly && config_js_1.default.allowFullQueryInReadonly)) {
        if (cv(1)) {
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect! " + colors_js_1.default.FgCyan + pkg.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + " ending client.connection!" + colors_js_1.default.Reset); //TODO: remove pin logging
            client.connection.end();
        }
        return void misc_js_1.sendEmail("wrongServerPin", {
            "[IpFull]": client.connection.remoteAddress,
            "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
            "[date]": new Date().toLocaleString(),
            "[timeZone]": getTimezone(new Date())
        })
            .then(() => resolve())
            .catch(logWithLineNumbers_js_1.lle);
    }
    if (cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
    misc_js_2.SqlQuery("SELECT  * FROM teilnehmer;")
        .then((result) => {
        if (!result || result.length === 0)
            return void client.connection.write(ITelexCom.encPackage({ type: 9 }), () => resolve());
        client.writebuffer = result;
        client.state = constants.states.RESPONDING;
        return ITelexCom.handlePackage({ type: 8 }, client);
    })
        .then(() => resolve())
        .catch(logWithLineNumbers_js_1.lle);
});
handles[7][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (pkg.data.serverpin != config_js_1.default.serverPin && !(readonly && config_js_1.default.allowLoginInReadonly)) {
        if (cv(1)) {
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "serverpin is incorrect!" + colors_js_1.default.FgCyan + pkg.data.serverpin + colors_js_1.default.FgRed + " != " + colors_js_1.default.FgCyan + config_js_1.default.serverPin + colors_js_1.default.FgRed + "ending client.connection!" + colors_js_1.default.Reset);
            client.connection.end();
        }
        return void misc_js_1.sendEmail("wrongServerPin", {
            "[IpFull]": client.connection.remoteAddress,
            "[Ip]": (ip.isV4Format(client.connection.remoteAddress.split("::")[1]) ? client.connection.remoteAddress.split("::")[1] : client.connection.remoteAddress),
            "[date]": new Date().toLocaleString(),
            "[timeZone]": getTimezone(new Date())
        })
            .then(() => resolve())
            .catch(logWithLineNumbers_js_1.lle);
    }
    if (cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "serverpin is correct!", colors_js_1.default.Reset);
    client.state = constants.states.LOGIN;
    client.connection.write(ITelexCom.encPackage({ type: 8 }), () => resolve());
});
handles[8][constants.states.RESPONDING] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (cv(2)) {
        let toSend = [];
        for (let o of client.writebuffer) {
            toSend.push(o.number);
        }
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "entrys to transmit:" + colors_js_1.default.FgCyan + (cv(3) ? util.inspect(toSend).replace(/\n/g, "") : toSend.length) + colors_js_1.default.Reset);
    }
    if (client.writebuffer.length === 0) {
        client.state = constants.states.STANDBY;
        return void client.connection.write(ITelexCom.encPackage({ type: 9 }), () => resolve());
    }
    let data = client.writebuffer.shift();
    if (cv(1))
        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}sent dataset for ${colors_js_1.default.FgCyan}${data.name} (${data.number})${colors_js_1.default.Reset}`);
    client.connection.write(ITelexCom.encPackage({ type: 5, data }), () => resolve());
});
handles[9][constants.states.FULLQUERY] =
    handles[9][constants.states.LOGIN] = (pkg, client) => new Promise((resolve, reject) => {
        if (!client)
            return void resolve();
        client.state = constants.states.STANDBY;
        if (typeof client.cb === "function")
            client.cb();
        client.connection.end();
        resolve();
    });
handles[10][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    var { pattern, version } = pkg.data;
    var searchWords = pattern.split(" ");
    searchWords = searchWords.map(q => `%${q}%`);
    var searchstring = `SELECT * FROM teilnehmer WHERE true${" AND name LIKE ?".repeat(searchWords.length)};`;
    misc_js_2.SqlQuery(searchstring, searchWords)
        .then(function (result) {
        if (!result || result.length == 0)
            return void client.connection.write(ITelexCom.encPackage({ type: 9 }), () => resolve());
        client.state = constants.states.RESPONDING;
        client.writebuffer = result
            .filter(x => x.disabled != 1 && x.type != 0)
            .map(x => { x.pin = "0"; return x; });
        return ITelexCom.handlePackage({ type: 8 }, client);
    })
        .then(() => resolve())
        .catch(logWithLineNumbers_js_1.lle);
});
exports.default = handles;
