//const PWD = process.env.PWD;
const PWD = __dirname.split("/").slice(0,-2).join("/");
const mysql = require('mysql');
const ITelexCom = require(PWD+"/BINARYSERVER/ITelexCom.js");
const colors = require(PWD+"/COMMONMODULES/colors.js");
const config = require(PWD+'/COMMONMODULES/config.js');

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');

console.log("Initialising queuewatchdog");

var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}
handles[8][ITelexCom.states.RESPONDING] = function(obj,cnum,dbcon,connection,handles){
	if(ITelexCom.cv(2)) console.log(colors.FgMagenta,ITelexCom.connections[cnum].writebuffer,colors.FgWhite);
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	if(ITelexCom.connections[cnum].writebuffer.length > 0){
		if(ITelexCom.cv(2)) console.log("writing!");
		var b = connection.write(ITelexCom.encPacket({packagetype:5,datalength:100,data:ITelexCom.connections[cnum].writebuffer[0]}));
		if(b){
			if(ITelexCom.cv(2)) console.log("wrote!");
			if(ITelexCom.cv(1)) console.log(ITelexCom.connections[cnum].writebuffer[0]);
			ITelexCom.SqlQuery(dbcon,"DELETE FROM queue WHERE message="+ITelexCom.connections[cnum].writebuffer[0].uid+" AND server="+ITelexCom.connections[cnum].servernum+";",function(res){
				if(res.affectedRows > 0){
					if(ITelexCom.cv(1)) console.log(colors.FgGreen+"deleted queue entry "+colors.FgCyan+ITelexCom.connections[cnum].writebuffer[0].name+colors.FgGreen+" from queue"+colors.FgWhite);
					ITelexCom.connections[cnum].writebuffer = ITelexCom.connections[cnum].writebuffer.splice(1);
				}
			});
		}else{
			if(ITelexCom.cv(0)) console.log("error writing");
		}
	}else if(ITelexCom.connections[cnum].writebuffer.length <= 0){
		connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
		ITelexCom.connections[cnum].writebuffer = [];
		ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	}
};

var sendInt = setInterval(interval,config.get("QUEUE_SEND_INTERVAL"));
process.stdin.on('data',function(data){
	console.log(data.toString());
	if(data.toString() === "sendqueue"){
		interval();
	}
});
function interval(){
	console.log("sendqueue");
	clearInterval(sendInt);
	ITelexCom.SendQueue(handles,function(){
		sendInt = setInterval(ITelexCom.SendQueue,config.get("QUEUE_SEND_INTERVAL"));
	});
}
/*dbcon.query("DELETE FROM queue WHERE uid="+row.uid, function (err, result2) {
	if(ITelexCom.cv(0)) console.log(colors.FgGreen+"deleted queue entry "+colors.FgCyan+result2.uid+colors.FgGreen+" from queue"+colors.FgWhite);
});*/
