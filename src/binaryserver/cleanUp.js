"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../shared/misc");
const SQL_1 = require("../shared/SQL");
const config_1 = require("../shared/config");
function cleanUp() {
    return new Promise((resolve, reject) => {
        if (config_1.default.keepDeletedFor != null) {
            logger.log('debug', misc_1.inspect `cleaning up`);
            let expiredAfter = misc_1.timestamp() - config_1.default.keepDeletedFor * 86400;
            SQL_1.SqlRun("DELETE FROM teilnehmer WHERE type=0 AND timestamp<=?", [expiredAfter])
                .then(res => {
                if (res && res.changes > 0)
                    logger.log('debug', misc_1.inspect `removed ${res.changes} expired entries`);
                resolve();
            })
                .catch(err => { logger.log('error', misc_1.inspect `${err}`); });
        }
        else {
            logger.log('warning', misc_1.inspect `config.keepDeletedFor not set, not cleaning up`);
            reject();
        }
    });
}
exports.default = cleanUp;
