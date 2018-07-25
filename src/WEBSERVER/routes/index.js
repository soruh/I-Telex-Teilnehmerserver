"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express = require("express");
const config_js_1 = require("../../COMMONMODULES/config.js");
const colors_js_1 = require("../../COMMONMODULES/colors.js");
var mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
const logger = global.logger;
const pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function (err, connection) {
    if (err) {
        logger.error(colors_js_1.default.FgRed + "could not connect to database!" + colors_js_1.default.Reset);
        throw err;
    }
    else {
        logger.warn(colors_js_1.default.FgGreen + "connected to database!" + colors_js_1.default.Reset);
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
    pool.query("SELECT * FROM teilnehmer", function (err, privateList) {
        if (err)
            return void res.json({
                successful: false,
                message: err
            });
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
    });
});
router.post('/edit', function (req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    if (req.body.password !== config_js_1.default.webInterfacePassword)
        return void res.json({
            successful: false,
            message: {
                code: -1,
                text: "wrong password!"
            }
        });
    switch (req.body.typekey) {
        case "edit":
            pool.query("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid], function (err, entry) {
                if (err)
                    return void res.json({
                        successful: false,
                        message: err
                    });
                if (entry.number === req.body.number) {
                    pool.query("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1 WHERE uid=?;", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, Math.floor(Date.now() / 1000), req.body.uid
                    ], function (err, result) {
                        if (err)
                            return void res.json({
                                successful: false,
                                message: err
                            });
                        res.json({
                            successful: true,
                            message: result
                        });
                    });
                }
                else {
                    pool.query("DELETE FROM teilnehmer WHERE uid=?;", [req.body.uid], function (err, result) {
                        if (err)
                            return void res.json({
                                successful: false,
                                message: err
                            });
                        pool.query("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 1)", [req.body.number, req.body.name, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)], function (err, result) {
                            if (err)
                                return void res.json({
                                    successful: false,
                                    message: err
                                });
                            res.json({
                                successful: true,
                                message: result
                            });
                        });
                    });
                }
            });
            break;
        case "new":
            pool.query("SELECT * FROM teilnehmer WHERE number=?;", [req.body.number], function (err, existing) {
                if (err)
                    return void res.json({
                        successful: false,
                        message: err
                    });
                if (existing.type != 0)
                    return res.json({
                        successful: false,
                        message: new Error("entry already exists")
                    });
                pool.query("DELETE FROM teilnehmer WHERE uid=?;", [existing.uid], function (err, result) {
                    if (err)
                        return void res.json({
                            successful: false,
                            message: err
                        });
                    pool.query("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)], function (err, result) {
                        if (err)
                            return void res.json({
                                successful: false,
                                message: err
                            });
                        res.json({
                            successful: true,
                            message: result
                        });
                    });
                });
            });
            break;
        case "delete":
            pool.query("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [Math.floor(Date.now() / 1000), req.body.uid], function (err, result) {
                if (err)
                    return void res.json({
                        successful: false,
                        message: err
                    });
                res.json({
                    successful: true,
                    message: result
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
