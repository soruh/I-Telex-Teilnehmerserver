"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const SQL_1 = require("../../../SHARED/SQL");
const constants_1 = require("../../../SHARED/constants");
const entryRouter = express.Router();
function parseIntStrict(string) {
    let int = parseInt(string);
    if (isNaN(int) || int.toString() !== string) {
        return NaN;
    }
    else {
        return int;
    }
}
entryRouter.get('*', async function (req, res, next) {
    try {
        let number = parseIntStrict(req.url.replace('/', ''));
        if (isNaN(number)) {
            res.status(400);
            res.json({ success: false, error: 'Not an integer' });
            return;
        }
        let entry = await SQL_1.SqlGet(`SELECT ${constants_1.peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1 AND number=?;`, [number]);
        if (!entry) {
            res.status(404);
            res.json({ success: false, error: 'Not found' });
            return;
        }
        res.json({ success: true, data: entry });
    }
    catch (err) {
        next(err);
    }
});
exports.default = entryRouter;
