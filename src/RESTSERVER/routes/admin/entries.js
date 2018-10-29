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
const misc_1 = require("../../../SHARED/misc");
const constants_1 = require("../../../SHARED/constants");
const config_1 = require("../../../SHARED/config");
function getEntries(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let entries = yield misc_1.SqlQuery(`SELECT ${constants_1.peerProperties.join(',')} from teilnehmer;`);
            if (entries.length === 0) {
                res.status(404);
                res.json({ success: false, error: 'Not found' });
                return;
            }
            res.json({ success: true, data: entries });
        }
        catch (err) {
            next(err);
        }
    });
}
exports.getEntries = getEntries;
function putEntries(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!(req.body && req.body.data)) {
                res.status(400);
                res.json({ success: false, error: "please supply 'data' field" });
                return;
            }
            try {
                // tslint:disable-next-line:no-var-keyword
                var entries = JSON.parse(req.body.data);
            }
            catch (err) {
                res.status(400);
                res.json({ success: false, error: "the 'data' field must contain valid JSON" });
                return;
            }
            if (!(entries instanceof Array)) {
                res.status(400);
                res.json({ success: false, error: "the 'data' field must contain an Array" });
                return;
            }
            logger.log('admin', `recieved ${misc_1.inspect `${entries.length}`} dataset${entries.length === 1 ? 's' : ''}`);
            for (let entry of entries) {
                const names = constants_1.peerProperties.filter(name => entry.hasOwnProperty(name));
                const values = names.map(name => entry[name]);
                // TODO check if number is set and a valid integer
                // logger.log('admin', inspect`got dataset for: ${entry.name} (${entry.number})`);
                const [existing] = yield misc_1.SqlQuery(`SELECT * from teilnehmer WHERE number = ?;`, [entry.number]);
                if (existing) {
                    if (entry.timestamp <= existing.timestamp) {
                        logger.log('debug', misc_1.inspect `recieved entry is ${+existing.timestamp - entry.timestamp} seconds older and was ignored`);
                        continue;
                    }
                    logger.log('admin', misc_1.inspect `changed dataset for: ${entry.name}`);
                    logger.log('debug', misc_1.inspect `recieved entry is ${+entry.timestamp - existing.timestamp} seconds newer  > ${existing.timestamp}`);
                    yield misc_1.SqlQuery(`UPDATE teilnehmer SET ${names.map(name => name + " = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([config_1.default.setChangedOnNewerEntry ? 1 : 0, entry.number]));
                }
                else {
                    if (entry.type === 0) {
                        logger.log('debug', misc_1.inspect `not inserting deleted entry: ${entry}`);
                    }
                    else {
                        logger.log('admin', misc_1.inspect `new dataset for: ${entry.name}`);
                        yield misc_1.SqlQuery(`INSERT INTO teilnehmer (${names.join(",") + (names.length > 0 ? "," : "")} changed) VALUES (${"?,".repeat(names.length + 1).slice(0, -1)});`, values.concat([config_1.default.setChangedOnNewerEntry ? 1 : 0,]));
                    }
                }
            }
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    });
}
exports.putEntries = putEntries;
