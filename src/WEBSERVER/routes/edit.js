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
const misc_1 = require("../../SHARED/misc");
const misc_2 = require("../../SHARED/misc");
const tokens_1 = require("./tokens");
function editEntry(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let entries = yield misc_2.SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid]);
        if (!entries)
            return;
        let [entry] = entries;
        if (!entry)
            return;
        logger.log('debug', misc_1.inspect `exising entry: ${entry}`);
        if (entry.number === req.body.number) {
            logger.log('debug', misc_1.inspect `number wasn't changed updating`);
            logger.log('debug', misc_1.inspect `${entry.number} == ${req.body.number}`);
            let result = yield misc_2.SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, Math.floor(Date.now() / 1000), entry.pin, req.body.uid]);
            if (!result)
                return;
            res.json({
                successful: true,
                message: result,
            });
        }
        else {
            logger.log('debug', misc_1.inspect `number was changed inserting`);
            logger.log('debug', misc_1.inspect `${entry.number} != ${req.body.number}`);
            yield misc_2.SqlQuery("DELETE FROM teilnehmer WHERE uid=?;", [req.body.uid]);
            let result = yield misc_2.SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)]);
            if (!result)
                return;
            res.json({
                successful: true,
                message: result,
            });
        }
    });
}
function newEntry(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let existing = yield misc_2.SqlQuery("SELECT * FROM teilnehmer WHERE number=?;", [req.body.number]);
        logger.log('debug', misc_1.inspect `${existing}`);
        if (!existing)
            return;
        if (existing && existing.length === 1 && existing[0].type !== 0)
            return res.json({
                successful: false,
                message: new Error("entry already exists"),
            });
        yield misc_2.SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [req.body.number]);
        let result = yield misc_2.SqlQuery("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)]);
        if (!result)
            return;
        res.json({
            successful: true,
            message: result,
        });
    });
}
function deleteEntry(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield misc_2.SqlQuery("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [Math.floor(Date.now() / 1000), req.body.uid]);
        if (!result)
            return;
        res.json({
            successful: true,
            message: result,
        });
    });
}
function editEndpoint(req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    logger.log('debug', misc_1.inspect `request body: ${req.body}`);
    logger.log('debug', misc_1.inspect `typekey: ${req.body.typekey}`);
    if (!tokens_1.isValidToken(req.body.token)) {
        if (req.body.password !== "")
            logger.log('warning', misc_1.inspect `${req.connection.remoteAddress} tried to login with a wrong password`);
        return void res.json({
            successful: false,
            message: {
                code: -1,
                text: "wrong password!",
            },
        });
    }
    try {
        switch (req.body.typekey) {
            case "edit":
                editEntry(req, res);
                break;
            case "new":
                newEntry(req, res);
                break;
            case "delete":
                deleteEntry(req, res);
                break;
            case "confirm password":
                res.json({
                    successful: true,
                    message: {
                        code: 1,
                        text: "password is correct",
                    },
                });
                break;
            default:
                res.json({
                    successful: false,
                    message: {
                        code: -2,
                        text: "unknown typekey",
                    },
                });
                break;
        }
    }
    catch (err) {
        res.json({
            successful: false,
            message: err,
        });
    }
}
exports.default = editEndpoint;
