//const PWD = process.env.PWD;
const PWD = __dirname.split("/").slice(0,-2).join("/");
const express = require('express');
const router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
module.exports = router;
const mysql = require('mysql');
const config = require(PWD+'/COMMONMODULES/config.js');
const mySqlConnectionOptions = config.get('mySqlConnectionOptions');
const WEBINTERFACEPASSWORD = config.get('WEBINTERFACEPASSWORD');

const pool  = mysql.createPool(mySqlConnectionOptions);
router.post('/list', function(req, res){
  console.log(req.body);
  res.header("Content-Type", "application/json; charset=utf-8");
  pool.query("SELECT * FROM teilnehmer", function (err, result) {
    if(err){
      res.json({successful:false,message:err});
    }else{
  //  console.log("Result: " + JSON.stringify(result).replace(/,/g,",\n").replace(/(},)/g,"},\n"));
      var resultPublic = [];
      for(a in result){
        if(result[a].gesperrt==0||req.body.password==WEBINTERFACEPASSWORD){
          var i=resultPublic.length;
          resultPublic[i] = {};
          for(b in result[i]){
            if(((b != "pin")||(false&&req.body.password=="password"))&&(((b != "gesperrt")||(req.body.password=="password"))&&(b != "changed"))){
              resultPublic[i][b] = result[i][b];
            }
          }
        }
      }
  //  console.log(resultPublic);
      res.json({successful:true,message:null,result:resultPublic});
    }
  });
});

router.post('/edit', function(req, res){
  console.log(req.body);
  res.header("Content-Type", "application/json; charset=utf-8");
  if(req.body.password==WEBINTERFACEPASSWORD){
    switch(req.body.typekey){
      case "edit":
        var message = [];
        var success = true;
        pool.query("SELECT * FROM teilnehmer WHERE uid="+mysql.escape(req.body.uid)+";", function(err, list){
          if(err){
            success = false;
            message.push(err);
          }else{
            message.push(list);

            pool.query("UPDATE teilnehmer SET rufnummer="+mysql.escape(req.body.rufnummer)+",name="+mysql.escape(req.body.name)+",typ="+mysql.escape(req.body.typ)+",hostname="+mysql.escape(req.body.hostname)+",ipaddresse="+mysql.escape(req.body.ipaddresse)+/*",pin="+mysql.escape(req.body.pin)+*/",port="+mysql.escape(req.body.port)+",extension="+mysql.escape(req.body.extension)+",gesperrt="+mysql.escape(req.body.gesperrt)+", moddate="+mysql.escape(Math.floor(new Date().getTime()/1000))
            +" WHERE uid="+mysql.escape(req.body.uid), function(err, result){
              if(err){
                success = false;
                message.push(err);
              }else{
                message.push(result);

                if(list[0].rufnummer!=req.body.rufnummer){
                  /*"UPDATE teilnehmer SET rufnummer="+mysql.escape(req.body.rufnummer)+",name="+mysql.escape(req.body.name)+",typ="+mysql.escape(req.body.typ)+",hostname="+mysql.escape(req.body.hostname)+",ipaddresse="+mysql.escape(req.body.ipaddresse)+",port="+mysql.escape(req.body.port)+",extension="+mysql.escape(req.body.extension)+",gesperrt="+mysql.escape(req.body.gesperrt)+", moddate="+mysql.escape(Math.floor(new Date().getTime()/1000))
                  +" WHERE uid="+mysql.escape(req.body.uid),*/
                  pool.query("INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate) VALUES ("+mysql.escape(req.body.rufnummer)+","+mysql.escape(req.body.name)+",0,"+mysql.escape(req.body.hostname)+","+mysql.escape(req.body.ipaddresse)+","+mysql.escape(req.body.port)+","+mysql.escape(req.body.extension)+","+mysql.escape(req.body.pin)+","+mysql.escape(req.body.gesperrt)+","+mysql.escape(Math.floor(new Date().getTime()/1000))+")",function(err, result){
                    if(err){
                      success = false;
                      message.push(err);
                    }else{
                      message.push(result);
                    }
                    res.json({successful:success,message:message});
                  });
                }else{
                  res.json({successful:success,message:message});
                }
              }
            });
          }
        });
        break;
      case "new":
        pool.query("INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate) VALUES ("+mysql.escape(req.body.rufnummer)+","+mysql.escape(req.body.name)+","+mysql.escape(req.body.typ)+","+mysql.escape(req.body.hostname)+","+mysql.escape(req.body.ipaddresse)+","+mysql.escape(req.body.port)+","+mysql.escape(req.body.extension)+","+mysql.escape(req.body.pin)+","+mysql.escape(req.body.gesperrt)+","
        +mysql.escape(Math.floor(new Date().getTime()/1000))+")",
         function (err, result) {
          if(err){
            res.json({successful:false,message:err});
          }else{
            res.json({successful:true,message:result});
          }
        });
        break;
      case "delete":
        pool.query("UPDATE teilnehmer SET typ=0 WHERE uid="+mysql.escape(req.body.uid)+";",function(err,result){
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
