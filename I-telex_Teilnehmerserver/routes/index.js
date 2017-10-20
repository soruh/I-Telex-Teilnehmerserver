var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
module.exports = router;
var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "telefonbuch",
  password: "amesads"
});
con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  router.get('/stats', function(req, res){
    res.header("Content-Type", "application/json; charset=utf-8");
    con.query("SELECT * FROM telefonbuch.teilnehmer", function (err, result) {
      if(err){
        res.json(err);
      }else{
        //console.log("Result: " + JSON.stringify(result).replace(/,/g,",\n").replace(/(},)/g,"},\n"));
        var resultnopin = [];
        for(a in result){
          if(result[a].gesperrt==0){
            var i=resultnopin.length;
            resultnopin[i] = {};
            console.log(result[i]);
            for(b in result[i]){
              console.log(b);
              if(b != "pin" && b != "uid" && b != "changed"&&b != "gesperrt"){
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
    if(req.body.password=="password"){
      switch(req.body.typekey){
        case "edit":
          con.query("UPDATE telefonbuch.teilnehmer SET rufnummer= "+req.body.rufnummer+",name='"+req.body.name+"',typ="+req.body.typ+",hostname='"+req.body.hostname+"',ipaddresse='"+req.body.ipaddresse+"',port='"+req.body.port+"',extention='"+req.body.extention+"',gesperrt="+req.body.gesperrt+", moddate="+Math.round(new Date().getTime()/1000)+" WHERE rufnummer="+req.body.rufnummer, (err, result)=>{
            if(err){
              res.json(err);
            }else{
              res.json(result);
            }
          });
          break;

        case "new":
          con.query("INSERT INTO telefonbuch.teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extention,pin,gesperrt,moddate) VALUES ("+req.body.rufnummer+",'"+req.body.name+"',"+req.body.typ+",'"+req.body.hostname+"','"+req.body.ipaddresse+"','"+req.body.port+"','"+req.body.extention+"','"+req.body.pin+"',"+req.body.gesperrt+",'"
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
          con.query("DELETE FROM telefonbuch.teilnehmer WHERE rufnummer="+req.body.rufnummer, function (err, result) {
            if(err){
              res.json(err);
            }else{
              res.json(result);
            }
          });
          break;
        case "confirmpassword":
          res.json("password is correct");
          break;
        default:
          res.json("unknown typekey");
          break;
      }
    }else{
      res.json("wrong password!");
    }
  });
});
/*
//INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extention,pin,gesperrt,moddate) VALUES ("a","b",2,"c","d","e","f","g",0,2);
var net = require('net');

const server = net.createServer((socket) => {
  socket.write('hi?\n');
  socket.on('data', (data) => {
    console.log(data.toString());
  });
  socket.on('close', () => {
    console.log("closed");
  });
}).on('error', (err) => {
  console.log(err);
});

server.listen({
  host: 'localhost',
  port: 11811
},() => {console.log("port 11811 opened!");});
*/
