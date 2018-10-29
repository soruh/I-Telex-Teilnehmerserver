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
function search(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pattern = req.query.q;
            if (!pattern) {
                res.status(400);
                res.json({ success: false, error: 'No query' });
                return;
            }
            const searchWords = pattern.split(" ").map(q => `%${q}%`);
            const entries = yield misc_1.SqlQuery(`SELECT ${constants_1.peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1${" AND name LIKE ?".repeat(searchWords.length)};`, searchWords);
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
exports.default = search;
