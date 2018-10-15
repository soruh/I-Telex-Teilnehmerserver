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
const mysql = require("mysql");
const express = require("express");
const config_js_1 = require("../../SHARED/config.js");
const misc_js_1 = require("../../SHARED/misc.js");
var mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
const logger = global.logger;
global.sqlPool = mysql.createPool(mySqlConnectionOptions);
const sqlPool = global.sqlPool;
sqlPool.getConnection(function (err, connection) {
    if (err) {
        logger.log('error', misc_js_1.inspect `could not connect to database!`);
        throw err;
    }
    else {
        logger.log('warning', misc_js_1.inspect `connected to database!`);
        connection.release();
    }
});
const router = express.Router();
router.get('/', function (req, res, next) {
    res.render('index');
});
router.post('/list', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.body.password === config_js_1.default.webInterfacePassword) {
            var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,disabled,timestamp FROM teilnehmer";
        }
        else {
            var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,timestamp FROM teilnehmer where type!=0 and disabled=0;";
        }
        // ll(req.body);
        res.header("Content-Type", "application/json; charset=utf-8");
        try {
            let data = yield misc_js_1.SqlQuery(query);
            if (!data)
                throw ('no data');
            res.json({
                successful: true,
                result: data
            });
        }
        catch (error) {
            res.json({
                successful: false,
                error
            });
        }
        /*
        SqlQuery("SELECT * FROM teilnehmer")
        .then((privateList:any[])=>{
          if (privateList===void 0) return void 0;
      
          let publicList =
          privateList
          .filter(privateEntry=>
          // filter out private entries if the password is wrong or not set
            req.body.password === config.webInterfacePassword||
            (
              privateEntry.type != 0 &&
              privateEntry.disabled === 0
            )
          )
          .map(publicEntry=>{
            //remove private values if the password is wrong or not set
            if(req.body.password != config.webInterfacePassword){
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
        .catch(err=>{
          logger.log('error', inspect`${err}`);
          res.json({
            successful: false,
            message: err
          })
        });
        */
    });
});
router.post('/edit', function (req, res) {
    // ll(req.body);
    res.header("Content-Type", "application/json; charset=utf-8");
    logger.log('debug', misc_js_1.inspect `request body: ${req.body}`);
    logger.log('debug', misc_js_1.inspect `typekey: ${req.body.typekey}`);
    if (req.body.password !== config_js_1.default.webInterfacePassword) {
        if (req.body.password != "")
            logger.log('warning', misc_js_1.inspect `${req.connection.remoteAddress} tried to login with a wrong password: '${req.body.password}'`);
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
                .then(entries => {
                if (entries === void 0)
                    return void 0;
                let [entry] = entries;
                if (entry === void 0)
                    return void 0;
                logger.log('debug', misc_js_1.inspect `exising entry: ${entry}`);
                if (entry.number == req.body.number) {
                    logger.log('debug', misc_js_1.inspect `number wasn't changed updating`);
                    logger.log('debug', misc_js_1.inspect `${entry.number} == ${req.body.number}`);
                    misc_js_1.SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, Math.floor(Date.now() / 1000), entry.pin, req.body.uid
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
                        logger.log('error', misc_js_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err
                        });
                    });
                }
                else {
                    logger.log('debug', misc_js_1.inspect `number was changed inserting`);
                    logger.log('debug', misc_js_1.inspect `${entry.number} != ${req.body.number}`);
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
                            logger.log('error', misc_js_1.inspect `${err}`);
                            res.json({
                                successful: false,
                                message: err
                            });
                        });
                    })
                        .catch(err => {
                        logger.log('error', misc_js_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err
                        });
                    });
                }
            })
                .catch(err => {
                logger.log('error', misc_js_1.inspect `${err}`);
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
                logger.log('debug', misc_js_1.inspect `${existing}`);
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
                        logger.log('error', misc_js_1.inspect `${err}`);
                        res.json({
                            successful: false,
                            message: err
                        });
                    });
                })
                    .catch(err => {
                    logger.log('error', misc_js_1.inspect `${err}`);
                    res.json({
                        successful: false,
                        message: err
                    });
                });
            })
                .catch(err => {
                logger.log('error', misc_js_1.inspect `${err}`);
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
                logger.log('error', misc_js_1.inspect `${err}`);
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
router.get('/download', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (req.query.type) {
            case "xls":
                res.setHeader('Content-disposition', 'attachment; filename=list.xls');
                res.setHeader('Content-type', 'application/xls');
                let data = yield misc_js_1.SqlQuery('select number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1;');
                if (data && data.length > 0) {
                    let header = Object.keys(data[0]);
                    for (let i in header) {
                        res.write(header[i]);
                        if (+i == header.length - 1) {
                            res.write('\n');
                        }
                        else {
                            res.write('\t');
                        }
                    }
                    for (let row of data) {
                        let values = Object.values(row);
                        for (let i in values) {
                            res.write(values[i].toString());
                            if (+i == values.length - 1) {
                                res.write('\n');
                            }
                            else {
                                res.write('\t');
                            }
                        }
                    }
                    res.end();
                }
                else {
                    res.end("no data");
                }
                break;
            default:
                res.end("requested an invalid file type");
                break;
        }
    });
});
module.exports = router;
