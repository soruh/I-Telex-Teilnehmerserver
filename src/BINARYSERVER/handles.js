"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../SHARED/config.js");
const constants = require("../BINARYSERVER/constants.js");
const misc_js_1 = require("../SHARED/misc.js");
const misc_js_2 = require("../SHARED/misc.js");
const sendQueue_js_1 = require("./sendQueue.js");
// import { lookup } from "dns";
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
for (let i = 1; i <= 10; i++)
    handles[i] = {};
handles[255] = {};
//handes[type][state of this client.connection]
//handles[2][constants.states.STANDBY] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
//handles[4][WAITING] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
handles[1][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    var { number, pin, port } = pkg.data;
    if (client.ipFamily == 6) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} with an ipv6 address`);
        client.connection.end();
        return void misc_js_1.sendEmail("ipV6DynIpUpdate", {
            "Ip": client.ipAddress,
            "number": number.toString(),
            "date": new Date().toLocaleString(),
            "timeZone": misc_js_1.getTimezone(new Date())
        })
            .then(resolve)
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    }
    if (number < 10000) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} which is too small(<10000)`);
        return void misc_js_1.sendEmail("invalidNumber", {
            "Ip": client.ipAddress,
            "number": number.toString(),
            "date": new Date().toLocaleString(),
            "timeZone": misc_js_1.getTimezone(new Date())
        })
            .then(() => {
            client.connection.end();
            resolve();
        })
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    }
    misc_js_2.SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0;`, [number])
        .then((entries) => {
        if (!entries)
            return void resolve();
        let [entry] = entries;
        if (entry) {
            if (entry.type != 5) {
                logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} which is not of DynIp type`);
                client.connection.end();
                return void misc_js_1.sendEmail("wrongDynIpType", {
                    "type": entry.type.toString(),
                    "Ip": client.ipAddress,
                    "number": entry.number.toString(),
                    "name": entry.name,
                    "date": new Date().toLocaleString(),
                    "timeZone": misc_js_1.getTimezone(new Date())
                })
                    .then(resolve)
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
            }
            if (entry.pin != pin) {
                logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} with an invalid pin`);
                client.connection.end();
                return void misc_js_1.sendEmail("wrongDynIpPin", {
                    "Ip": client.ipAddress,
                    "number": entry.number.toString(),
                    "name": entry.name,
                    "date": new Date().toLocaleString(),
                    "timeZone": misc_js_1.getTimezone(new Date())
                })
                    .then(resolve)
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
            }
            if (client.ipAddress == entry.ipaddress && port == entry.port) {
                logger.log('debug', misc_js_1.inspect `not UPDATING, nothing to update`);
                return void client.sendPackage({
                    type: 2,
                    data: {
                        ipaddress: client.ipAddress
                    }
                }, () => resolve());
            }
            misc_js_2.SqlQuery(`UPDATE teilnehmer SET port = ?, ipaddress = ?, changed = 1, timestamp = ? WHERE number = ? OR (Left(name, ?) = Left(?, ?) AND port = ? AND pin = ? AND type = 5)`, [
                port, client.ipAddress, Math.floor(Date.now() / 1000), number,
                config_js_1.default.DynIpUpdateNameDifference, entry.name, config_js_1.default.DynIpUpdateNameDifference, entry.port, entry.pin
            ])
                // .then(()=>SqlQuery(`SELECT * FROM teilnehmer WHERE number = ?;`, [number]))
                // .then((result_c:ITelexCom.peerList)=>{
                // 	ipaddress = result_c[0].ipaddress;
                // 	client.sendPackage({type: 2, data: {ipaddress}}, ()=>resolve());
                // })
                .then(() => {
                client.sendPackage({
                    type: 2,
                    data: {
                        ipaddress: client.ipAddress
                    }
                }, () => {
                    sendQueue_js_1.default()
                        .then(() => resolve())
                        .catch((err) => reject(err));
                });
            })
                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
        }
        else {
            misc_js_2.SqlQuery(`DELETE FROM teilnehmer WHERE number=?;`, [number])
                .then(() => misc_js_2.SqlQuery(`INSERT INTO teilnehmer(name, timestamp, type, number, port, pin, hostname, extension, ipaddress, disabled, changed) VALUES (${"?, ".repeat(11).slice(0, -2)});`, ['?', Math.floor(Date.now() / 1000), 5, number, port, pin, "", "", client.ipAddress, 1, 1]))
                .then(function (result) {
                if (!(result && result.affectedRows)) {
                    logger.log('error', misc_js_1.inspect `could not create entry`);
                    return void resolve();
                }
                misc_js_1.sendEmail("new", {
                    "Ip": client.ipAddress,
                    "number": number.toString(),
                    "date": new Date().toLocaleString(),
                    "timeZone": misc_js_1.getTimezone(new Date())
                })
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
                client.sendPackage({
                    type: 2,
                    data: {
                        ipaddress: client.ipAddress
                    }
                }, () => resolve());
            })
                .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
        }
    })
        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
});
handles[3][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (pkg.data.version != 1) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} sent a package with version ${pkg.data.version} which is not supported by this server`);
        return void client.sendPackage({ type: 4 }, () => resolve());
    }
    misc_js_2.SqlQuery(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0 AND disabled != 1;`, [pkg.data.number])
        .then(function (result) {
        if (result && result.length == 1) {
            let [data] = result;
            data.pin = "0";
            client.sendPackage({
                type: 5,
                data
            }, () => resolve());
        }
        else {
            client.sendPackage({
                type: 4
            }, () => resolve());
        }
    })
        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
});
handles[5][constants.states.FULLQUERY] =
    handles[5][constants.states.LOGIN] = (pkg, client) => new Promise((resolve, reject) => {
        if (!client)
            return void resolve();
        var names = ["number", "name", "type", "hostname", "ipaddress", "port", "extension", "pin", "disabled", "timestamp"];
        names = names.filter(name => pkg.data[name] !== undefined);
        var values = names.map(name => pkg.data[name]);
        logger.log('verbose network', misc_js_1.inspect `got dataset for: ${pkg.data.name} (${pkg.data.number}) by server ${client.name}`);
        misc_js_2.SqlQuery(`SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number])
            .then((entries) => {
            if (!entries)
                return void resolve();
            var [entry] = entries;
            if (entry) {
                if (typeof client.newEntries != "number")
                    client.newEntries = 0;
                if (pkg.data.timestamp <= entry.timestamp) {
                    logger.log('debug', misc_js_1.inspect `recieved entry is ${+entry.timestamp - pkg.data.timestamp} seconds older and was ignored`);
                    return void client.sendPackage({
                        type: 8
                    }, () => resolve());
                }
                client.newEntries++;
                logger.log('network', misc_js_1.inspect `got new dataset for: ${pkg.data.name}`);
                logger.log('debug', misc_js_1.inspect `recieved entry is ${+pkg.data.timestamp - entry.timestamp} seconds newer  > ${entry.timestamp}`);
                misc_js_2.SqlQuery(`UPDATE teilnehmer SET ${names.map(name => name + " = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([config_js_1.default.setChangedOnNewerEntry ? 1 : 0, pkg.data.number]))
                    .then(() => client.sendPackage({
                    type: 8
                }, () => resolve()))
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
            }
            else if (pkg.data.type == 0) {
                logger.log('debug', misc_js_1.inspect `not inserting deleted entry: ${pkg.data}`);
                client.sendPackage({
                    type: 8
                }, () => resolve());
            }
            else {
                misc_js_2.SqlQuery(`INSERT INTO teilnehmer (${names.join(",") + (names.length > 0 ? "," : "")} changed) VALUES(${"?,".repeat(names.length + 1).slice(0, -1)});`, values.concat([
                    config_js_1.default.setChangedOnNewerEntry ? 1 : 0
                ]))
                    .then(() => client.sendPackage({
                    type: 8
                }, () => resolve()))
                    .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
            }
        })
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    });
handles[6][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (pkg.data.serverpin != config_js_1.default.serverPin && !(readonly && config_js_1.default.allowFullQueryInReadonly)) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to perform a FullQuery with an invalid serverpin`);
        client.connection.end();
        return void misc_js_1.sendEmail("wrongServerPin", {
            "Ip": client.ipAddress,
            "date": new Date().toLocaleString(),
            "timeZone": misc_js_1.getTimezone(new Date())
        })
            .then(() => resolve())
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    }
    logger.log('debug', misc_js_1.inspect `serverpin is correct!`);
    misc_js_2.SqlQuery("SELECT  * FROM teilnehmer;")
        .then((result) => {
        if (!result)
            result = [];
        client.writebuffer = result;
        client.state = constants.states.RESPONDING;
        return handlePackage({
            type: 8
        }, client);
    })
        .then(() => resolve())
        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
});
handles[7][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    if (pkg.data.serverpin != config_js_1.default.serverPin && !(readonly && config_js_1.default.allowLoginInReadonly)) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to perform a Login with an invalid serverpin`);
        client.connection.end();
        return void misc_js_1.sendEmail("wrongServerPin", {
            "Ip": client.ipAddress,
            "date": new Date().toLocaleString(),
            "timeZone": misc_js_1.getTimezone(new Date())
        })
            .then(() => resolve())
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    }
    logger.log('debug', misc_js_1.inspect `serverpin is correct!`);
    client.state = constants.states.LOGIN;
    client.sendPackage({
        type: 8
    }, () => resolve());
});
handles[8][constants.states.RESPONDING] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    logger.log('debug', misc_js_1.inspect `entrys to transmit: ${client.writebuffer.length}`);
    if (client.writebuffer.length === 0) {
        logger.log('network', misc_js_1.inspect `transmited all entries for: ${client.name}`);
        client.state = constants.states.STANDBY;
        return void client.sendPackage({
            type: 9
        }, () => resolve());
    }
    let data = client.writebuffer.shift();
    logger.log('network', misc_js_1.inspect `sent dataset for ${data.name} (${data.number})`);
    client.sendPackage({
        type: 5,
        data
    }, () => resolve());
});
handles[9][constants.states.FULLQUERY] =
    handles[9][constants.states.LOGIN] = (pkg, client) => new Promise((resolve, reject) => {
        if (!client)
            return void resolve();
        client.state = constants.states.STANDBY;
        if (typeof client.cb === "function")
            client.cb();
        client.connection.end();
        sendQueue_js_1.default()
            .then(() => resolve())
            .catch((err) => reject(err));
    });
handles[10][constants.states.STANDBY] = (pkg, client) => new Promise((resolve, reject) => {
    if (!client)
        return void resolve();
    var { pattern, version } = pkg.data;
    if (pkg.data.version != 1) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} sent a package with version ${pkg.data.version} which is not supported by this server`);
        client.writebuffer = [];
        return void handlePackage({ type: 8 }, client)
            .then(() => resolve())
            .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
    }
    var searchWords = pattern.split(" ");
    searchWords = searchWords.map(q => `%${q}%`);
    var searchstring = `SELECT * FROM teilnehmer WHERE disabled != 1 AND type != 0${" AND name LIKE ?".repeat(searchWords.length)};`;
    misc_js_2.SqlQuery(searchstring, searchWords)
        .then(function (result) {
        if (!result)
            result = [];
        logger.log('network', misc_js_1.inspect `found ${result.length} public entries matching pattern ${pattern}`);
        logger.log('debug', misc_js_1.inspect `entries matching pattern ${pattern}:\n${result}`);
        client.state = constants.states.RESPONDING;
        client.writebuffer = result;
        return handlePackage({ type: 8 }, client);
    })
        .then(() => resolve())
        .catch(err => { logger.log('error', misc_js_1.inspect `${err}`); });
});
handles[255][constants.states.RESPONDING] =
    handles[255][constants.states.FULLQUERY] =
        handles[255][constants.states.STANDBY] =
            handles[255][constants.states.LOGIN] =
                (pkg, client) => new Promise((resolve, reject) => {
                    if (!client)
                        return void resolve();
                    logger.log('error', misc_js_1.inspect `server sent error message: ${pkg}`);
                });
function handlePackage(obj, client) {
    return new Promise((resolve, reject) => {
        if (!obj) {
            logger.log('warning', misc_js_1.inspect `no package to handle`);
            resolve();
        }
        else {
            logger.log('debug', misc_js_1.inspect `state: ${misc_js_1.symbolName(client.state)}`);
            try {
                logger.log('network', misc_js_1.inspect `handling package of type ${constants.PackageNames[obj.type]} (${obj.type}) for ${client.name} in state ${misc_js_1.symbolName(client.state)}`);
                logger.log('verbose network', misc_js_1.inspect `handling package: ${obj}`);
                if (typeof handles[obj.type][client.state] == "function") {
                    try {
                        handles[obj.type][client.state](obj, client)
                            .then(resolve)
                            .catch(reject);
                    }
                    catch (e) {
                        logger.log('error', misc_js_1.inspect `${e}`);
                        resolve();
                    }
                }
                else {
                    logger.log('warning', misc_js_1.inspect `client ${client.name} sent a package of type ${constants.PackageNames[obj.type]} (${obj.type}) which is not supported in state ${misc_js_1.symbolName(client.state)}`);
                    resolve();
                }
            }
            catch (e) {
                logger.log('error', misc_js_1.inspect `${e}`);
                resolve();
            }
        }
    });
}
exports.handlePackage = handlePackage;
