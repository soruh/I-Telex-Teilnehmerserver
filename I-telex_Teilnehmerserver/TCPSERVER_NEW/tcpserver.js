const net = require('net');
const mysql = require('mysql');
const async = require('async');
const cp = require('child_process');
const fs = require('fs');
const ITelexCom = require("./ITelexCom.js");
const colors = require("./colors.js");
const config = require('./config.js');

const mySqlConnectionOptions = {
	host: config.SQL_host,
	user: config.SQL_user,
	password: config.SQL_password
};
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
handles[1][ITelexCom.states.STANDBY] = (obj,cnum,dbcon,connection,handles)=>{
	var number = obj.data.rufnummer;
	var pin = obj.data.pin;
	var port = obj.data.port;
	dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer = "+number,function(err_a,result_a){
		if(result_a&&(result_a.length>0)){
			var res = result_a[0];
			if(ITelexCom.cv(2)) console.log(res);
			if(res.pin == pin&&res.port == port/*???*/){
				dbcon.query("UPDATE telefonbuch.teilnehmer SET ipaddresse = '"+connection.remoteAddress.replace(/^.*:/,'')+"' WHERE rufnummer = "+number,function(err_b,result_b){
					dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer = "+number,function(err_c,result_c){
						try{
							connection.write(ITelexCom.encPacket({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary");
						}catch(e){
							if(ITelexCom.cv(0)) console.log(colors.FgRed,e,colors.FgWhite);
						}
					});
				});
			}else if(res.pin != pin){
				connection.end();
			}else if(res.pin == pin&&res.port != port){

			}
		}else{
			connection.end();
		}
	});
};
handles[3][ITelexCom.states.STANDBY] = (obj,cnum,dbcon,connection,handles)=>{
	if(obj.data.version  ==  1){
		var rufnummer = obj.data.rufnummer;
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer = "+rufnummer+";",function(err,result){
			if(ITelexCom.cv(2)) console.log(colors.FgYellow,"SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer = "+rufnummer+";",colors.FgWhite);
			if(ITelexCom.cv(2)) console.log(colors.FgCyan,result,colors.FgWhite);
			if(err){
				if(ITelexCom.cv(0)) console.log(colors.FgRed,err,colors.FgWhite);
			}else{
				if((result[0] != undefined)&&(result != [])){
					connection.write(ITelexCom.encPacket({packagetype:5,datalength:100,data:result[0]}));
				}else{
					connection.write(ITelexCom.encPacket({packagetype:4,datalength:0}));
				}
			}
		});
	}else{
		if(ITelexCom.cv(0)) console.log(colors.FgRed,"unsupported packet version, sending '0x04' packet",colors.FgWhite);
		connection.write(ITelexCom.encPacket({packagetype:4,datalength:0}));
	}
};
handles[5][ITelexCom.states.FULLQUERY] = (obj,cnum,dbcon,connection,handles)=>{
	if(ITelexCom.cv(2)) console.log(obj);
	dbcon.query("SELECT * from telefonbuch.teilnehmer WHERE rufnummer = "+mysql.escape(obj.data.rufnummer)+";",(err,res)=>{
		if(err){
			if(ITelexCom.cv(0)) console.log(err)
		}else{
			if(res.length  ==  1){
				if(obj.data.timestamp > res.moddate){
					if(ITelexCom.cv(0)) console.log(obj.data.timestamp+" > "+res.moddate);
					dbcon.query("UPDATE telefonbuch.teilnehmer SET rufnummer = "+mysql.escape(obj.data.rufnummer)+",name = "+mysql.escape(obj.data.name)+",typ = "+mysql.escape(obj.data.typ)+",hostname = "+mysql.escape(obj.data.addresse)+",ipaddresse = "+mysql.escape(obj.data.ipaddresse)+",port = "+mysql.escape(obj.data.port)+",extention = "+mysql.escape(obj.data.durchwahl)+",pin = "+mysql.escape(obj.data.pin)+",gesperrt = "+mysql.escape(obj.data.flags)+",moddate = "+mysql.escape(obj.data.timestamp)+",changed = "+mysql.escape(0)+"WHERE rufnummer = "+mysql.escape(obj.data.rufnummer)+";",(err,res2)=>{
						if(err){
							if(ITelexCom.cv(0)) console.log(err);
						}else{
							connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
						}
					});
				}else{
					connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
				}
			}else if(res.length  ==  0){
				dbcon.query("INSERT INTO telefonbuch.teilnehmer(rufnummer,name,typ,hostname,ipaddresse,port,extention,pin,gesperrt,moddate,changed)VALUES("+mysql.escape(obj.data.rufnummer)+","+mysql.escape(obj.data.name)+","+mysql.escape(obj.data.typ)+","+mysql.escape(obj.data.addresse)+","+mysql.escape(obj.data.ipaddresse)+","+mysql.escape(obj.data.port)+","+mysql.escape(obj.data.durchwahl)+","+mysql.escape(obj.data.pin)+","+mysql.escape(obj.data.flags)+","+mysql.escape(obj.data.timestamp)+","+mysql.escape(0)+");",(err,res2)=>{
					if(err){
						if(ITelexCom.cv(0)) console.log(err);
					}else{
						connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
					}
				});
			}else{
				if(ITelexCom.cv(0)) console.log('Something really strange happened, the "rufnummer" field should be unique!');
			}
		}
	});
};
handles[5][ITelexCom.states.LOGIN] = (obj,cnum,dbcon,connection,handles)=>{
	if(obj.data.data.version  ==  1){
		if(ITelexCom.cv(2)) console.log(obj);
		dbcon.query("SELECT * from telefonbuch.teilnehmer WHERE rufnummer = "+obj.data.data.rufnummer+";",(err,res)=>{
			if(err){
				if(ITelexCom.cv(0)) console.log(err)
			}else{
				if(res.length  ==  1){
					if(obj.data.data.timestamp > res.moddate){
						dbcon.query("UPDATE telefonbuch.teilnehmerSETrufnummer = "+obj.data.data.rufnummer+",name = "+obj.data.data.name+",typ = "+obj.data.data.typ+",hostname = "+obj.data.data.hostname+",ipaddresse = "+obj.data.data.ipaddresse+",port = "+obj.data.data.port+",extention = "+obj.data.data.extention+",pin = "+obj.data.data.pin+",gesperrt = "+obj.data.data.gesperrt+",moddate = "+obj.data.data.moddate+",changed = "+0+"WHERE rufnummer = "+obj.data.data.rufnummer+";",(err,res2)=>{
							if(err){
								if(ITelexCom.cv(0)) console.log(err);
							}else{
								connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
							}
						});
					}
				}else if(res.length  ==  0){
					dbcon.query("INSERT INTO telefonbuch.teilnehmer(rufnummer,name,typ,hostname,ipaddresse,port,extention,pin,gesperrt,moddate,changed)VALUES("+obj.data.data.rufnummer+","+obj.data.data.name+","+obj.data.data.typ+","+obj.data.data.hostname+","+obj.data.data.ipaddresse+","+obj.data.data.port+","+obj.data.data.extention+","+obj.data.data.pin+","+obj.data.data.gesperrt+","+obj.data.data.moddate+","+0+");",(err,res2)=>{
						if(err){
							if(ITelexCom.cv(0)) console.log(err);
						}else{
							connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
						}
					});
				}else{
					if(ITelexCom.cv(0)) console.log('Something really strange happened, the "rufnummer" field should be unique!');
				}
			}
		});
	}else{
		if(ITelexCom.cv(0)) console.log(colors.FgRed,"unsupported package version",colors.FgWhite);
	}
};
handles[6][ITelexCom.states.STANDBY] = (obj,cnum,dbcon,connection,handles)=>{
	if(obj.data.pin  ==  ITelexCom.SERVERPIN){
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer",function(err,result){
			if(err){
				if(ITelexCom.cv(0)) console.log(colors.FgRed,err,colors.FgWhite);
			}else{
				if((result[0] != undefined)&&(result != [])&&pin == ITelexCom.SERVERPIN){
					ITelexCom.connections[cnum].writebuffer = result;
					ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
					ITelexCom.handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection,handles);
				}else{
					connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
				}
			}
		});
	}
}; //TODO: send stuff?
handles[7][ITelexCom.states.STANDBY] = (obj,cnum,dbcon,connection,handles)=>{
	if(obj.data.pin  ==  ITelexCom.SERVERPIN){
		connection.write(ITelexCom.encPacket({packagetype:8,datalength:0}));
		ITelexCom.connections[cnum].state = ITelexCom.states.LOGIN;
		ITelexCom.handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection,handles);
	}else{
		connection.end();
	}
};
handles[8][ITelexCom.states.RESPONDING] = (obj,cnum,dbcon,connection,handles)=>{
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
handles[9][ITelexCom.states.FULLQUERY] = (obj,cnum,dbcon,connection,handles)=>{
	ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	ITelexCom.connections[cnum].cb();
};
handles[9][ITelexCom.states.LOGIN] = (obj,cnum,dbcon,connection,handles)=>{
	ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
};
handles[10][ITelexCom.states.STANDBY] = (obj,cnum,dbcon,connection,handles)=>{
	if(ITelexCom.cv(2)) console.log(obj);
	var version = obj.data.data.version;
	var query = obj.data.data.pattern;
	var searchstring = "SELECT * FROM telefonbuch.teilnehmer WHERE";
	queryarr = query.split(" ");
	for(i in queryarr){
		searchstring +=  " AND name LIKE '%"+queryarr[i]+"%'";
	}
	searchstring += ";"
	searchstring = searchstring.replace("WHERE AND","WHERE");
	if(ITelexCom.cv(2)) console.log(colors.FgGreen,searchstring,colors.FgWhite);
	dbcon.query(searchstring,function(err,result){
		if(err){
			if(ITelexCom.cv(0)) console.log(colors.FgRed,err,colors.FgWhite);
		}else{
			if((result[0] != undefined)&&(result != [])){
				ITelexCom.connections[cnum].writebuffer = result;
				if(ITelexCom.cv(2)) console.log(colors.FgBlue,ITelexCom.connections[cnum].writebuffer,colors.FgWhite);
				ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
				ITelexCom.handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection,handles);
			}else{
				connection.write(ITelexCom.encPacket({packagetype:9,datalength:0}));
			}
		}
	});
};
function init(){
	var server = net.createServer(function(connection) {
		var cnum = -1;
		for(i = 0;i<ITelexCom.connections.length;i++){
			if(ITelexCom.connections[i]  ==  null){
				cnum = i;
			}
		}
		if(cnum  ==  -1){
			cnum = ITelexCom.connections.length;
		}
		ITelexCom.connections[cnum] = {connection:connection,state:ITelexCom.states.STANDBY};
		var dbcon = mysql.createConnection(mySqlConnectionOptions);
		if(ITelexCom.cv(1)) console.log(colors.FgGreen+"client "+colors.FgCyan+cnum+colors.FgGreen+" connected with ipaddress: "+connection.remoteAddress.replace(/^.*:/,'')+colors.FgWhite);
		dbcon.connect(function(err){
			if(err){
				if(ITelexCom.cv(0)) console.log(colors.FgRed+"Connection of client "+colors.FgCyan+cnum+colors.FgRed+" to database threw an error:\n",err,colors.FgWhite);
				connection.end(()=>{if(ITelexCom.cv(1)) console.log(colors.FgRed+"Terminated connection with client "+colors.FgCyan+cnum+colors.FgWhite);});
				return;
			}
			//if(ITelexCom.cv(2)) console.log(connection);
			if(ITelexCom.cv(1)) console.log(colors.FgGreen+"Connected client "+colors.FgCyan+cnum+colors.FgGreen+" to database"+colors.FgWhite);
			var queryresultpos = -1;
			var queryresult = [];
			var connectionpin;
			connection.on('end', function() {
				if(ITelexCom.cv(1)) console.log(colors.FgYellow+"client "+colors.FgCyan+cnum+colors.FgYellow+" disconnected"+colors.FgWhite);
				ITelexCom.connections[cnum] = null;
				dbcon.end(()=>{
					if(ITelexCom.cv(1)) console.log(colors.FgYellow+"Disconnected client "+colors.FgCyan+cnum+colors.FgYellow+" from database"+colors.FgWhite);
				});
			});
			connection.on('error', function(err) {
				if(ITelexCom.cv(1)) console.log(colors.FgRed+"client "+colors.FgCyan+cnum+colors.FgRed+" had an error:\n",err,colors.FgWhite);
				ITelexCom.connections[cnum] = null;
				dbcon.end(()=>{
					if(ITelexCom.cv(1)) console.log(colors.FgYellow+"Disconnected client "+colors.FgCyan+cnum+colors.FgYellow+" from database"+colors.FgWhite);
				});
			});
			connection.on('data', function(data) {
				if(ITelexCom.cv(2)) console.log(colors.FgMagenta,data,colors.FgWhite);
				if(ITelexCom.cv(2)) console.log(colors.FgBlue,data.toString(),colors.FgWhite);
				if(data[0] == 0x71/*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/){
					ITelexCom.ascii(data,connection,dbcon);
				}else{
					ITelexCom.handlePacket(ITelexCom.decData(data),cnum,dbcon,connection,handles); //TCP
				}
			});
		});
	});
	server.listen(config.PORT, function() {
		if(ITelexCom.cv(9)) console.log('server is listening on port '+config.PORT);
	});
}
function updateQueue(){
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	dbcon.connect(function(err){
		if(err){
			if(ITelexCom.cv(0)) console.log(colors.FgRed+"Connection to database threw an error:\n",err,colors.FgWhite);
			return;
		}
		if(ITelexCom.cv(2)) console.log(colors.FgGreen+"Connected to database for server syncronisation!"+colors.FgWhite);
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE changed = "+1, function(err, result1){
			dbcon.query("UPDATE telefonbuch.teilnehmer SET changed = 0;", function(err, result3) {
				if(ITelexCom.cv(2)) console.log(colors.FgGreen+result3.changedRows+" rows were updated!"+colors.FgWhite);
			});
			if(result1.length > 0){
				if(ITelexCom.cv(2)) console.log(colors.FgCyan,result1);
				if(ITelexCom.cv(1)) console.log("rows to update: "+result1.length);
				dbcon.query("SELECT * FROM telefonbuch.servers", function (err, result2) {
					async.each(result2,(server,cb1)=>{
						async.each(result1,(message,cb2)=>{
							dbcon.query("DELETE * FROM telefonbuch.queue WHERE server = "+server.uid+"AND WHERE message = "+message.uid,(err, result3)=>{
								dbcon.query("INSERT INTO telefonbuch.queue (server,message,timestamp) VALUES ("+server.uid+","+message.uid+","+Math.round(new Date().getTime()/1000)+")",cb2);
							});
						},cb1);
					},()=>{
						dbcon.end(()=>{
							qwd.stdin.write("sendqueue");
							if(ITelexCom.cv(2)) console.log(colors.FgYellow+"Disconnected from server database!"+colors.FgWhite);
							setTimeout(updateQueue,config.UPDATEQUEUEINTERVAL);
						});
					});
				});
			}else{
				if(ITelexCom.cv(2)) console.log(colors.FgYellow+"no rows to update"+colors.FgWhite);
					dbcon.end(()=>{if(ITelexCom.cv(2)) console.log(colors.FgYellow+"Disconnected from server database!"+colors.FgWhite);
				});
				if(qwdec  ==  null){
					qwdec = "unknown";
					qwd.stdin.write("sendqueue");
				}
				setTimeout(updateQueue,config.UPDATEQUEUEINTERVAL);
			}
		});
	});
} //TODO: call!
function getFullQuery(){
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	dbcon.connect(()=>{
			dbcon.query("SELECT * FROM telefonbuch.servers",(err,res)=>{
				if(err){
					if(ITelexCom.cv(0)) console.log(err);
				}
				async.eachSeries(res,function(r,cb){
					ITelexCom.connect(dbcon,function(){},{port:r.port,host:r.addresse},handles,function(client,cnum){
						client.write(ITelexCom.encPacket({packagetype:6,datalength:5,data:{serverpin:ITelexCom.SERVERPIN,version:1}}),function(){
							ITelexCom.connections[cnum].state = ITelexCom.states.FULLQUERY;
							ITelexCom.connections[cnum].cb = cb;
						});
					});
				});
			});
	});
}
var qwdec;	//queuewatchdog exit code
function startQWD(){
	qwd = cp.spawn('node',["queuewatchdog.js"]);
	qwd.on('exit',(ec)=>{
		qwdec = ec;
		if(ITelexCom.cv(0)) console.log("qwd process exited with code "+ec);
		startQWD();
	});
	qwd.stdout.on('data',(data)=>{
		if(config.QWD_STDOUT_LOG  ==  ""){
			if(ITelexCom.cv(0)) console.log(colors.FgBlue+'qwd stdout: '+colors.FgWhite+data);
		}else if(config.QWD_STDOUT_LOG  ==  "-"){}else{
			try{
				fs.appendFileSync(config.QWD_STDOUT_LOG,data);
			}catch(e){
				if(ITelexCom.cv(0)) console.log(colors.FgBlue+'qwd stdout: '+colors.FgWhite+data);
			}
		}
	});
	qwd.stderr.on('data',(data)=>{
		if(config.QWD_STDERR_LOG  ==  ""){
			if(ITelexCom.cv(0)) console.log(colors.FgRed+'qwd stderr: '+colors.FgWhite+data);
		}else if(config.QWD_STDOUT_LOG  ==  "-"){}else{
			try{
				fs.appendFileSync(config.QWD_STDERR_LOG,data);
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
}
