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


const mysql = require('mysql');
const ITelexCom=require("./ITelexCom.js");

const serverpin = 118120815;


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
var sendInt = setInterval(ITelexCom.SendQueue,QUEUE_SEND_INTERVAL);
process.stdin.on('data',(data)=>{
	if(data.toString() === "sendqueue"){
		clearInterval(sendInt);
		ITelexCom.SendQueue(()=>{
			sendInt = setInterval(ITelexCom.SendQueue,QUEUE_SEND_INTERVAL);
		});
	}
	console.log("stdin: "+data);
});
/*dbcon.query("DELETE FROM telefonbuch.queue WHERE uid="+row.uid, function (err, result2) {
	console.log(FgGreen+"deleted queue entry "+FgCyan+result2.uid+FgGreen+" from queue"+FgWhite);
});*/
