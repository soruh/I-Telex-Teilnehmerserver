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
entryRouter.get('*', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let number = parseIntStrict(req.url.replace('/', ''));
            if (isNaN(number)) {
                res.status(400);
                res.json({ success: false, error: 'Not an integer' });
                return;
            }
            let entry = yield SQL_1.SqlQuery(`SELECT ${constants_1.peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1 AND number=?;`, [number]);
            if (entry.length === 0) {
                res.status(404);
                res.json({ success: false, error: 'Not found' });
                return;
            }
            res.json({ success: true, data: entry[0] });
        }
        catch (err) {
            next(err);
        }
    });
});
exports.default = entryRouter;
