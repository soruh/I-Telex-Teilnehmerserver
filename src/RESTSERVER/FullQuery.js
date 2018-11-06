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
const config_js_1 = require("../SHARED/config.js");
const misc_js_1 = require("../SHARED/misc.js");
const SQL_1 = require("../SHARED/SQL");
const APICall_js_1 = require("./APICall.js");
const constants = require("../SHARED/constants");
function getFullQuery() {
    return __awaiter(this, void 0, void 0, function* () {
        logger.log('debug', misc_js_1.inspect `getting FullQuery`);
        let servers = yield SQL_1.SqlAll('SELECT * from servers WHERE version=2;', []);
        if (servers.length === 0) {
            logger.log('warning', misc_js_1.inspect `No configured servers -> aborting FullQuery`);
            return;
        }
        if (config_js_1.default.fullQueryServer)
            servers = servers.filter(server => server.port === parseInt(config_js_1.default.fullQueryServer.split(":")[1]) &&
                server.address === config_js_1.default.fullQueryServer.split(":")[0]);
        for (let server of servers) {
            try {
                let entries = yield APICall_js_1.default('GET', server.address, server.port, '/admin/entries');
                for (let entry of entries) {
                    const names = constants.peerProperties;
                    const values = names.filter(name => entry.hasOwnProperty(name)).map(name => entry[name]);
                    yield SQL_1.SqlRun(`INSERT INTO teilnehmer (${names.join(', ')}) VALUES (${values.map(() => '?').join(', ')}) ON CONFLICT (number) DO UPDATE SET ${names.map(name => name + "=?").join(', ')};`, [...values, ...values]);
                }
            }
            catch (err) {
                logger.log('error', misc_js_1.inspect `${err}`);
            }
        }
    });
}
exports.default = getFullQuery;
