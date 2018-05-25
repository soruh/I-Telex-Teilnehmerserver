"use strict";
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..','..'));

const {ll,lle,llo} = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js"));
const mysql = require('mysql');
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));
const colors = require(path.join(PWD,'/COMMONMODULES/colors.js'));

var mySqlConnectionOptions = config.get('mySqlConnectionOptions');
mySqlConnectionOptions.multipleStatements = true;

const pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function(err, connection){
  if(err){
    lle(colors.FgRed,"could not connect to database!",colors.Reset);
    throw err;
  }else{
    ll(colors.FgGreen,"connected to database!",colors.Reset);
    connection.release();
  }
});

const router = require('express').Router();
router.get('/', function(req, res, next){
  res.render('index');
});

router.post('/list', function(req, res){
  // ll(req.body);
  res.header("Content-Type", "application/json; charset=utf-8");
  pool.query("SELECT * FROM teilnehmer", function(err,result){
    if(err){
      res.json({successful:false,message:err});
    }else{
      var resultPublic = [];
      for(let a in result){
        if(
          (result[a].gesperrt===0||req.body.password==config.get("webInterfacePassword"))&&
          ((result[a].typ != 0)||req.body.password==config.get("webInterfacePassword"))
        ){
          var i=resultPublic.length;
          resultPublic[i] = {};
          for(let b in result[a]){
            if(
              ((b != "pin")||(false&&req.body.password == config.get("webInterfacePassword")))&&
              ((b != "gesperrt")||(req.body.password == config.get("webInterfacePassword")))&&
              (b != "changed")
            ){
              resultPublic[i][b] = result[a][b];
            }
          }
        }
      }
      res.json({successful:true,message:null,result:resultPublic});
    }
  });
});

router.post('/edit', function(req, res){
  // ll(req.body);
  res.header("Content-Type", "application/json; charset=utf-8");
  if(req.body.password==config.get("webInterfacePassword")){
    switch(req.body.typekey){
      case "edit":
        pool.query("SELECT * FROM teilnehmer;", function(err, r){
          if(err){
            res.json({successful:false,message:err});
          }else{
            let existing = false;
            let toEdit = false;
            for(let e of r){
              if(e.uid == req.body.uid){
                toEdit = e;
              }
            }
            for(let e of r){
              if(
                (e.rufnummer == req.body.rufnummer)&&
                (e.uid != req.body.uid)
              ){
                existing = e;
              }
            }
            // ll(toEdit);
            // ll(existing);
            if(toEdit){
              let qstr = "UPDATE teilnehmer SET "+
              "rufnummer="+mysql.escape(req.body.rufnummer)+
              ",name="+mysql.escape(req.body.name)+
              ",typ="+mysql.escape(req.body.typ)+
              ",hostname="+mysql.escape(req.body.hostname)+
              ",ipaddresse="+mysql.escape(req.body.ipaddresse)+
              //",pin="+mysql.escape(req.body.pin)+
              ",port="+mysql.escape(req.body.port)+
              ",extension="+mysql.escape(req.body.extension)+
              ",gesperrt="+mysql.escape(req.body.gesperrt)+
              ",moddate="+mysql.escape(Math.floor(new Date().getTime()/1000))+
              ",changed=1 "+
              "WHERE uid="+mysql.escape(req.body.uid)+";";
              if(existing&&toEdit.rufnummer!=req.body.rufnummer){
                qstr = "DELETE FROM teilnehmer WHERE uid="+existing.uid+";"+qstr;
              }
              if(toEdit.rufnummer != req.body.rufnummer){
                qstr += "INSERT INTO teilnehmer "+
                "(rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed) VALUES ("+
                mysql.escape(toEdit.rufnummer)+","+
                mysql.escape(toEdit.name)+
                ",0,"+
                mysql.escape(toEdit.hostname)+","+
                mysql.escape(toEdit.ipaddresse)+","+
                mysql.escape(toEdit.port)+","+
                mysql.escape(toEdit.extension)+","+
                mysql.escape(toEdit.pin)+","+
                mysql.escape(toEdit.gesperrt)+","+
                mysql.escape(Math.floor(new Date().getTime()/1000))+","+
                "'1'"+
                ");";
              }
              pool.query(qstr, function(err, result){
                if(err){
                  res.json({successful:false,message:err});
                }else{
                  res.json({successful:true,message:result});
                }
              });
            }else{
              ll("entry does not exist");
              res.json({successful:false,message:"entry does not exist"});
            }
          }
        });
        break;
      case "new":
        pool.query("SELECT * FROM teilnehmer;",function(err, teilnehmer){
          if(err){
            res.json({successful:false,message:err});
          }else{
            let existing = false;
            for(let t of teilnehmer){
              if(t.rufnummer == req.body.rufnummer) existing = t;
            }
            let qstr =
              "INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate) VALUES ("+
              mysql.escape(req.body.rufnummer)+","+
              mysql.escape(req.body.name)+","+
              mysql.escape(req.body.typ)+","+
              mysql.escape(req.body.hostname)+","+
              mysql.escape(req.body.ipaddresse)+","+
              mysql.escape(req.body.port)+","+
              mysql.escape(req.body.extension)+","+
              mysql.escape(req.body.pin)+","+
              mysql.escape(req.body.gesperrt)+","+
              mysql.escape(Math.floor(new Date().getTime()/1000))+
              ");";
            if(existing){
              if(existing.typ == 0){
                qstr = "DELETE FROM teilnehmer WHERE uid="+existing.uid+";"+qstr;
                pool.query(qstr, function(err, result){
                  if(err){
                    res.json({successful:false,message:err});
                  }else{
                    res.json({successful:true,message:result});
                  }
                });
              }else{
                res.json({successful:false,message:"already exists"});
              }
            }else{
              pool.query(qstr, function(err, result){
                if(err){
                  res.json({successful:false,message:err});
                }else{
                  res.json({successful:true,message:result});
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
            mysql.escape(Math.floor(new Date().getTime()/1000))+
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
        pool.query("UPDATE teilnehmer SET typ=0, changed=1, moddate="+Math.floor(new Date().getTime()/1000)+" WHERE typ!=0 AND uid="+mysql.escape(req.body.uid)+";",function(err,result){
          if(err){
            res.json({successful:false,message:err});
          }else{
            res.json({successful:true,message:result});
          }
        });
        break;
      case "checkpwd":
        res.json({successful:true,message:{code:1,text:"password is correct"}});
        break;
      default:
        res.json({successful:false,message:{code:-2,text:"unknown typekey"}});
        break;
    }
  }else{
    res.json({successful:false,message:{code:-1,text:"wrong password!"}});
  }
});

module.exports = router;
