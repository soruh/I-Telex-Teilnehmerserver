"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../shared/config.js");
const constants = require("../shared/constants.js");
const misc_js_1 = require("../shared/misc.js");
const SQL_1 = require("../shared/SQL");
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
let handles = {}; // functions for handeling packages
for (let i = 1; i <= 10; i++)
    handles[i] = {};
handles[255] = {};
// handes[type][state of this client.socket]
// handles[2][constants.states.STANDBY] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
// handles[4][WAITING] = (pkg,client)=>{}; NOT RECIEVED BY SERVER
handles[1][constants.states.STANDBY] = async (pkg, client) => {
    if (!client)
        return;
    const { number, pin, port } = pkg.data;
    if (client.ipFamily === 6) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} with an ipv6 address`);
        client.sendError('na');
        misc_js_1.sendEmail("ipV6DynIpUpdate", {
            Ip: client.ipAddress,
            number: number.toString(),
            date: misc_js_1.printDate(),
            timeZone: misc_js_1.getTimezone(new Date()),
        });
        return;
    }
    if (number < 10000) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} which is too small (<10000)`);
        client.sendError('na');
        misc_js_1.sendEmail("invalidNumber", {
            Ip: client.ipAddress,
            number: number.toString(),
            date: misc_js_1.printDate(),
            timeZone: misc_js_1.getTimezone(new Date()),
        });
        return;
    }
    const entry = await SQL_1.SqlGet(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0;`, [number]);
    if (!entry) {
        await SQL_1.SqlRun(`DELETE FROM teilnehmer WHERE number=?;`, [number]);
        const result = await SQL_1.SqlRun(`INSERT INTO teilnehmer (name, timestamp, type, number, port, pin, hostname, extension, ipaddress, disabled, changed) VALUES (${"?, ".repeat(11).slice(0, -2)});`, ['?', misc_js_1.timestamp(), 5, number, port, pin, "", "", client.ipAddress, 1, 1]);
        if (!(result && result.changes)) {
            logger.log('error', misc_js_1.inspect `could not create entry`);
            return;
        }
        await client.sendPackage({
            type: 2,
            data: {
                ipaddress: client.ipAddress,
            },
        });
        misc_js_1.sendEmail("new", {
            Ip: client.ipAddress,
            number: number.toString(),
            date: misc_js_1.printDate(),
            timeZone: misc_js_1.getTimezone(new Date()),
        });
        return;
    }
    if (entry.type !== 5) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} which is not of DynIp type`);
        client.sendError('na');
        misc_js_1.sendEmail("wrongDynIpType", {
            type: entry.type.toString(),
            Ip: client.ipAddress,
            number: entry.number.toString(),
            name: entry.name,
            date: misc_js_1.printDate(),
            timeZone: misc_js_1.getTimezone(new Date()),
        });
        return;
    }
    if (entry.pin === 0) {
        if (pin !== 0) {
            logger.log('warning', misc_js_1.inspect `reset pin for ${entry.name} (${entry.number})`);
            await SQL_1.SqlRun(`UPDATE teilnehmer SET pin = ?, changed=1, timestamp=? WHERE uid=?;`, [pin, misc_js_1.timestamp(), entry.uid]);
        }
    }
    else if (entry.pin !== pin) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to update ${number} with an invalid pin`);
        client.sendError('na');
        misc_js_1.increaseErrorCounter('client', {
            clientName: client.name,
            ip: client.ipAddress,
            name: entry.name,
            number: entry.number.toString(),
        });
        return;
    }
    if (client.ipAddress === entry.ipaddress && port === entry.port) {
        logger.log('debug', misc_js_1.inspect `not UPDATING, nothing to update`);
        await client.sendPackage({
            type: 2,
            data: {
                ipaddress: client.ipAddress,
            },
        });
        return;
    }
    await SQL_1.SqlRun(`UPDATE teilnehmer SET port = ?, ipaddress = ?, changed = 1, timestamp = ? WHERE number = ? OR (SUBSTR(name, 0, ?) = SUBSTR(?, 0, ?) AND port = ? AND pin = ? AND type = 5)`, [
        port, client.ipAddress, misc_js_1.timestamp(), number,
        config_js_1.default.DynIpUpdateNameDifference, entry.name, config_js_1.default.DynIpUpdateNameDifference, entry.port, entry.pin,
    ]);
    await client.sendPackage({
        type: 2,
        data: {
            ipaddress: client.ipAddress,
        },
    });
    // await sendQueue();
};
handles[3][constants.states.STANDBY] = async (pkg, client) => {
    if (!client)
        return;
    if (pkg.data.version !== 1) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} sent a package with version ${pkg.data.version} which is not supported by this server`);
        await client.sendPackage({ type: 4 });
        return;
    }
    const result = await SQL_1.SqlGet(`SELECT * FROM teilnehmer WHERE number = ? AND type != 0 AND disabled != 1;`, [pkg.data.number]);
    if (result) {
        result.pin = 0;
        await client.sendPackage({
            type: 5,
            data: result,
        });
        return;
    }
    else {
        await client.sendPackage({
            type: 4,
        });
        return;
    }
};
handles[5][constants.states.FULLQUERY] =
    handles[5][constants.states.LOGIN] = async (pkg, client) => {
        if (!client)
            return;
        const names = constants.peerProperties.filter(name => pkg.data.hasOwnProperty(name));
        const values = names.map(name => pkg.data[name]);
        logger.log('verbose network', misc_js_1.inspect `got dataset for: ${pkg.data.name} (${pkg.data.number}) by server ${client.name}`);
        const entry = await SQL_1.SqlGet(`SELECT * from teilnehmer WHERE number = ?;`, [pkg.data.number]);
        if (entry) {
            if (typeof client.newEntries !== "number")
                client.newEntries = 0;
            if (pkg.data.timestamp <= entry.timestamp) {
                logger.log('debug', misc_js_1.inspect `recieved entry is ${+entry.timestamp - pkg.data.timestamp} seconds older and was ignored`);
                await client.sendPackage({ type: 8 });
                return;
            }
            client.newEntries++;
            logger.log('network', misc_js_1.inspect `got new dataset for: ${pkg.data.name}`);
            logger.log('debug', misc_js_1.inspect `recieved entry is ${+pkg.data.timestamp - entry.timestamp} seconds newer  > ${entry.timestamp}`);
            await SQL_1.SqlRun(`UPDATE teilnehmer SET ${names.map(name => name + " = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([config_js_1.default.setChangedOnNewerEntry ? 1 : 0, pkg.data.number]));
            await client.sendPackage({ type: 8 });
            return;
        }
        else if (pkg.data.type === 0) {
            logger.log('debug', misc_js_1.inspect `not inserting deleted entry: ${pkg.data}`);
            await client.sendPackage({ type: 8 });
            return;
        }
        else {
            await SQL_1.SqlRun(`INSERT INTO teilnehmer (${names.join(",") + (names.length > 0 ? "," : "")} changed) VALUES (${"?,".repeat(names.length + 1).slice(0, -1)});`, values.concat([config_js_1.default.setChangedOnNewerEntry ? 1 : 0,]));
            await client.sendPackage({ type: 8 });
            return;
        }
    };
handles[6][constants.states.STANDBY] = async (pkg, client) => {
    if (!client)
        return;
    if (pkg.data.serverpin !== config_js_1.default.serverPin && !(readonly && config_js_1.default.allowFullQueryInReadonly)) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to perform a FullQuery with an invalid serverpin`);
        client.socket.end();
        misc_js_1.sendEmail("wrongServerPin", {
            Ip: client.ipAddress,
            date: misc_js_1.printDate(),
            timeZone: misc_js_1.getTimezone(new Date()),
        });
        return;
    }
    logger.log('debug', misc_js_1.inspect `serverpin is correct!`);
    let result = await SQL_1.SqlAll("SELECT  * FROM teilnehmer;", []);
    if (!result)
        result = [];
    client.writebuffer = result;
    client.state = constants.states.RESPONDING;
    await handlePackage({ type: 8 }, client);
    return;
};
handles[7][constants.states.STANDBY] = async (pkg, client) => {
    if (!client)
        return;
    if (pkg.data.serverpin !== config_js_1.default.serverPin && !(readonly && config_js_1.default.allowLoginInReadonly)) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} tried to perform a Login with an invalid serverpin`);
        client.socket.end();
        misc_js_1.sendEmail("wrongServerPin", {
            Ip: client.ipAddress,
            date: misc_js_1.printDate(),
            timeZone: misc_js_1.getTimezone(new Date()),
        });
        return;
    }
    logger.log('debug', misc_js_1.inspect `serverpin is correct!`);
    client.state = constants.states.LOGIN;
    await client.sendPackage({ type: 8 });
    return;
};
handles[8][constants.states.RESPONDING] = async (pkg, client) => {
    if (!client)
        return;
    logger.log('debug', misc_js_1.inspect `entrys to transmit: ${client.writebuffer.length}`);
    if (client.writebuffer.length === 0) {
        logger.log('network', misc_js_1.inspect `transmited all entries for: ${client.name}`);
        client.state = constants.states.STANDBY;
        await client.sendPackage({ type: 9 });
        return;
    }
    let data = client.writebuffer.shift();
    logger.log('network', misc_js_1.inspect `sent dataset for ${data.name} (${data.number})`);
    await client.sendPackage({
        type: 5,
        data,
    });
    return;
};
handles[9][constants.states.FULLQUERY] =
    handles[9][constants.states.LOGIN] = async (pkg, client) => {
        if (!client)
            return;
        client.state = constants.states.STANDBY;
        if (typeof client.cb === "function")
            client.cb();
        client.socket.end();
        await sendQueue_js_1.default();
        return;
    };
handles[10][constants.states.STANDBY] = async (pkg, client) => {
    if (!client)
        return;
    const { pattern, version } = pkg.data;
    if (pkg.data.version !== 1) {
        logger.log('warning', misc_js_1.inspect `client ${client.name} sent a package with version ${pkg.data.version} which is not supported by this server`);
        client.writebuffer = [];
        await handlePackage({ type: 8 }, client);
        return;
    }
    const searchWords = pattern.split(" ").map(q => `%${q}%`);
    let result = await SQL_1.SqlAll(`SELECT * FROM teilnehmer WHERE disabled != 1 AND type != 0${" AND name LIKE ?".repeat(searchWords.length)};`, searchWords);
    if (!result)
        result = [];
    logger.log('network', misc_js_1.inspect `found ${result.length} public entries matching pattern ${pattern}`);
    logger.log('debug', misc_js_1.inspect `entries matching pattern ${pattern}:\n${result}`);
    client.state = constants.states.RESPONDING;
    client.writebuffer = result.map(peer => {
        peer.pin = 0;
        return peer;
    });
    await handlePackage({ type: 8 }, client);
    return;
};
handles[255][constants.states.RESPONDING] =
    handles[255][constants.states.FULLQUERY] =
        handles[255][constants.states.STANDBY] =
            handles[255][constants.states.LOGIN] =
                async (pkg, client) => {
                    if (!client)
                        return;
                    logger.log('error', misc_js_1.inspect `server sent error message: ${pkg}`);
                };
function handlePackage(obj, client) {
    return new Promise((resolve, reject) => {
        if (!obj) {
            logger.log('warning', misc_js_1.inspect `no package to handle`);
            resolve();
        }
        else {
            logger.log('debug', misc_js_1.inspect `state: ${client.stateName}`);
            try {
                logger.log('network', misc_js_1.inspect `handling package of type ${constants.PackageNames[obj.type]} (${obj.type}) for ${client.name} in state ${client.stateName}`);
                logger.log('verbose network', misc_js_1.inspect `handling package: ${obj}`);
                if (typeof handles[obj.type][client.state] === "function") {
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
                    logger.log('warning', misc_js_1.inspect `client ${client.name} sent a package of type ${constants.PackageNames[obj.type]} (${obj.type}) which is not supported in state ${client.stateName}`);
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
