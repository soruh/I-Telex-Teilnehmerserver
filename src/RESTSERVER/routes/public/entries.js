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
const SQL_1 = require("../../../SHARED/SQL");
const constants_1 = require("../../../SHARED/constants");
function entries(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let entries = yield SQL_1.SqlQuery(`SELECT ${constants_1.peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1;`, []);
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
exports.default = entries;
