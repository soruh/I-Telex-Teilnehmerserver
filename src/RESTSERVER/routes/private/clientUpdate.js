"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQL_1 = require("../../../SHARED/SQL");
const misc_1 = require("../../../SHARED/misc");
async function clientUpdate(req, res, next) {
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
        let { changes } = await SQL_1.SqlRun(query, args);
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
}
exports.default = clientUpdate;
