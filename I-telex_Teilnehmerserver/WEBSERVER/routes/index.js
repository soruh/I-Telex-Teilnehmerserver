const express = require('express');
const router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
module.exports = router;
const mysql = require('mysql');
const config = require('config');
const mySqlConnectionOptions = config.get('mySqlConnectionOptions');
const WEBINTERFACEPASSWORD = config.get('WEBINTERFACEPASSWORD');

const pool  = mysql.createPool(mySqlConnectionOptions);
router.post('/list', function(req, res){
  console.log(req.body);
  res.header("Content-Type", "application/json; charset=utf-8");
  pool.query("SELECT * FROM telefonbuch.teilnehmer", function (err, result) {
    if(err){
      res.json(err);
    }else{
//      console.log("Result: " + JSON.stringify(result).replace(/,/g,",\n").replace(/(},)/g,"},\n"));
      var resultnopin = [];
      for(a in result){
        if(result[a].gesperrt==0||req.body.password==WEBINTERFACEPASSWORD){
          var i=resultnopin.length;
          resultnopin[i] = {};
          for(b in result[i]){
            if(b != "pin" && b != "changed"&&(b != "gesperrt"||req.body.password=="password")){
              resultnopin[i][b] = result[i][b];
            }
          }
        }
      }
      console.log(resultnopin);
      res.json(resultnopin);
    }
  });
});

router.post('/edit', function(req, res){
  res.header("Content-Type", "application/json; charset=utf-8");
  if(req.body.password==WEBINTERFACEPASSWORD){
    switch(req.body.typekey){
      case "edit":
        pool.query("UPDATE telefonbuch.teilnehmer SET rufnummer= "+req.body.rufnummer+",name='"+req.body.name+"',typ="+req.body.typ+",hostname='"+req.body.hostname+"',ipaddresse='"+req.body.ipaddresse+"',port='"+req.body.port+"',extention='"+req.body.extention+"',gesperrt="+req.body.gesperrt+", moddate="+Math.round(new Date().getTime()/1000)+" WHERE rufnummer="+req.body.rufnummer, (err, result)=>{
          if(err){
            res.json(err);
          }else{
            res.json(result);
          }
        });
        break;
      case "new":
        pool.query("INSERT INTO telefonbuch.teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extention,pin,gesperrt,moddate) VALUES ("+req.body.rufnummer+",'"+req.body.name+"',"+req.body.typ+",'"+req.body.hostname+"','"+req.body.ipaddresse+"','"+req.body.port+"','"+req.body.extention+"','"+req.body.pin+"',"+req.body.gesperrt+",'"
        +Math.round(new Date().getTime()/1000)+"')",
         function (err, result) {
          if(err){
            res.json(err);
          }else{
            res.json(result);
          }
        });
        break;
      case "delete":
        pool.query("DELETE FROM telefonbuch.teilnehmer WHERE rufnummer="+req.body.rufnummer, function (err, result) {
          if(err){
            res.json(err);
          }else{
            res.json(result);
          }
        });
        break;
      case "checkpwd":
        res.json({code:1,text:"password is correct"});
        break;
      default:
        res.json({code:-2,text:"unknown typekey"});
        break;
    }
  }else{
    res.json({code:-1,text:"wrong password!"});
  }
});
