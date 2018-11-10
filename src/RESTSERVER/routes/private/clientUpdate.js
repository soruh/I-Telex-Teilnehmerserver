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
const misc_1 = require("../../../SHARED/misc");
function clientUpdate(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const addr = misc_1.normalizeIp(req.ip);
        if (addr.family === 6) {
            res.status(400);
            res.json({ success: false, error: "ipv6 is not supported" });
            return;
        }
        const ipaddress = addr.address;
        let port = null;
        try {
            let data = JSON.parse(req.body.data);
            port = data.port;
        }
        catch (err) { /*fail silently*/ }
        const query = `UPDATE teilnehmer SET ipaddress=?${port !== null ? ', port=?' : ''} WHERE number=?`;
        let args = [];
        args.push(ipaddress);
        if (port !== null)
            args.push(ipaddress);
        args.push(req['user'].number);
        try {
            let { changes } = yield SQL_1.SqlRun(query, args);
            if (changes !== 1) {
                res.status(404);
                res.json({ success: false });
                return;
            }
        }
        catch (err) {
            next(err);
        }
        res.status(200);
        res.json({ success: true, data: { ipaddress } });
    });
}
exports.default = clientUpdate;
