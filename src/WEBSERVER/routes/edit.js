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
const SQL_1 = require("../../SHARED/SQL");
const tokens_1 = require("./tokens");
function resetPinEntry(req, res, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield SQL_1.SqlRun("UPDATE teilnehmer SET pin=0, changed=1, timestamp=? WHERE uid=?;", [misc_1.timestamp(), data.uid]);
        if (!result)
            return;
        res.json({
            successful: true,
            message: result,
        });
    });
}
function editEntry(req, res, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let entry = yield SQL_1.SqlGet("SELECT * FROM teilnehmer WHERE uid=?;", [data.uid]);
        if (!entry)
            return;
        logger.log('debug', misc_1.inspect `exising entry: ${entry}`);
        if (entry.number === data.number) {
            logger.log('debug', misc_1.inspect `number wasn't changed updating`);
            logger.log('debug', misc_1.inspect `${entry.number} == ${data.number}`);
            let result = yield SQL_1.SqlRun("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.disabled, misc_1.timestamp(), entry.pin, data.uid]);
            if (!result)
                return;
            res.json({
                successful: true,
                message: result,
            });
        }
        else {
            logger.log('debug', misc_1.inspect `number was changed inserting`);
            logger.log('debug', misc_1.inspect `${entry.number} != ${data.number}`);
            yield SQL_1.SqlRun("UPDATE teilnehmer set type=0 WHERE uid=?;", [data.uid]);
            let result = yield SQL_1.SqlRun("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.pin, data.disabled, misc_1.timestamp()]);
            if (!result)
                return;
            res.json({
                successful: true,
                message: result,
            });
        }
    });
}
function copyEntry(req, res, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let exising = yield SQL_1.SqlGet("SELECT * FROM teilnehmer WHERE uid=?;", [data.uid]);
        if (!exising) {
            res.json({
                successful: false,
                message: "can't copy nonexisting entry",
            });
            return;
        }
        yield SQL_1.SqlRun("DELETE FROM teilnehmer WHERE number=?;", [data.number]);
        let result = yield SQL_1.SqlRun("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, exising.pin, data.disabled, misc_1.timestamp()]);
        if (!result)
            return;
        res.json({
            successful: true,
            message: result,
        });
    });
}
function newEntry(req, res, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let existing = yield SQL_1.SqlGet("SELECT * FROM teilnehmer WHERE number=?;", [data.number]);
        logger.log('debug', misc_1.inspect `${existing}`);
        if (existing) {
            res.json({
                successful: false,
                message: new Error("entry already exists"),
            });
            return;
        }
        let result = yield SQL_1.SqlRun("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.pin, data.disabled, misc_1.timestamp()]);
        res.json({
            successful: Boolean(result),
            message: result,
        });
    });
}
function deleteEntry(req, res, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield SQL_1.SqlRun("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [misc_1.timestamp(), data.uid]);
        res.json({
            successful: Boolean(result),
            message: result,
        });
    });
}
function editEndpoint(req, res) {
    // logger.log('debug', "editEndpoint");
    // logger.log('debug', inspect`request body: ${req.body}`);
    let data;
    try {
        data = JSON.parse(req.body.data);
    }
    catch (err) {
        logger.log('error', err);
        return;
    }
    res.header("Content-Type", "application/json; charset=utf-8");
    logger.log('debug', misc_1.inspect `job: ${data.job}`);
    if (!tokens_1.isValidToken(req.body.token, req.body.data, req.body.salt)) {
        return void res.json({
            successful: false,
            message: {
                code: -1,
                text: "wrong password!",
            },
        });
    }
    try {
        switch (data.job) {
            case "edit":
                editEntry(req, res, data);
                break;
            case "copy":
                copyEntry(req, res, data);
                break;
            case "new":
                newEntry(req, res, data);
                break;
            case "delete":
                deleteEntry(req, res, data);
                break;
            case "resetPin":
                resetPinEntry(req, res, data);
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
                        text: "unknown job",
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
