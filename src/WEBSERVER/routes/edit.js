"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../../SHARED/misc");
const misc_2 = require("../../SHARED/misc");
const config_1 = require("../../SHARED/config");
function edit(req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    logger.log('debug', misc_1.inspect `request body: ${req.body}`);
    logger.log('debug', misc_1.inspect `typekey: ${req.body.typekey}`);
    if (req.body.password !== config_1.default.webInterfacePassword) {
        if (req.body.password !== "")
            logger.log('warning', misc_1.inspect `${req.connection.remoteAddress} tried to login with a wrong password: '${req.body.password}'`);
        return void res.json({
            successful: false,
            message: {
                code: -1,
                text: "wrong password!",
            },
        });
    }
    switch (req.body.typekey) {
        case "edit":
            misc_2.SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid])
                .then(entries => {
                if (entries === void 0)
                    return void 0;
                let [entry] = entries;
                if (entry === void 0)
                    return void 0;
                logger.log('debug', misc_1.inspect `exising entry: ${entry}`);
                if (entry.number === req.body.number) {
                    logger.log('debug', misc_1.inspect `number wasn't changed updating`);
                    logger.log('debug', misc_1.inspect `${entry.number} == ${req.body.number}`);
                    misc_2.SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, Math.floor(Date.now() / 1000), entry.pin, req.body.uid,
                    ])
                        .then(result => {
                        if (result === void 0)
                            return void 0;
                        res.json({
                            successful: true,
                            message: result,
                        });
                    })
                        .catch(err => {
                        logger.log('error', misc_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err,
                        });
                    });
                }
                else {
                    logger.log('debug', misc_1.inspect `number was changed inserting`);
                    logger.log('debug', misc_1.inspect `${entry.number} != ${req.body.number}`);
                    misc_2.SqlQuery("DELETE FROM teilnehmer WHERE uid=?;", [req.body.uid])
                        .then(() => {
                        misc_2.SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)])
                            .then(result => {
                            if (result === void 0)
                                return void 0;
                            res.json({
                                successful: true,
                                message: result,
                            });
                        })
                            .catch(err => {
                            logger.log('error', misc_1.inspect `${err}`);
                            res.json({
                                successful: false,
                                message: err,
                            });
                        });
                    })
                        .catch(err => {
                        logger.log('error', misc_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err,
                        });
                    });
                }
            })
                .catch(err => {
                logger.log('error', misc_1.inspect `${err}`);
                res.json({
                    successful: false,
                    message: err,
                });
            });
            break;
        case "new":
            misc_2.SqlQuery("SELECT * FROM teilnehmer WHERE number=?;", [req.body.number])
                .then(existing => {
                logger.log('debug', misc_1.inspect `${existing}`);
                if (existing === void 0)
                    return void 0;
                if (existing && existing.length === 1 && existing[0].type !== 0)
                    return res.json({
                        successful: false,
                        message: new Error("entry already exists"),
                    });
                misc_2.SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [req.body.number])
                    .then(() => {
                    misc_2.SqlQuery("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)])
                        .then(result => {
                        if (result === void 0)
                            return void 0;
                        res.json({
                            successful: true,
                            message: result,
                        });
                    })
                        .catch(err => {
                        logger.log('error', misc_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err,
                        });
                    });
                })
                    .catch(err => {
                    logger.log('error', misc_1.inspect `${err}`);
                    res.json({
                        successful: false,
                        message: err,
                    });
                });
            })
                .catch(err => {
                logger.log('error', misc_1.inspect `${err}`);
                res.json({
                    successful: false,
                    message: err,
                });
            });
            break;
        case "delete":
            misc_2.SqlQuery("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [Math.floor(Date.now() / 1000), req.body.uid])
                .then(result => {
                if (result === void 0)
                    return void 0;
                res.json({
                    successful: true,
                    message: result,
                });
            })
                .catch(err => {
                logger.log('error', misc_1.inspect `${err}`);
                res.json({
                    successful: false,
                    message: err,
                });
            });
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
exports.default = edit;
