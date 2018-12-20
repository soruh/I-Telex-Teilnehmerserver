"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../../SHARED/config.js");
const misc_js_1 = require("../../SHARED/misc.js");
const SQL_1 = require("../../SHARED/SQL");
const APICall_js_1 = require("./APICall.js");
const constants = require("../../SHARED/constants");
async function getFullQuery() {
    logger.log('admin', misc_js_1.inspect `getting FullQuery`);
    let servers = await SQL_1.SqlAll('SELECT * from servers WHERE version=2;', []);
    if (servers.length === 0) {
        logger.log('warning', misc_js_1.inspect `No configured servers -> aborting FullQuery`);
        return;
    }
    if (config_js_1.default.fullQueryServer)
        servers = servers.filter(server => server.port === parseInt(config_js_1.default.fullQueryServer.split(":")[1]) &&
            server.address === config_js_1.default.fullQueryServer.split(":")[0]);
    for (let server of servers) {
        try {
            const endPoint = config_js_1.default.serverPin === null ? 'public' : 'admin';
            const entries = await APICall_js_1.default('GET', server.address, server.port, `/${endPoint}/entries`);
            for (const entry of entries) {
                const names = constants.peerProperties.filter(name => entry.hasOwnProperty(name));
                const values = names.map(name => entry[name]);
                await SQL_1.SqlRun(`INSERT INTO teilnehmer (${names.join(', ')}) VALUES (${values.map(() => '?').join(', ')}) ON CONFLICT (number) DO UPDATE SET ${names.map(name => name + "=?").join(', ')};`, [...values, ...values]);
            }
        }
        catch (err) {
            logger.log('error', misc_js_1.inspect `${err}`);
        }
    }
}
exports.default = getFullQuery;
