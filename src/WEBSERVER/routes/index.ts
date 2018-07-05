"use strict";


import * as mysql from "mysql";
import * as express from "express";

import config from '../../COMMONMODULES/config.js';
import colors from '../../COMMONMODULES/colors.js';
import {ll,lle,llo} from "../../COMMONMODULES/logWithLineNumbers.js";

var mySqlConnectionOptions = config['mySqlConnectionOptions'];
mySqlConnectionOptions["multipleStatements"] = true;

const pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function (err, connection) {
  if (err) {
    lle(colors.FgRed, "could not connect to database!", colors.Reset);
    throw err;
  } else {
    ll(colors.FgGreen, "connected to database!", colors.Reset);
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
    } else {
      var resultPublic = [];
      for (let a in result) {
        if (
          (result[a].disabled === 0 || req.body.password == config.webInterfacePassword) &&
          ((result[a].type != 0) || req.body.password == config.webInterfacePassword)
        ) {
          var i = resultPublic.length;
          resultPublic[i] = {};
          for (let b in result[a]) {
            if (
              ((b != "pin") || (false && req.body.password == config.webInterfacePassword)) &&
              ((b != "disabled") || (req.body.password == config.webInterfacePassword)) &&
              (b != "changed")
            ) {
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
  if (req.body.password == config.webInterfacePassword) {
    switch (req.body.typekey) {
      case "edit":
        pool.query("SELECT * FROM teilnehmer;", function (err, result) {
          if (err) {
            res.json({
              successful: false,
              message: err
            });
          } else {
            let existing:any = false;
            let toEdit = null;
            for (let entry of result) {
              if (entry.uid == req.body.uid) {
                toEdit = entry;
              }
            }
            for (let entry of result) {
              if (
                (entry.number == req.body.number) &&
                (entry.uid != req.body.uid)
              ) {
                existing = entry;
              }
            }
            // ll(toEdit);
            // ll(existing);
            if (toEdit) {
              let qstr = "UPDATE teilnehmer SET " +
                "number=" + mysql.escape(req.body.number) +
                ",name=" + mysql.escape(req.body.name) +
                ",type=" + mysql.escape(req.body.type) +
                ",hostname=" + mysql.escape(req.body.hostname) +
                ",ipaddress=" + mysql.escape(req.body.ipaddress) +
                //",pin="+mysql.escape(req.body.pin)+
                ",port=" + mysql.escape(req.body.port) +
                ",extension=" + mysql.escape(req.body.extension) +
                ",disabled=" + mysql.escape(req.body.disabled) +
                ",timestamp=" + mysql.escape(Math.floor(Date.now() / 1000)) +
                ",changed=1 " +
                "WHERE uid=" + mysql.escape(req.body.uid) + ";";
              if (existing && toEdit.number != req.body.number) {
                qstr = "DELETE FROM teilnehmer WHERE uid=" + existing.uid + ";" + qstr;
              }
              if (toEdit.number != req.body.number) {
                qstr += "INSERT INTO teilnehmer " +
                  "(number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp,changed) VALUES (" +
                  mysql.escape(toEdit.number) + "," +
                  mysql.escape(toEdit.name) +
                  ",0," +
                  mysql.escape(toEdit.hostname) + "," +
                  mysql.escape(toEdit.ipaddress) + "," +
                  mysql.escape(toEdit.port) + "," +
                  mysql.escape(toEdit.extension) + "," +
                  mysql.escape(toEdit.pin) + "," +
                  mysql.escape(toEdit.disabled) + "," +
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
                } else {
                  res.json({
                    successful: true,
                    message: result
                  });
                }
              });
            } else {
              ll("entry does not exist");
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
          } else {
            let existing:any = false;
            for (let t of teilnehmer) {
              if (t.number == req.body.number) existing = t;
            }
            let qstr =
              "INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (" +
              mysql.escape(req.body.number) + "," +
              mysql.escape(req.body.name) + "," +
              mysql.escape(req.body.type) + "," +
              mysql.escape(req.body.hostname) + "," +
              mysql.escape(req.body.ipaddress) + "," +
              mysql.escape(req.body.port) + "," +
              mysql.escape(req.body.extension) + "," +
              mysql.escape(req.body.pin) + "," +
              mysql.escape(req.body.disabled) + "," +
              mysql.escape(Math.floor(Date.now() / 1000)) +
              ");";
            if (existing) {
              if (existing.type == 0) {
                qstr = "DELETE FROM teilnehmer WHERE uid=" + existing.uid + ";" + qstr;
                pool.query(qstr, function (err, result) {
                  if (err) {
                    res.json({
                      successful: false,
                      message: err
                    });
                  } else {
                    res.json({
                      successful: true,
                      message: result
                    });
                  }
                });
              } else {
                res.json({
                  successful: false,
                  message: "already exists"
                });
              }
            } else {
              pool.query(qstr, function (err, result) {
                if (err) {
                  res.json({
                    successful: false,
                    message: err
                  });
                } else {
                  res.json({
                    successful: true,
                    message: result
                  });
                }
              });
            }
            /*pool.query("INSERT INTO teilnehmer "+
            "(number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES ("+
            mysql.escape(req.body.number)+","+
            mysql.escape(req.body.name)+","+
            mysql.escape(req.body.type)+","+
            mysql.escape(req.body.hostname)+","+
            mysql.escape(req.body.ipaddress)+","+
            mysql.escape(req.body.port)+","+
            mysql.escape(req.body.extension)+","+
            mysql.escape(req.body.pin)+","+
            mysql.escape(req.body.disabled)+","+
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
        pool.query("UPDATE teilnehmer SET type=0, changed=1, timestamp=" + Math.floor(Date.now() / 1000) + " WHERE type!=0 AND uid=" + mysql.escape(req.body.uid) + ";", function (err, result) {
          if (err) {
            res.json({
              successful: false,
              message: err
            });
          } else {
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
  } else {
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