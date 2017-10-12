const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";
const FgBlack = "\x1b[30m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
const FgWhite = "\x1b[37m";
const BgBlack = "\x1b[40m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgYellow = "\x1b[43m";
const BgBlue = "\x1b[44m";
const BgMagenta = "\x1b[45m";
const BgCyan = "\x1b[46m";
const BgWhite = "\x1b[47m";


const mySqlConnectionOptions = {
	host: "localhost",
	user: "telefonbuch",
	password: "amesads"
};

const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;

const QUEUE_SEND_INTERVAL = 60000;

const net = require('net');
const mysql = require('mysql');
const async = require('async');
const ITelexCom=require("./ITelexCom.js");

const serverpin = 118120815;

var connections = [];
var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}

handles[8][RESPONDING] = (obj,cnum,dbcon,connection,handles)=>{
	console.log(FgMagenta,connections[cnum].writebuffer,FgWhite);
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	if(connections[cnum].writebuffer.length > 0){
		console.log("writing!");
		var b = connection.write(ITelexCom.encPacket({packagetype:5,datalength:100,data:connections[cnum].writebuffer[0]}));
		if(b){
			console.log("wrote!");
			console.log(connections[cnum].writebuffer[0]);
			dbcon.query("DELETE FROM telefonbuch.queue WHERE message="+connections[cnum].writebuffer[0].uid+" AND server="+connections[cnum].servernum+";",function(err,res) {
				if(err){
					console.log(err);
				}else if(res.affectedRows > 0){
					console.log(FgGreen+"deleted queue entry "+FgCyan+connections[cnum].writebuffer[0].name+FgGreen+" from queue"+FgWhite);
					connections[cnum].writebuffer = connections[cnum].writebuffer.splice(1);
				}
			});
		}else{
			console.log("error writing");
		}
	}else if(connections[cnum].writebuffer.length <= 0){
		connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
		connections[cnum].writebuffer = [];
		connections[cnum].state = STANDBY;
	}
};
var sendInt = setInterval(SendQueue,QUEUE_SEND_INTERVAL);
process.stdin.on('data',(data)=>{
	if(data.toString() === "sendqueue"){
		clearInterval(sendInt);
		SendQueue(()=>{
			sendInt = setInterval(SendQueue,QUEUE_SEND_INTERVAL);
		});
	}
	console.log("stdin: "+data);
});
/*dbcon.query("DELETE FROM telefonbuch.queue WHERE uid="+row.uid, function (err, result2) {
	console.log(FgGreen+"deleted queue entry "+FgCyan+result2.uid+FgGreen+" from queue"+FgWhite);
});*/
function SendQueue(callback){
	console.log(FgCyan+"Sending Queue!"+FgWhite);
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	dbcon.query("SELECT * FROM telefonbuch.teilnehmer", function (err, teilnehmer){
		if(err){
			console.log(err);
		}
		dbcon.query("SELECT * FROM telefonbuch.queue", function (err, results){//order by server
			if(err) console.log(err);
			if(results.length>0){
				var servers = {};
				for(i in results){
					if(!servers[results[i].server]){
						servers[results[i].server] = [];
					}
					servers[results[i].server][servers[results[i].server].length] = results[i];
				}
				console.log(BgMagenta,FgBlack,servers,BgBlack,FgWhite);
				async.eachSeries(servers,function(server,cb){
					console.log(FgMagenta,server,FgWhite);
					dbcon.query("SELECT * FROM telefonbuch.servers WHERE uid="+server[0].server+";",(err, result2)=>{
						if(err){
							console.log(err);
						}
						var serverinf = result2[0];
						console.log(FgCyan,serverinf,FgWhite);
						try{
							ITelexCom.connect(dbcon,cb,{host:serverinf.addresse,port: serverinf.port},handles,function(client,cnum){
								connections[cnum].servernum = server[0].server;
								console.log(FgGreen+'connected to server: '+serverinf.addresse+" on port: "+serverinf.port+FgWhite);
								connections[cnum].writebuffer = [];
								async.each(server,(serverdata,scb)=>{
									console.log(FgCyan,serverdata,FgWhite);
									dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE uid="+serverdata.message+";",(err, result3)=>{
										connections[cnum].writebuffer[connections[cnum].writebuffer.length] = result3[0];
										scb();
									});
								},()=>{
									client.write(ITelexCom.encPacket({packagetype:7,datalength:5,data:{serverpin:serverpin,version:1}}),()=>{
										connections[cnum].state = RESPONDING;
										cb();
									});
								});
							});
						}catch(e){
							console.log(e);
							//cb();
						}
					})
				},()=>{
					console.log("done");
					dbcon.end();
					try{callback();}catch(e){}
				});
			}else{
				console.log(FgYellow,"No queue!",FgWhite);
				try{callback();}catch(e){}
			}
		});
	});
}
