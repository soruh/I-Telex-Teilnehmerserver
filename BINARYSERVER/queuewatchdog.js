if(module.parent!=null){var mod = module;var load_order = [module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev = [];for(i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[37m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[37m":"\x1b[33m"+load_order[i]+"\x1b[37m");}console.log("loaded: "+load_order_rev.join(" --> "));}
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));

const ll = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js")).ll;
const mysql = require('mysql');
const ITelexCom = require(path.join(PWD,"/BINARYSERVER/ITelexCom.js"));
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');

var pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function(err, connection){
	if(err){
		console.error(colors.FgRed,"could not connect to database!",colors.Reset);
		throw err;
	}else{
		connection.release();
	}
});

var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}
handles[8][ITelexCom.states.RESPONDING] = function(obj,cnum,pool,connection,handles){
	if(ITelexCom.cv(2)){
		var toSend = [];
		for(o of ITelexCom.connections[cnum].writebuffer){
			toSend.push(o.rufnummer);
		}
		ll("writebuffer:",colors.FgBlue,toSend,colors.Reset);
	}
	if(ITelexCom.connections[cnum].writebuffer.length > 0){
		if(ITelexCom.cv(2)) ll("writing!");
		var b = connection.write(ITelexCom.encPackage({packagetype:5,datalength:100,data:ITelexCom.connections[cnum].writebuffer[0]}));
		if(b){
			if(ITelexCom.cv(2)) ll("wrote!");
			if(ITelexCom.cv(1)) ll(ITelexCom.connections[cnum].writebuffer[0]);
			ITelexCom.SqlQuery(pool,"SELECT * FROM queue",function(res,err){ //Debug
				ll(res,err,ITelexCom.connections[cnum].writebuffer[0].uid);
			});
			ITelexCom.SqlQuery(pool,"DELETE FROM queue WHERE message="+ITelexCom.connections[cnum].writebuffer[0].uid+" AND server="+ITelexCom.connections[cnum].servernum+";",function(res,err){
				if(!err&&res.affectedRows > 0){
					if(ITelexCom.cv(1)) ll(colors.FgGreen+"deleted queue entry "+colors.FgCyan+ITelexCom.connections[cnum].writebuffer[0].name+colors.FgGreen+" from queue"+colors.Reset);
				}else{
					if(ITelexCom.cv(1)) ll(colors.FgRed+"could not delete queue entry "+colors.FgCyan+ITelexCom.connections[cnum].writebuffer[0].name+":"+colors.FgRed,err,colors.Reset);
				}
				ITelexCom.connections[cnum].writebuffer = ITelexCom.connections[cnum].writebuffer.splice(0,1);
			});
		}else{
			if(ITelexCom.cv(0)) ll(colors.FgRed+"error writing"+colors.Reset);
		}
	}else if(ITelexCom.connections[cnum].writebuffer.length <= 0){
		connection.write(ITelexCom.encPackage({packagetype:9,datalength:0}));
		ITelexCom.connections[cnum].writebuffer = [];
		ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	}
};

var sendInt = setInterval(interval,config.get("QUEUE_SEND_INTERVAL"));
process.stdin.on('data',function(data){
	//ll(data.toString());
	if(data.toString() === "sendqueue"){
		interval();
	}
});
function interval(){
	clearInterval(sendInt);
	ITelexCom.SendQueue(handles,function(){
		sendInt = setInterval(ITelexCom.SendQueue,config.get("QUEUE_SEND_INTERVAL"));
	});
}
/*pool.query("DELETE FROM queue WHERE uid="+row.uid, function (err, result2) {
	if(ITelexCom.cv(0)) ll(colors.FgGreen+"deleted queue entry "+colors.FgCyan+result2.uid+colors.FgGreen+" from queue"+colors.Reset);
});*/
