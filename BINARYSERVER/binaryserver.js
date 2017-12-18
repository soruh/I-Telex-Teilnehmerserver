//const PWD = process.env.PWD;
//const PWD = __dirname.split("/").slice(0,-2).join("/");
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const cp = require('child_process');
const fs = require('fs');
const ITelexCom = require(path.join(PWD,"/BINARYSERVER/ITelexCom.js"));
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));

const config = require(path.join(PWD,'/COMMONMODULES/config.js'));

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');
var dbcon = mysql.createPool(mySqlConnectionOptions);
/*const mySqlConnectionOptions = {
	host: config.SQL_host,
	user: config.SQL_user,
	password: config.SQL_password
};*/
// "" => log to console
// "-" => don't log
//const config.QWD_STDOUT_LOG = "./config.QWD_STDOUT_LOG";
//const config.QWD_STDERR_LOG  = ."/config.QWD_STDERR_LOG";

/*<PKGTYPES>
Client_update: 1
Address_confirm: 2
Peer_query: 3
Peer_not_found: 4
Peer_reply: 5
Sync_FullQuery: 6
Sync_Login: 7
Acknowledge: 8
End_of_List: 9
Peer_search: 10
</PKGTYPES>*/
var handles = {};	//functions for handeling packages
for(i = 1;i <= 10;i++){handles[i] = {};}
//handes[packagetype][state of this connection]
//handles[2][ITelexCom.states.STANDBY] = (obj,cnum,dbcon,connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,dbcon,connection)=>{}; NOT USED
handles[1][ITelexCom.states.STANDBY] = function(obj,cnum,dbcon,connection,handles){
	var number = obj.data.rufnummer;
	var pin = obj.data.pin;
	var port = obj.data.port;
	ITelexCom.SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE rufnummer = "+number,function(result_a){
		if(result_a&&(result_a.length>0)){
			var res = result_a[0];
			if(ITelexCom.cv(2)) console.log(res);
			if(res.pin == pin){
				ITelexCom.SqlQuery(dbcon,"UPDATE teilnehmer SET port = '"+port+"', ipaddresse = '"+connection.remoteAddress.replace(/^.*:/,'')+"' WHERE rufnummer = "+number+";",function(result_b){
					ITelexCom.SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE rufnummer = "+number+";",function(result_c){
						try{
							connection.write(ITelexCom.encPacket({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary");
						}catch(e){
							if(ITelexCom.cv(0)) console.log(colors.FgRed,e,colors.FgWhite);
						}
					});
				});
			}else if(res.pin != pin){
				connection.end();
			}
		}else{
			ITelexCom.SqlQuery(dbcon,"INSERT INTO teilnehmer (name,moddate,typ,rufnummer,port,pin,ipaddresse,gesperrt) VALUES ('?','"+Math.floor(new Date().getTime()/1000)+"','5','"+number+"','"+port+"','"+pin+"','"+connection.remoteAddress.replace(/^.*:/,'')+"','1');",function(result_b){
				ITelexCom.SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE rufnummer = "+number+";",function(result_c){
					if(result_c.length>0){
						try{
							connection.write(ITelexCom.encPacket({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary");
						}catch(e){
							if(ITelexCom.cv(0)) console.log(colors.FgRed,e,colors.FgWhite);
						}
						//connection.end();
					}else{
						console.log("no such entry");
						//connection.end();
					}
				});
			});
		}
	});
};
handles[3][ITelexCom.states.STANDBY] = function(obj,cnum,dbcon,connection,handles){
	if(obj.data.version == 1){
		var rufnummer = obj.data.rufnummer;
		ITelexCom.SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE rufnummer = "+rufnummer+";",function(result){
			if(ITelexCom.cv(2)) console.log(colors.FgCyan,result,colors.FgWhite);
			if((result[0] != undefined)&&(result != [])&&(o.gesperrt != 1)&&(o.typ != 0)){
				connection.write(ITelexCom.encPacket({packagetype:5,datalength:100,data:result[0]}));
			}else{
				connection.write(ITelexCom.encPacket({packagetype:4,datalength:0}));
			}
		});
	}else{
		if(ITelexCom.cv(0)) console.log(colors.FgRed,"unsupported packet version, sending '0x04' packet",colors.FgWhite);
		connection.write(ITelexCom.encPacket({packagetype:4,datalength:0}));
	}
};
handles[5][ITelexCom.states.FULLQUERY] = function(obj,cnum,dbcon,connection,handles){
	if(ITelexCom.cv(2)) console.log(obj);
	ITelexCom.SqlQuery(dbcon,"SELECT * from teilnehmer WHERE rufnummer = "+mysql.escape(obj.data.rufnummer)+";",function(res){
		if(res.length == 1){
			if(obj.data.timestamp > res.moddate){
				if(ITelexCom.cv(0)) console.log(obj.data.timestamp+" > "+res.moddate);
				ITelexCom.SqlQuery(dbcon,"UPDATE teilnehmer SET rufnummer = "+mysql.escape(obj.data.rufnummer)+",name = "+mysql.escape(obj.data.name)+",typ = "+mysql.escape(obj.data.typ)+",hostname = "+mysql.escape(obj.data.addresse)+",ipaddresse = "+mysql.escape(obj.data.ipaddresse)+",port = "+mysql.escape(obj.data.port)+",extension = "+mysql.escape(obj.data.durchwahl)+",pin = "+mysql.escape(obj.data.pin)+",gesperrt = "+mysql.escape(obj.data.flags)+",moddate = "+mysql.escape(obj.data.timestamp)+",changed = "+mysql.escape(0)+"WHERE rufnummer = "+mysql.escape(obj.data.rufnummer)+";",function(res2){
					connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
				});
			}else{
				connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
			}
		}else if(res.length == 0){
			ITelexCom.SqlQuery(dbcon,"INSERT INTO teilnehmer(rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed)VALUES("+mysql.escape(obj.data.rufnummer)+","+mysql.escape(obj.data.name)+","+mysql.escape(obj.data.typ)+","+mysql.escape(obj.data.addresse)+","+mysql.escape(obj.data.ipaddresse)+","+mysql.escape(obj.data.port)+","+mysql.escape(obj.data.durchwahl)+","+mysql.escape(obj.data.pin)+","+mysql.escape(obj.data.flags)+","+mysql.escape(obj.data.timestamp)+","+mysql.escape(0)+");",function(res2){
				connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
			});
		}else{
			if(ITelexCom.cv(0)) console.log('Something really strange happened, the "rufnummer" field should be unique!');
		}
	});
};
handles[5][ITelexCom.states.LOGIN] = function(obj,cnum,dbcon,connection,handles){
	if(obj.data./*data.*/version == 1){
		if(ITelexCom.cv(2)) console.log(obj);
		ITelexCom.SqlQuery(dbcon,"SELECT * from teilnehmer WHERE rufnummer = "+obj.data./*data.*/rufnummer+";",function(res){
			if(res.length == 1){
				if(obj.data./*data.*/timestamp > res.moddate){
					ITelexCom.SqlQuery(dbcon,"UPDATE teilnehmerSETrufnummer = "+obj.data./*data.*/rufnummer+",name = "+obj.data./*data.*/name+",typ = "+obj.data./*data.*/typ+",hostname = "+obj.data./*data.*/hostname+",ipaddresse = "+obj.data./*data.*/ipaddresse+",port = "+obj.data./*data.*/port+",extension = "+obj.data./*data.*/extension+",pin = "+obj.data./*data.*/pin+",gesperrt = "+obj.data./*data.*/gesperrt+",moddate = "+obj.data./*data.*/moddate+",changed = "+0+"WHERE rufnummer = "+obj.data./*data.*/rufnummer+";",function(res2){
						connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
					});
				}
			}else if(res.length == 0){
				ITelexCom.SqlQuery(dbcon,"INSERT INTO teilnehmer(rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed)VALUES("+obj.data./*data.*/rufnummer+","+obj.data./*data.*/name+","+obj.data./*data.*/typ+","+obj.data./*data.*/hostname+","+obj.data./*data.*/ipaddresse+","+obj.data./*data.*/port+","+obj.data./*data.*/extension+","+obj.data./*data.*/pin+","+obj.data./*data.*/gesperrt+","+obj.data./*data.*/moddate+","+0+");",function(res2){
					connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
				});
			}else{
				if(ITelexCom.cv(0)) console.log('Something really strange happened, the "rufnummer" field should be unique!');
			}
		});
	}else{
		if(ITelexCom.cv(0)) console.log(colors.FgRed,"unsupported package version",colors.FgWhite);
	}
};
handles[6][ITelexCom.states.STANDBY] = function(obj,cnum,dbcon,connection,handles){
	if(obj.data.pin == config.get("SERVERPIN")){
		ITelexCom.SqlQuery(dbcon,"SELECT * FROM teilnehmer",function(result){
			if((result[0] != undefined)&&(result != [])&&pin == config.get("SERVERPIN")){
				ITelexCom.connections[cnum].writebuffer = result;
				ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
				ITelexCom.handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection,handles);
			}else{
				connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
			}
		});
	}
}; //TODO: send stuff?
handles[7][ITelexCom.states.STANDBY] = function(obj,cnum,dbcon,connection,handles){
	if(obj.data.pin == config.get("SERVERPIN")){
		connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
		ITelexCom.connections[cnum].state = ITelexCom.states.LOGIN;
		ITelexCom.handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection,handles);
	}else{
		connection.end();
	}
};
handles[8][ITelexCom.states.RESPONDING] = function(obj,cnum,dbcon,connection,handles){
	if(ITelexCom.connections[cnum].writebuffer.length > 0){
		connection.write(ITelexCom.encPacket({packagetype:5,datalength:100,data:ITelexCom.connections[cnum].writebuffer[0]}),()=>{
			ITelexCom.connections[cnum].writebuffer = ITelexCom.connections[cnum].writebuffer.splice(1);
		});
	}else if(ITelexCom.connections[cnum].writebuffer.length  <=  0){
		connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
		ITelexCom.connections[cnum].writebuffer = [];
		ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	}
};
handles[9][ITelexCom.states.FULLQUERY] = function(obj,cnum,dbcon,connection,handles){
	ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	ITelexCom.connections[cnum].cb();
};
handles[9][ITelexCom.states.LOGIN] = function(obj,cnum,dbcon,connection,handles){
	ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
};
handles[10][ITelexCom.states.STANDBY] = function(obj,cnum,dbcon,connection,handles){
	if(ITelexCom.cv(2)) console.log(obj);
	var version = obj.data./*data.*/version;
	var query = obj.data./*data.*/pattern;
	var searchstring = "SELECT * FROM teilnehmer WHERE";
	queryarr = query.split(" ");
	for(i in queryarr){
		searchstring +=  " AND name LIKE '%"+queryarr[i]+"%'";
	}
	searchstring += ";"
	searchstring = searchstring.replace("WHERE AND","WHERE");
	if(ITelexCom.cv(2)) console.log(colors.FgGreen,searchstring,colors.FgWhite);
	ITelexCom.SqlQuery(dbcon,searchstring,function(result){
		if((result[0] != undefined)&&(result != [])){
			var towrite = [];
			for(o of result){
				if(o.gesperrt != 1&&o.typ != 0){
					towrite.push(o);
				}
			}
			ITelexCom.connections[cnum].writebuffer = towrite;
			if(ITelexCom.cv(2)) console.log(colors.FgBlue,ITelexCom.connections[cnum].writebuffer,colors.FgWhite);
			ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
			ITelexCom.handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection,handles);
		}else{
			connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
		}
	});
};
function init(){
	var server = net.createServer(function(connection){
		try{
			var cnum = -1;
			for(i = 0;i<ITelexCom.connections.length;i++){
				if(ITelexCom.connections[i] == null){
					cnum = i;
				}
			}
			if(cnum == -1){
				cnum = ITelexCom.connections.length;
			}
			ITelexCom.connections[cnum] = {connection:connection,timeout:setTimeout(ITelexCom.timeout,config.get("CONNECTIONTIMEOUT")),state:ITelexCom.states.STANDBY};
			// var dbcon = mysql.createConnection(mySqlConnectionOptions);
			if(ITelexCom.cv(1)) console.log(colors.FgGreen+"client "+colors.FgCyan+cnum+colors.FgGreen+" connected with ipaddress: "+connection.remoteAddress+colors.FgWhite);
			//.replace(/^.*:/,'')
			/*dbcon.connect(function(err){
				if(err){
					if(ITelexCom.cv(0)) console.log(colors.FgRed+"Connection of client "+colors.FgCyan+cnum+colors.FgRed+" to database threw an error:\n",err,colors.FgWhite);
					connection.end(()=>{if(ITelexCom.cv(1)) console.log(colors.FgRed+"Terminated connection with client "+colors.FgCyan+cnum+colors.FgWhite);});
					return;
				}*/
				//if(ITelexCom.cv(2)) console.log(connection);
				//if(ITelexCom.cv(1)) console.log(colors.FgGreen+"Connected client "+colors.FgCyan+cnum+colors.FgGreen+" to database"+colors.FgWhite);
				var queryresultpos = -1;
				var queryresult = [];
				var connectionpin;
				connection.on('end', function() {
					if(ITelexCom.cv(1)) console.log(colors.FgYellow+"client "+colors.FgCyan+cnum+colors.FgYellow+" disconnected"+colors.FgWhite);
					try{clearTimeout(ITelexCom.connections[cnum].timeout);}catch(e){}
					ITelexCom.connections.splice(cnum,1);
					//dbcon.end(()=>{
						//if(ITelexCom.cv(1)) console.log(colors.FgYellow+"Disconnected client "+colors.FgCyan+cnum+colors.FgYellow+" from database"+colors.FgWhite);
					//});
				});
				connection.on('error', function(err) {
					if(ITelexCom.cv(1)) console.log(colors.FgRed+"client "+colors.FgCyan+cnum+colors.FgRed+" had an error:\n",err,colors.FgWhite);
					try{clearTimeout(ITelexCom.connections[cnum].timeout);}catch(e){}
					ITelexCom.connections.splice(cnum,1);
					//dbcon.end(function(){
						//if(ITelexCom.cv(1)) console.log(colors.FgYellow+"Disconnected client "+colors.FgCyan+cnum+colors.FgYellow+" from database"+colors.FgWhite);
					//});
				});
				connection.on('data', function(data) {
					if(ITelexCom.cv(2)) console.log(colors.FgMagenta,data,colors.FgWhite);
					if(ITelexCom.cv(2)) console.log(colors.FgBlue,data.toString(),colors.FgWhite);
					try{clearTimeout(ITelexCom.connections[cnum].timeout);}catch(e){}
					ITelexCom.connections[cnum].timeout = setTimeout(ITelexCom.timeout,config.get("CONNECTIONTIMEOUT"),cnum);
					if(data[0] == 0x71&&/[0-9]/.test(String.fromCharCode(data[1]))/*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/){
						ITelexCom.ascii(data,connection,dbcon); //TODO: check for fragmentation
					}else{
						var res = ITelexCom.checkFullPackage(data, ITelexCom.connections.readbuffer);
						if(cv(2)) console.log(res);
						if(res[1].length > 0){
							ITelexCom.connections.readbuffer = res[1];
						}
						if(res[0].length > 0){
							if(cv(2)) console.log(res[0]);
							if(cv(2)) console.log(ITelexCom.decData(res[0]));
							ITelexCom.handlePacket(ITelexCom.decData(res[0]),cnum,dbcon,connection,handles); //BINARY
						}
					}
				});
			//});
		}catch(e){
			console.error(e);
		}
	});
	server.listen(config.get("BINARYPORT"), function(){
		if(ITelexCom.cv(9)) console.log('server is listening on port '+config.get("BINARYPORT"));
	});
}
function updateQueue(){
	// var dbcon = mysql.createConnection(mySqlConnectionOptions);
	/*dbcon.connect(function(err){
		if(err){
			if(ITelexCom.cv(0)) console.log(colors.FgRed+"Connection to database threw an error:\n",err,colors.FgWhite);
			return;
		}*/
		if(ITelexCom.cv(2)) console.log(colors.FgGreen+"Connected to database for server syncronisation!"+colors.FgWhite);
		ITelexCom.SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE changed = "+1, function(result1){
			ITelexCom.SqlQuery(dbcon,"UPDATE teilnehmer SET changed = 0;", function(result3){
				if(ITelexCom.cv(2)) console.log(colors.FgGreen+result3.changedRows+" rows were updated!"+colors.FgWhite);
			});
			if(result1.length > 0){
				if(ITelexCom.cv(2)) console.log(colors.FgCyan,result1);
				if(ITelexCom.cv(1)) console.log("rows to update: "+result1.length);
				ITelexCom.SqlQuery(dbcon,"SELECT * FROM servers", function(result2){
					async.each(result2,(server,cb1)=>{
						async.each(result1,(message,cb2)=>{
							ITelexCom.SqlQuery(dbcon,"DELETE * FROM queue WHERE server = "+server.uid+"AND WHERE message = "+message.uid,function(result3){
								ITelexCom.SqlQuery(dbcon,"INSERT INTO queue (server,message,timestamp) VALUES ("+server.uid+","+message.uid+","+Math.floor(new Date().getTime()/1000)+")",cb2);
							});
						},cb1);
					},function(){
						//dbcon.end(()=>{
							qwd.stdin.write("sendqueue");
							if(ITelexCom.cv(2)) console.log(colors.FgYellow+"Disconnected from server database!"+colors.FgWhite);
							setTimeout(updateQueue,config.get("UPDATEQUEUEINTERVAL"));
						//});
					});
				});
			}else{
				if(ITelexCom.cv(2)) console.log(colors.FgYellow+"no rows to update"+colors.FgWhite);
					//dbcon.end(()=>{
						if(ITelexCom.cv(2)) console.log(colors.FgYellow+"Disconnected from server database!"+colors.FgWhite);
					//});
				if(qwdec == null){
					qwdec = "unknown";
					qwd.stdin.write("sendqueue");
				}
				setTimeout(updateQueue,config.get("UPDATEQUEUEINTERVAL"));
			}
		});
	//});
} //TODO: call!
function getFullQuery(){
	// var dbcon = mysql.createConnection(mySqlConnectionOptions);
	//dbcon.connect(()=>{
		ITelexCom.SqlQuery(dbcon,"SELECT * FROM servers",function(res){
			for(i in res){
				if(res[i].addresse == config.get("FULL_QUERY_SERVER")){
					res = res[i];
				}
			}
			async.eachSeries(res,function(r,cb){
				ITelexCom.connect(dbcon,function(){},{port:r.port,host:r.addresse},handles,function(client,cnum){
					client.write(ITelexCom.encPacket({packagetype:6,datalength:5,data:{serverpin:config.get("SERVERPIN"),version:1}}),function(){
						ITelexCom.connections[cnum].state = ITelexCom.states.FULLQUERY;
						ITelexCom.connections[cnum].cb = cb;
					});
				});
			},function(){
				setTimeout(getFullQuery, config.get("FULLQUERYINTERVAL"));
			});
		});
	//});
}
var qwdec;	//queuewatchdog exit code
function startQWD(){
	qwd = cp.spawn('node',[path.join(PWD,"/BINARYSERVER/queuewatchdog.js")]);
	qwd.on('exit',(ec)=>{
		qwdec = ec;
		if(ITelexCom.cv(0)) console.error("qwd process exited with code "+ec);
		//throw "qwd process exited with code "+ec;
		startQWD();
	});
	qwd.stdout.on('data',(data)=>{
		if(config.get("QWD_STDOUT_LOG") == ""){
			if(ITelexCom.cv(0)) console.log(colors.FgBlue+'qwd stdout: '+colors.FgWhite+data);
		}else if(config.get("QWD_STDOUT_LOG") == "-"){
		}else{
			try{
				fs.appendFileSync(config.get("QWD_STDOUT_LOG"),data);
			}catch(e){
				if(ITelexCom.cv(0)) console.log(colors.FgBlue+'qwd stdout: '+colors.FgWhite+data);
			}
		}
	});
	qwd.stderr.on('data',(data)=>{
		if(config.get("QWD_STDERR_LOG") == ""){
			if(ITelexCom.cv(0)) console.log(colors.FgRed+'qwd stderr: '+colors.FgWhite+data);
		}else if(config.get("QWD_STDOUT_LOG") == "-"){
		}else{
			try{
				fs.appendFileSync(config.get("QWD_STDERR_LOG"),data);
			}catch(e){
				if(ITelexCom.cv(0)) console.log(colors.FgRed+'qwd stderr: '+colors.FgWhite+data);
			}
		}
	});
}

if(module.parent === null){
	if(ITelexCom.cv(0)) console.log(colors.FgMagenta+"Initialising!"+colors.FgWhite);
	init();
	startQWD();
	updateQueue();
	getFullQuery();
}else{
	module.exports = {
		init:init,
		startQWD:startQWD,
		updateQueue:updateQueue,
		getFullQuery:getFullQuery
	};
}
