if(module.parent!=null){var mod = module;var load_order = [module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev = [];for(i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[37m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[37m":"\x1b[33m"+load_order[i]+"\x1b[37m");}console.log("loaded: "+load_order_rev.join(" --> "));}
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..','..'));

const express = require('express');
const router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
module.exports = router;
const mysql = require('mysql');
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));
const mySqlConnectionOptions = config.get('mySqlConnectionOptions');
const WEBINTERFACEPASSWORD = config.get('WEBINTERFACEPASSWORD');

const pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function(err, connection){
	if(err){
		console.error(colors.FgRed,"could not conect to database!",colors.Reset);
		throw err;
	}else{
		connection.release();
	}
});
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
        if(result[a].gesperrt===0||req.body.password==WEBINTERFACEPASSWORD){
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
            +",changed=1 WHERE uid="+mysql.escape(req.body.uid), function(err, result){
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
