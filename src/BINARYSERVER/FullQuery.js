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
//#region imports
const config_js_1 = require("../SHARED/config.js");
const constants = require("../SHARED/constants.js");
const misc_js_1 = require("../SHARED/misc.js");
const SQL_1 = require("../SHARED/SQL");
const serialEachPromise_js_1 = require("../SHARED/serialEachPromise.js");
const connect_js_1 = require("./connect.js");
//#endregion
const readonly = (config_js_1.default.serverPin == null);
function getFullQuery() {
    return __awaiter(this, void 0, void 0, function* () {
        logger.log('debug', misc_js_1.inspect `getting FullQuery`);
        let servers = yield SQL_1.SqlQuery("SELECT  * FROM servers;", []);
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
            servers = servers.filter(server => server.port === config_js_1.default.fullQueryServer.split(":")[1] &&
                server.addresse === config_js_1.default.fullQueryServer.split(":")[0]);
        return serialEachPromise_js_1.default(servers, server => new Promise((resolveLoop) => __awaiter(this, void 0, void 0, function* () {
            try {
                const client = yield connect_js_1.default({ host: server.addresse, port: +server.port }, resolveLoop);
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
                yield client.sendPackage(request);
                client.state = constants.states.FULLQUERY;
                client.cb = resolveLoop;
            }
            catch (err) {
                logger.log('error', misc_js_1.inspect `${err}`);
            }
        })));
    });
}
exports.default = getFullQuery;
