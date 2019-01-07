"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../../../SHARED/misc");
const SQL_1 = require("../../../SHARED/SQL");
const constants_1 = require("../../../SHARED/constants");
const config_1 = require("../../../SHARED/config");
async function getEntries(req, res, next) {
    try {
        let entries = await SQL_1.SqlAll(`SELECT ${constants_1.peerProperties.join(',')} from teilnehmer;`, []);
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
}
exports.getEntries = getEntries;
async function putEntries(req, res, next) {
    try {
        if (!(req.body && req.body.data)) {
            res.status(400);
            res.json({ success: false, error: "please supply 'data' field" });
            return;
        }
        let entries = req.body.data;
        try {
            if (typeof entries === "string")
                entries = JSON.parse(entries);
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
        logger.log('admin', `recieved ${misc_1.inspect `${entries.length}`} dataset${entries.length === 1 ? '' : 's'}`);
        for (let entry of entries) {
            const names = constants_1.peerProperties.filter(name => entry.hasOwnProperty(name));
            const values = names.map(name => entry[name]);
            // tslint:disable-next-line:triple-equals
            if (entry.number == undefined || isNaN(parseInt(entry.number)) || parseInt(entry.number).toString() != entry.number) {
                res.status(400);
                res.json({ success: false, error: "the 'number' property must be a valid integer" });
                return;
            }
            // logger.log('admin', inspect`got dataset for: ${entry.name} (${entry.number})`);
            const existing = await SQL_1.SqlGet(`SELECT * from teilnehmer WHERE number = ?;`, [entry.number]);
            if (existing) {
                if (entry.timestamp <= existing.timestamp) {
                    logger.log('debug', misc_1.inspect `recieved entry is ${+existing.timestamp - entry.timestamp} seconds older and was ignored`);
                    continue;
                }
                logger.log('admin', misc_1.inspect `changed dataset for: ${entry.name}`);
                logger.log('debug', misc_1.inspect `recieved entry is ${+entry.timestamp - existing.timestamp} seconds newer  > ${existing.timestamp}`);
                await SQL_1.SqlRun(`UPDATE teilnehmer SET ${names.map(name => name + " = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([config_1.default.setChangedOnNewerEntry ? 1 : 0, entry.number]));
            }
            else {
                if (entry.type === 0) {
                    logger.log('debug', misc_1.inspect `not inserting deleted entry: ${entry}`);
                }
                else {
                    logger.log('admin', misc_1.inspect `new dataset for: ${entry.name}`);
                    await SQL_1.SqlRun(`INSERT INTO teilnehmer (${names.join(",") + (names.length > 0 ? "," : "")} changed) VALUES (${"?,".repeat(names.length + 1).slice(0, -1)});`, values.concat([config_1.default.setChangedOnNewerEntry ? 1 : 0,]));
                }
            }
        }
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
exports.putEntries = putEntries;
