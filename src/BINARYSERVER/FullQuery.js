"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const config_js_1 = require("../SHARED/config.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const misc_js_1 = require("../SHARED/misc.js");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const connect_js_1 = require("./connect.js");
//#endregion
const logger = global.logger;
const readonly = (config_js_1.default.serverPin == null);
function getFullQuery() {
    return new Promise((resolve, reject) => {
        logger.verbose(misc_js_1.inspect `geting FullQuery`);
        misc_js_1.SqlQuery("SELECT  * FROM servers;")
            .then((servers) => {
            if (servers.length == 0) {
                logger.warn(misc_js_1.inspect `No configured servers -> aborting FullQuery`);
                return void resolve();
            }
            // for (let i in servers) {
            // 	if (config.fullQueryServer&&servers[i].addresse == config.fullQueryServer.split(":")[0] && servers[i].port == config.fullQueryServer.split(":")[1]) {
            // 		servers = [servers[i]];
            // 		break;
            // 	}
            // }
            if (config_js_1.default.fullQueryServer)
                servers = servers.filter(server => server.port == config_js_1.default.fullQueryServer.split(":")[1] &&
                    server.addresse == config_js_1.default.fullQueryServer.split(":")[0]);
            return serialEachPromise_js_1.default(servers, server => new Promise((resolve, reject) => {
                connect_js_1.default(resolve, {
                    host: server.addresse,
                    port: +server.port
                })
                    .then(client => new Promise((resolve, reject) => {
                    let request;
                    if (readonly) {
                        request = {
                            type: 10,
                            data: {
                                pattern: '',
                                version: 1
                            }
                        };
                    }
                    else {
                        request = {
                            type: 6,
                            data: {
                                serverpin: config_js_1.default.serverPin,
                                version: 1
                            }
                        };
                    }
                    client.connection.write(ITelexCom.encPackage(request), () => {
                        client.state = constants.states.FULLQUERY;
                        client.cb = resolve;
                    });
                }))
                    .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
            }));
        })
            .then(() => resolve())
            .catch(err => { logger.error(misc_js_1.inspect `${err}`); });
        //}
    });
}
exports.default = getFullQuery;
