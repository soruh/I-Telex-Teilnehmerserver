"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../SHARED/misc");
const config_1 = require("../SHARED/config");
function cleanUp() {
    return new Promise((resolve, reject) => {
        if (config_1.default.keepDeletedFor != null) {
            logger.log('debug', misc_1.inspect `cleaning up`);
            let expiredAfter = misc_1.timestamp() - config_1.default.keepDeletedFor * 86400;
            misc_1.SqlQuery("DELETE FROM teilnehmer WHERE type=0 AND timestamp<=?", [expiredAfter])
                .then(res => {
                if (res && res.affectedRows > 0)
                    logger.log('debug', misc_1.inspect `removed ${res.affectedRows} expired entries`);
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
