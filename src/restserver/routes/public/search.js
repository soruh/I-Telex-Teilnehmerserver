"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQL_1 = require("../../../shared/SQL");
const constants_1 = require("../../../shared/constants");
async function search(req, res, next) {
    try {
        const pattern = req.query.q;
        if (!pattern) {
            res.status(400);
            res.json({ success: false, error: 'No query' });
            return;
        }
        const searchWords = pattern.toString().split(" ").map(q => `%${q}%`);
        const entries = await SQL_1.SqlAll(`SELECT ${constants_1.peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1${" AND name LIKE ?".repeat(searchWords.length)};`, searchWords);
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
exports.default = search;
