const mysql = require('mysql');
const ITelexCom=require("./ITelexCom.js");
const colors = require("./colors.js");
const config = require('./config.js');

const QUEUE_SEND_INTERVAL = config.QUEUE_SEND_INTERVAL;
const mySqlConnectionOptions = {
	host: config.SQL_host,
	user: config.SQL_user,
	password: config.SQL_password
};
var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}

handles[8][ITelexCom.states.RESPONDING] = (obj,cnum,dbcon,connection,handles)=>{
	console.log(colors.FgMagenta,connections[cnum].writebuffer,colors.FgWhite);
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
					console.log(colors.FgGreen+"deleted queue entry "+colors.FgCyan+connections[cnum].writebuffer[0].name+colors.FgGreen+" from queue"+colors.FgWhite);
					connections[cnum].writebuffer = connections[cnum].writebuffer.splice(1);
				}
			});
		}else{
			console.log("error writing");
		}
	}else if(connections[cnum].writebuffer.length <= 0){
		connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
		connections[cnum].writebuffer = [];
		connections[cnum].state = ITelexCom.states.STANDBY;
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
	console.log(colors.FgGreen+"deleted queue entry "+colors.FgCyan+result2.uid+colors.FgGreen+" from queue"+colors.FgWhite);
});*/
