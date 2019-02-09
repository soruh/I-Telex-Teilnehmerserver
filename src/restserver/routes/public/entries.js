"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQL_1 = require("../../../shared/SQL");
const constants_1 = require("../../../shared/constants");
async function entries(req, res, next) {
    try {
        let entries = await SQL_1.SqlAll(`SELECT ${constants_1.peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1;`, []);
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
exports.default = entries;
