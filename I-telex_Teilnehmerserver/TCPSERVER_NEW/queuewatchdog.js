const mysql = require('mysql');
const ITelexCom=require("./ITelexCom.js");
const COLORS = require("./colors.js")

const QUEUE_SEND_INTERVAL = 60000;
const serverpin = 118120815;
const mySqlConnectionOptions = {
	host: "localhost",
	user: "telefonbuch",
	password: "amesads"
};

var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}

handles[8][ITelexCom.states.RESPONDING] = (obj,cnum,dbcon,connection,handles)=>{
	console.log(COLORS.FgMagenta,connections[cnum].writebuffer,COLORS.FgWhite);
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
					console.log(COLORS.FgGreen+"deleted queue entry "+COLORS.FgCyan+connections[cnum].writebuffer[0].name+COLORS.FgGreen+" from queue"+COLORS.FgWhite);
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
	console.log(COLORS.FgGreen+"deleted queue entry "+COLORS.FgCyan+result2.uid+COLORS.FgGreen+" from queue"+COLORS.FgWhite);
});*/
