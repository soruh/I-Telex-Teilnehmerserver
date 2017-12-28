if(module.parent!=null){var mod = module;var load_order = [module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev = [];for(i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[37m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[37m":"\x1b[33m"+load_order[i]+"\x1b[37m");}console.log("loaded: "+load_order_rev.join(" --> "));}
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));

const ll = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js")).ll;
const mysql = require('mysql');
const ITelexCom = require(path.join(PWD,"/BINARYSERVER/ITelexCom.js"));
const cv = ITelexCom.cv;
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
handles[8][ITelexCom.states.RESPONDING] = function(obj,cnum,pool,connection,handles,cb){
	if(cv(2)){
		var toSend = [];
		for(o of ITelexCom.connections[cnum].writebuffer){
			toSend.push(o.rufnummer);
		}
		if(cv(2)) ll("writebuffer:",colors.FgBlue,toSend,colors.Reset);
		if(cv(2)) ll("writebuffer-length:",colors.FgBlue,ITelexCom.connections[cnum].writebuffer.length,colors.Reset);
	}
	if(ITelexCom.connections[cnum].writebuffer.length > 0){
		if(cv(2)) ll("writing!");
		var b = connection.write(ITelexCom.encPackage({packagetype:5,datalength:100,data:ITelexCom.connections[cnum].writebuffer[0]}),function(){
			if(b){
				if(cv(2)) ll("wrote!");
				/*ITelexCom.SqlQuery(pool,"SELECT * FROM queue",function(res,err){ //Debug
					ll(res,err,ITelexCom.connections[cnum].writebuffer[0].uid);
				});*/
				ITelexCom.SqlQuery(pool,"DELETE FROM queue WHERE message="+ITelexCom.connections[cnum].writebuffer[0].uid+" AND server="+ITelexCom.connections[cnum].servernum+";",function(res){
					console.log(res);
					if(res.affectedRows > 0){
						if(cv(1)) ll(colors.FgGreen+"deleted queue entry "+colors.FgCyan+ITelexCom.connections[cnum].writebuffer[0].name+colors.FgGreen+" from queue"+colors.Reset);
					}else{
						if(cv(1)) ll(colors.FgRed+"could not delete queue entry "+colors.FgCyan+ITelexCom.connections[cnum].writebuffer[0].name+":"+colors.FgRed,"res:",res,colors.Reset);
					}
					ITelexCom.connections[cnum].writebuffer = ITelexCom.connections[cnum].writebuffer.slice(1);
					if(typeof cb === "function") cb();
				});
			}else{
				if(cv(0)) ll(colors.FgRed+"error writing"+colors.Reset);
				if(typeof cb === "function") cb();
			}
		});
	}else{
		connection.write(ITelexCom.encPackage({packagetype:9,datalength:0}),function(){
			ITelexCom.connections[cnum].writebuffer = [];
			ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
			if(typeof cb === "function") cb();
	});
	}
};

//var sendInt = setInterval(interval,config.get("QUEUE_SEND_INTERVAL"));
ITelexCom.TimeoutWrapper(ITelexCom.SendQueue,config.get("QUEUE_SEND_INTERVAL"),process.stderr,pool,handles);

process.stdin.on('data',function(data){
	if(cv(3)) ll(colors.FgBlue+data.toString()+colors.Reset);
	if(data.toString() === "sendqueue"){
		ITelexCom.SendQueue(pool,handles);
	}else if(data.toString() === "pausetimeouts"){
		for(k of Object.keys(ITelexCom.timeouts)){
			if(cv(3)) ll("pausing: "+k);
			ITelexCom.timeouts[k].pause();
		}
	}else if(data.toString() === "resumetimeouts"){
		for(k of Object.keys(ITelexCom.timeouts)){
			if(cv(3)) ll("resuming: "+k);
			ITelexCom.timeouts[k].resume();
		}
	}
});

/*pool.query("DELETE FROM queue WHERE uid="+row.uid, function (err, result2) {
	if(cv(0)) ll(colors.FgGreen+"deleted queue entry "+colors.FgCyan+result2.uid+colors.FgGreen+" from queue"+colors.Reset);
});*/
