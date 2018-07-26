"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express = require("express");
const config_js_1 = require("../../SHARED/config.js");
const colors_js_1 = require("../../SHARED/colors.js");
const misc_js_1 = require("../../SHARED/misc.js");
var mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
const logger = global.logger;
global.sqlPool = mysql.createPool(mySqlConnectionOptions);
const sqlPool = global.sqlPool;
sqlPool.getConnection(function (err, connection) {
    if (err) {
        logger.error(misc_js_1.inspect `${colors_js_1.default.FgRed}could not connect to database!${colors_js_1.default.Reset}`);
        throw err;
    }
    else {
        logger.warn(misc_js_1.inspect `${colors_js_1.default.FgGreen}connected to database!${colors_js_1.default.Reset}`);
        connection.release();
    }
});
const router = express.Router();
router.get('/', function (req, res, next) {
    res.render('index');
});
router.post('/list', function (req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    misc_js_1.SqlQuery("SELECT * FROM teilnehmer")
        .then((privateList) => {
        if (privateList === void 0)
            return void 0;
        let publicList = privateList
            .filter(privateEntry => 
        // filter out private entries if the password is wrong or not set
        req.body.password === config_js_1.default.webInterfacePassword ||
            (privateEntry.type != 0 &&
                privateEntry.disabled === 0))
            .map(publicEntry => {
            //remove private values if the password is wrong or not set
            if (req.body.password != config_js_1.default.webInterfacePassword) {
                delete publicEntry.disabled;
            }
            delete publicEntry.pin; // never send pin
            delete publicEntry.changed; // never send changed
            return publicEntry;
        });
        res.json({
            successful: true,
            result: publicList
        });
    })
        .catch(err => {
        logger.error(misc_js_1.inspect `${err}`);
        res.json({
            successful: false,
            message: err
        });
    });
});
router.post('/edit', function (req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    logger.debug(misc_js_1.inspect `request body: ${req.body}`);
    logger.verbose(misc_js_1.inspect `typekey: ${req.body.typekey}`);
    if (req.body.password !== config_js_1.default.webInterfacePassword) {
        logger.warn(misc_js_1.inspect `${req.connection.remoteAddress} tried to login with a wrong password: '${req.body.password}'`);
        return void res.json({
            successful: false,
            message: {
                code: -1,
                text: "wrong password!"
            }
        });
    }
    switch (req.body.typekey) {
        case "edit":
            misc_js_1.SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid])
                .then(entry => {
                if (entry === void 0)
                    return void 0;
                if (entry && entry.number == req.body.number) {
                    logger.debug(misc_js_1.inspect `number wasn't changed updating`);
                    logger.debug(misc_js_1.inspect `${entry.number} == ${req.body.number}`);
                    misc_js_1.SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1 WHERE uid=?;", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, Math.floor(Date.now() / 1000), req.body.uid
                    ])
                        .then(result => {
                        if (result === void 0)
                            return void 0;
                        res.json({
                            successful: true,
                            message: result
                        });
                    })
                        .catch(err => {
                        logger.error(misc_js_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err
                        });
                    });
                }
                else {
                    logger.debug(misc_js_1.inspect `number was changed inserting`);
                    logger.debug(misc_js_1.inspect `${entry.number} != ${req.body.number}`);
                    misc_js_1.SqlQuery("DELETE FROM teilnehmer WHERE uid=?;", [req.body.uid])
                        .then(result => {
                        if (result === void 0)
                            return void 0;
                        misc_js_1.SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)])
                            .then(result => {
                            if (result === void 0)
                                return void 0;
                            res.json({
                                successful: true,
                                message: result
                            });
                        })
                            .catch(err => {
                            logger.error(misc_js_1.inspect `${err}`);
                            res.json({
                                successful: false,
                                message: err
                            });
                        });
                    })
                        .catch(err => {
                        logger.error(misc_js_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err
                        });
                    });
                }
            })
                .catch(err => {
                logger.error(misc_js_1.inspect `${err}`);
                res.json({
                    successful: false,
                    message: err
                });
            });
            ;
            break;
        case "new":
            misc_js_1.SqlQuery("SELECT * FROM teilnehmer WHERE number=?;", [req.body.number])
                .then(existing => {
                logger.debug(misc_js_1.inspect `${existing}`);
                if (existing === void 0)
                    return void 0;
                if (existing && existing.length == 1 && existing[0].type !== 0)
                    return res.json({
                        successful: false,
                        message: new Error("entry already exists")
                    });
                misc_js_1.SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [req.body.number])
                    .then(result => {
                    if (result === void 0)
                        return void 0;
                    misc_js_1.SqlQuery("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)])
                        .then(result => {
                        if (result === void 0)
                            return void 0;
                        res.json({
                            successful: true,
                            message: result
                        });
                    })
                        .catch(err => {
                        logger.error(misc_js_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err
                        });
                    });
                })
                    .catch(err => {
                    logger.error(misc_js_1.inspect `${err}`);
                    res.json({
                        successful: false,
                        message: err
                    });
                });
            })
                .catch(err => {
                logger.error(misc_js_1.inspect `${err}`);
                res.json({
                    successful: false,
                    message: err
                });
            });
            break;
        case "delete":
            misc_js_1.SqlQuery("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [Math.floor(Date.now() / 1000), req.body.uid])
                .then(result => {
                if (result === void 0)
                    return void 0;
                res.json({
                    successful: true,
                    message: result
                });
            })
                .catch(err => {
                logger.error(misc_js_1.inspect `${err}`);
                res.json({
                    successful: false,
                    message: err
                });
            });
            break;
        case "confirm password":
            res.json({
                successful: true,
                message: {
                    code: 1,
                    text: "password is correct"
                }
            });
            break;
        default:
            res.json({
                successful: false,
                message: {
                    code: -2,
                    text: "unknown typekey"
                }
            });
            break;
    }
});
module.exports = router;
