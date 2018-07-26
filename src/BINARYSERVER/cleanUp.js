"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../SHARED/misc");
const config_1 = require("../SHARED/config");
const logger = global.logger;
function cleanUp() {
    return new Promise((resolve, reject) => {
        if (config_1.default.keepDeltedFor != null) {
            logger.info(misc_1.inspect `cleaning up`);
            let expiredAfter = Math.floor(Date.now() / 1000) - config_1.default.keepDeltedFor * 86400;
            misc_1.SqlQuery("DELETE FROM teilnehmer WHERE type=0 AND timestamp<=?", [expiredAfter])
                .then(res => {
                if (res && res.affectedRows > 0)
                    console.log(misc_1.inspect `removed ${res.affectedRows} expired entries`);
                resolve();
            })
                .catch(err => { logger.error(misc_1.inspect `${err}`); });
        }
    });
}
exports.default = cleanUp;
