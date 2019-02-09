"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../shared/config.js");
const constants = require("../shared/constants.js");
const misc_js_1 = require("../shared/misc.js");
const SQL_1 = require("../shared/SQL");
const serialEachPromise_js_1 = require("../shared/serialEachPromise.js");
const connect_js_1 = require("./connect.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
async function getFullQuery() {
    logger.log('debug', misc_js_1.inspect `getting FullQuery`);
    let servers = await SQL_1.SqlAll("SELECT  * FROM servers WHERE version=1;", []);
    if (servers.length === 0) {
        logger.log('warning', misc_js_1.inspect `No configured servers -> aborting FullQuery`);
        return;
    }
    // for (let i in servers) {
    // 	if (config.fullQueryServer&&servers[i].addresse == config.fullQueryServer.split(":")[0] && servers[i].port == config.fullQueryServer.split(":")[1]) {
    // 		servers = [servers[i]];
    // 		break;
    // 	}
    // }
    if (config_js_1.default.fullQueryServer)
        servers = servers.filter(server => server.port === parseInt(config_js_1.default.fullQueryServer.split(":")[1]) &&
            server.address === config_js_1.default.fullQueryServer.split(":")[0]);
    return serialEachPromise_js_1.default(servers, server => new Promise(async (resolveLoop) => {
        try {
            const client = await connect_js_1.default({ host: server.address, port: +server.port }, resolveLoop);
            let request;
            if (readonly) {
                request = {
                    type: 10,
                    data: {
                        pattern: '',
                        version: 1,
                    },
                };
            }
            else {
                request = {
                    type: 6,
                    data: {
                        serverpin: config_js_1.default.serverPin,
                        version: 1,
                    },
                };
            }
            await client.sendPackage(request);
            client.state = constants.states.FULLQUERY;
            client.cb = resolveLoop;
        }
        catch (err) {
            logger.log('error', misc_js_1.inspect `${err}`);
        }
    }));
}
exports.default = getFullQuery;
