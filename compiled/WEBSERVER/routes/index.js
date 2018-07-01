"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express = require("express");
const config_js_1 = require("../../COMMONMODULES/config.js");
const colors_js_1 = require("../../COMMONMODULES/colors.js");
const logWithLineNumbers_js_1 = require("../../COMMONMODULES/logWithLineNumbers.js");
var mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;
const pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function (err, connection) {
    if (err) {
        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, "could not connect to database!", colors_js_1.default.Reset);
        throw err;
    }
    else {
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "connected to database!", colors_js_1.default.Reset);
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
    pool.query("SELECT * FROM teilnehmer", function (err, result) {
        if (err) {
            res.json({
                successful: false,
                message: err
            });
        }
        else {
            var resultPublic = [];
            for (let a in result) {
                if ((result[a].gesperrt === 0 || req.body.password == config_js_1.default.webInterfacePassword) &&
                    ((result[a].typ != 0) || req.body.password == config_js_1.default.webInterfacePassword)) {
                    var i = resultPublic.length;
                    resultPublic[i] = {};
                    for (let b in result[a]) {
                        if (((b != "pin") || (false && req.body.password == config_js_1.default.webInterfacePassword)) &&
                            ((b != "gesperrt") || (req.body.password == config_js_1.default.webInterfacePassword)) &&
                            (b != "changed")) {
                            resultPublic[i][b] = result[a][b];
                        }
                    }
                }
            }
            res.json({
                successful: true,
                message: null,
                result: resultPublic
            });
        }
    });
});
router.post('/edit', function (req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    if (req.body.password == config_js_1.default.webInterfacePassword) {
        switch (req.body.typekey) {
            case "edit":
                pool.query("SELECT * FROM teilnehmer;", function (err, result) {
                    if (err) {
                        res.json({
                            successful: false,
                            message: err
                        });
                    }
                    else {
                        let existing = false;
                        let toEdit = null;
                        for (let entry of result) {
                            if (entry.uid == req.body.uid) {
                                toEdit = entry;
                            }
                        }
                        for (let entry of result) {
                            if ((entry.rufnummer == req.body.rufnummer) &&
                                (entry.uid != req.body.uid)) {
                                existing = entry;
                            }
                        }
                        // ll(toEdit);
                        // ll(existing);
                        if (toEdit) {
                            let qstr = "UPDATE teilnehmer SET " +
                                "rufnummer=" + mysql.escape(req.body.rufnummer) +
                                ",name=" + mysql.escape(req.body.name) +
                                ",typ=" + mysql.escape(req.body.typ) +
                                ",hostname=" + mysql.escape(req.body.hostname) +
                                ",ipaddresse=" + mysql.escape(req.body.ipaddresse) +
                                //",pin="+mysql.escape(req.body.pin)+
                                ",port=" + mysql.escape(req.body.port) +
                                ",extension=" + mysql.escape(req.body.extension) +
                                ",gesperrt=" + mysql.escape(req.body.gesperrt) +
                                ",moddate=" + mysql.escape(Math.floor(Date.now() / 1000)) +
                                ",changed=1 " +
                                "WHERE uid=" + mysql.escape(req.body.uid) + ";";
                            if (existing && toEdit.rufnummer != req.body.rufnummer) {
                                qstr = "DELETE FROM teilnehmer WHERE uid=" + existing.uid + ";" + qstr;
                            }
                            if (toEdit.rufnummer != req.body.rufnummer) {
                                qstr += "INSERT INTO teilnehmer " +
                                    "(rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed) VALUES (" +
                                    mysql.escape(toEdit.rufnummer) + "," +
                                    mysql.escape(toEdit.name) +
                                    ",0," +
                                    mysql.escape(toEdit.hostname) + "," +
                                    mysql.escape(toEdit.ipaddresse) + "," +
                                    mysql.escape(toEdit.port) + "," +
                                    mysql.escape(toEdit.extension) + "," +
                                    mysql.escape(toEdit.pin) + "," +
                                    mysql.escape(toEdit.gesperrt) + "," +
                                    mysql.escape(Math.floor(Date.now() / 1000)) + "," +
                                    "'1'" +
                                    ");";
                            }
                            pool.query(qstr, function (err, result) {
                                if (err) {
                                    res.json({
                                        successful: false,
                                        message: err
                                    });
                                }
                                else {
                                    res.json({
                                        successful: true,
                                        message: result
                                    });
                                }
                            });
                        }
                        else {
                            logWithLineNumbers_js_1.ll("entry does not exist");
                            res.json({
                                successful: false,
                                message: "entry does not exist"
                            });
                        }
                    }
                });
                break;
            case "new":
                pool.query("SELECT * FROM teilnehmer;", function (err, teilnehmer) {
                    if (err) {
                        res.json({
                            successful: false,
                            message: err
                        });
                    }
                    else {
                        let existing = false;
                        for (let t of teilnehmer) {
                            if (t.rufnummer == req.body.rufnummer)
                                existing = t;
                        }
                        let qstr = "INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate) VALUES (" +
                            mysql.escape(req.body.rufnummer) + "," +
                            mysql.escape(req.body.name) + "," +
                            mysql.escape(req.body.typ) + "," +
                            mysql.escape(req.body.hostname) + "," +
                            mysql.escape(req.body.ipaddresse) + "," +
                            mysql.escape(req.body.port) + "," +
                            mysql.escape(req.body.extension) + "," +
                            mysql.escape(req.body.pin) + "," +
                            mysql.escape(req.body.gesperrt) + "," +
                            mysql.escape(Math.floor(Date.now() / 1000)) +
                            ");";
                        if (existing) {
                            if (existing.typ == 0) {
                                qstr = "DELETE FROM teilnehmer WHERE uid=" + existing.uid + ";" + qstr;
                                pool.query(qstr, function (err, result) {
                                    if (err) {
                                        res.json({
                                            successful: false,
                                            message: err
                                        });
                                    }
                                    else {
                                        res.json({
                                            successful: true,
                                            message: result
                                        });
                                    }
                                });
                            }
                            else {
                                res.json({
                                    successful: false,
                                    message: "already exists"
                                });
                            }
                        }
                        else {
                            pool.query(qstr, function (err, result) {
                                if (err) {
                                    res.json({
                                        successful: false,
                                        message: err
                                    });
                                }
                                else {
                                    res.json({
                                        successful: true,
                                        message: result
                                    });
                                }
                            });
                        }
                        /*pool.query("INSERT INTO teilnehmer "+
                        "(rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate) VALUES ("+
                        mysql.escape(req.body.rufnummer)+","+
                        mysql.escape(req.body.name)+","+
                        mysql.escape(req.body.typ)+","+
                        mysql.escape(req.body.hostname)+","+
                        mysql.escape(req.body.ipaddresse)+","+
                        mysql.escape(req.body.port)+","+
                        mysql.escape(req.body.extension)+","+
                        mysql.escape(req.body.pin)+","+
                        mysql.escape(req.body.gesperrt)+","+
                        mysql.escape(Math.floor(Date.now()/1000))+
                        ")",
                        function (err, result) {
                          if(err){
                            res.json({successful:false,message:err});
                          }else{
                            res.json({successful:true,message:result});
                          }
                        });*/
                    }
                });
                break;
            case "delete":
                pool.query("UPDATE teilnehmer SET typ=0, changed=1, moddate=" + Math.floor(Date.now() / 1000) + " WHERE typ!=0 AND uid=" + mysql.escape(req.body.uid) + ";", function (err, result) {
                    if (err) {
                        res.json({
                            successful: false,
                            message: err
                        });
                    }
                    else {
                        res.json({
                            successful: true,
                            message: result
                        });
                    }
                });
                break;
            case "checkpwd":
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
    }
    else {
        res.json({
            successful: false,
            message: {
                code: -1,
                text: "wrong password!"
            }
        });
    }
});
module.exports = router;
