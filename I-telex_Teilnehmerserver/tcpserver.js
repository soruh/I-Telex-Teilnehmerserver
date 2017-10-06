var Reset = "\x1b[0m";
var Bright = "\x1b[1m";
var Dim = "\x1b[2m";
var Underscore = "\x1b[4m";
var Blink = "\x1b[5m";
var Reverse = "\x1b[7m";
var Hidden = "\x1b[8m";
var FgBlack = "\x1b[30m";
var FgRed = "\x1b[31m";
var FgGreen = "\x1b[32m";
var FgYellow = "\x1b[33m";
var FgBlue = "\x1b[34m";
var FgMagenta = "\x1b[35m";
var FgCyan = "\x1b[36m";
var FgWhite = "\x1b[37m";
var BgBlack = "\x1b[40m";
var BgRed = "\x1b[41m";
var BgGreen = "\x1b[42m";
var BgYellow = "\x1b[43m";
var BgBlue = "\x1b[44m";
var BgMagenta = "\x1b[45m";
var BgCyan = "\x1b[46m";
var BgWhite = "\x1b[47m";

var functions=require("./functions.js");
eval(functions);


const mySqlConnectionOptions = {
	host: "localhost",
	user: "telefonbuch",
	password: "amesads"
};
const serverpin = 118120815;
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const cp = require('child_process');
const fs = require('fs');

const PORT = 11811;
const UPDATEQUEUEINTERVAL = 60000;
//<STATES>
const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;

// "" => log to console
// "-" => don't log
const qwd_stdout_log = "";
const qwd_stderr_log = "";
//const qwd_stdout_log = "./qwd_stdout_log";
//const qwd_stderr_log =."/qwd_stderr_log";

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
*/
var connections = [];
var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}
//handes[packagetype][state of this connection]
//handles[2][STANDBY] = (obj,cnum,dbcon,connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,dbcon,connection)=>{}; NOT USED
handles[1][STANDBY] = (obj,cnum,dbcon,connection)=>{
	console.log(obj.data);
	var number = obj.data.rufnummer;
	console.log(number);
	var pin = obj.data.pin;
	console.log(pin);
	var port = obj.data.port;
	console.log(port);
	dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+number,function(err_a,result_a){
		if(result_a&&(result_a!=[])){
			var res = result_a[0];
			console.log(res);
			if(res.pin==pin&&res.port==port/*???*/){
				dbcon.query("UPDATE telefonbuch.teilnehmer SET ipaddresse='"+connection.remoteAddress+"' WHERE rufnummer="+number,function(err_b,result_b){
					dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+number,function(err_c,result_c){
						try{
							connection.write(encPacket({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary");
						}catch(e){
							console.log(FgRed,e,FgWhite);
						}
					});
				});
			}else if(res.pin!=pin){
				connection.end();
			}else if(res.pin==pin&&res.port!=port){

			}
		}
	});
};
handles[3][STANDBY] = (obj,cnum,dbcon,connection)=>{
	if(obj.data.version == 1){
		var rufnummer = obj.data.rufnummer;
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+rufnummer+";",function(err,result){
			console.log(FgYellow,"SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+rufnummer+";",FgWhite);
			console.log(FgCyan,result,FgWhite);
			if(err){
				console.log(FgRed,err,FgWhite);
			}else{
				if((result[0]!=undefined)&&(result!=[])){
					connection.write(encPacket({packagetype:5,datalength:100,data:result[0]}));
				}else{
					connection.write(encPacket({packagetype:4,datalength:0}));
				}
			}
		});
	}else{
		console.log(FgRed,"unsupported packet version, sending '4' packet",FgWhite);
		connection.write(encPacket({packagetype:4,datalength:0}));
	}
};
handles[5][FULLQUERY] = (obj,cnum,dbcon,connection)=>{
	console.log(obj);
	dbcon.query("SELECT * from telefonbuch.teilnehmer WHERE rufnummer="+mysql.escape(obj.data.rufnummer)+";",(err,res)=>{
		if(err){
			throw err
		}else{
			if(res.length == 1){
				if(obj.data.timestamp > res.moddate){
					console.log(obj.data.timestamp+" > "+res.moddate);
					dbcon.query("UPDATE telefonbuch.teilnehmer SET rufnummer = "+mysql.escape(obj.data.rufnummer)+",name = "+mysql.escape(obj.data.name)+",typ = "+mysql.escape(obj.data.typ)+",hostname = "+mysql.escape(obj.data.addresse)+",ipadresse = "+mysql.escape(obj.data.ipaddresse)+",port = "+mysql.escape(obj.data.port)+",extention = "+mysql.escape(obj.data.durchwahl)+",pin = "+mysql.escape(obj.data.pin)+",gesperrt = "+mysql.escape(obj.data.flags)+",moddate = "+mysql.escape(obj.data.timestamp)+",changed = "+mysql.escape(0)+"WHERE rufnummer="+mysql.escape(obj.data.rufnummer)+";",(err,res2)=>{
						if(err){
							throw err;
						}else{
							connection.write(encPacket({packagetype:8,datalength:0}));
						}
					});
				}else{
					connection.write(encPacket({packagetype:8,datalength:0}));
				}
			}else if(res.length == 0){
				dbcon.query("INSERT INTO telefonbuch.teilnehmer(rufnummer,name,typ,hostname,ipadresse,port,extention,pin,gesperrt,moddate,changed)VALUES("+mysql.escape(obj.data.rufnummer)+","+mysql.escape(obj.data.name)+","+mysql.escape(obj.data.typ)+","+mysql.escape(obj.data.addresse)+","+mysql.escape(obj.data.ipaddresse)+","+mysql.escape(obj.data.port)+","+mysql.escape(obj.data.durchwahl)+","+mysql.escape(obj.data.pin)+","+mysql.escape(obj.data.flags)+","+mysql.escape(obj.data.timestamp)+","+mysql.escape(0)+");",(err,res2)=>{
					if(err){
						throw err;
					}else{
						connection.write(encPacket({packagetype:8,datalength:0}));
					}
				});
			}else{
				throw 'Something really strange happened, the "rufnummer" field should be unique!';
			}
		}
	});
};
handles[5][LOGIN] = (obj,cnum,dbcon,connection)=>{
	if(obj.data.data.version == 1){
		console.log(obj);
		dbcon.query("SELECT * from telefonbuch.teilnehmer WHERE rufnummer="+obj.data.data.rufnummer+";",(err,res)=>{
			if(err){
				throw err
			}else{
				if(res.length == 1){
					if(obj.data.data.timestamp > res.moddate){
						dbcon.query("UPDATE telefonbuch.teilnehmerSETrufnummer = "+obj.data.data.rufnummer+",name = "+obj.data.data.name+",typ = "+obj.data.data.typ+",hostname = "+obj.data.data.hostname+",ipadresse = "+obj.data.data.ipadresse+",port = "+obj.data.data.port+",extention = "+obj.data.data.extention+",pin = "+obj.data.data.pin+",gesperrt = "+obj.data.data.gesperrt+",moddate = "+obj.data.data.moddate+",changed = "+0+"WHERE rufnummer="+obj.data.data.rufnummer+";",(err,res2)=>{
							if(err){
								throw err;
							}else{
								connection.write(encPacket({packagetype:8,datalength:0}));
							}
						});
					}
				}else if(res.length == 0){
					dbcon.query("INSERT INTO telefonbuch.teilnehmer(rufnummer,name,typ,hostname,ipadresse,port,extention,pin,gesperrt,moddate,changed)VALUES("+obj.data.data.rufnummer+","+obj.data.data.name+","+obj.data.data.typ+","+obj.data.data.hostname+","+obj.data.data.ipadresse+","+obj.data.data.port+","+obj.data.data.extention+","+obj.data.data.pin+","+obj.data.data.gesperrt+","+obj.data.data.moddate+","+0+");",(err,res2)=>{
						if(err){
							throw err;
						}else{
							connection.write(encPacket({packagetype:8,datalength:0}));
						}
					});
				}else{
					throw 'Something really strange happened, the "rufnummer" field should be unique!';
				}
			}
		});
	}else{
		console.log(FgRed,"unsupported package version",FgWhite);
	}
};
handles[6][STANDBY] = (obj,cnum,dbcon,connection)=>{
	if(obj.data.pin == serverpin){
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer",function(err,result){
			if(err){
				console.log(FgRed,err,FgWhite);
			}else{
				if((result[0]!=undefined)&&(result!=[])&&pin==serverpin){
					connections[cnum].writebuffer = result;
					connections[cnum].state = RESPONDING;
					handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection);
				}else{
					connection.write(encPacket({packagetype:9,datalength:0}));
				}
			}
		});
	}
}; //TODO: send stuff?
handles[7][STANDBY] = (obj,cnum,dbcon,connection)=>{
	if(obj.data.pin == serverpin){
		connection.write(encPacket({packagetype:8,datalength:0}));
		connections[cnum].state = LOGIN;
		handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection);
	}else{
		connection.end();
	}
};
handles[8][RESPONDING] = (obj,cnum,dbcon,connection)=>{
	if(connections[cnum].writebuffer.length > 0){
		connection.write(encPacket({packagetype:5,datalength:100,data:connections[cnum].writebuffer[0]}),()=>{
			connections[cnum].writebuffer = connections[cnum].writebuffer.splice(1);
		});
	}else if(connections[cnum].writebuffer.length <= 0){
		connection.write(encPacket({packagetype:9,datalength:0}));
		connections[cnum].writebuffer = [];
		connections[cnum].state = STANDBY;
	}
};
handles[9][FULLQUERY] = (obj,cnum,dbcon,connection)=>{
	connections[cnum].state = STANDBY;
	connections[cnum].cb();
};
handles[9][LOGIN] = (obj,cnum,dbcon,connection)=>{
	connections[cnum].state = STANDBY;
};
handles[10][STANDBY] = (obj,cnum,dbcon,connection)=>{
	console.log(obj);
	var version = obj.data.data.version;
	var query = obj.data.data.pattern;
	var searchstring = "SELECT * FROM telefonbuch.teilnehmer WHERE";
	queryarr = query.split(" ");
	for(i in queryarr){
		searchstring += " AND name LIKE '%"+queryarr[i]+"%'";
	}
	searchstring +=";"
	searchstring = searchstring.replace("WHERE AND","WHERE");
	console.log(FgGreen,searchstring,FgWhite);
	dbcon.query(searchstring,function(err,result){
		if(err){
			console.log(FgRed,err,FgWhite);
		}else{
			if((result[0]!=undefined)&&(result!=[])){
				connections[cnum].writebuffer = result;
				console.log(FgBlue,connections[cnum].writebuffer,FgWhite);
				connections[cnum].state = RESPONDING;
				handlePacket({packagetype:8,datalength:0,data:{}},cnum,dbcon,connection);
			}else{
				connection.write(encPacket({packagetype:9,datalength:0}));
			}
		}
	});
};
function init(){
	var server = net.createServer(function(connection) {
		var cnum = -1;
		for(i=0;i<connections.length;i++){
			if(connections[i] == null){
				cnum = i;
			}
		}
		if(cnum == -1){
			cnum = connections.length;
		}
		connections[cnum] = {connection:connection,state:STANDBY};
		var dbcon = mysql.createConnection(mySqlConnectionOptions);
		console.log(FgGreen+"client "+FgCyan+cnum+FgGreen+" connected"+FgWhite);
		dbcon.connect(function(err){
			if(err){
				console.log(FgRed+"Connection of client "+FgCyan+cnum+FgRed+" to database threw an error:\n",err,FgWhite);
				connection.end(()=>{console.log(FgRed+"Terminated connection with client "+FgCyan+cnum+FgWhite);});
				return;
			}
			//console.log(connection);
			console.log(FgGreen+"Connected client "+FgCyan+cnum+FgGreen+" to database"+FgWhite);
			var queryresultpos = -1;
			var queryresult = [];
			var connectionpin;
			connection.on('end', function() {
				console.log(FgYellow+"client "+FgCyan+cnum+FgYellow+" disconnected"+FgWhite);
				connections[cnum] = null;
				dbcon.end(()=>{
					console.log(FgYellow+"Disconnected client "+FgCyan+cnum+FgYellow+" from database"+FgWhite);
				});
			});
			connection.on('error', function(err) {
				console.log(FgRed+"client "+FgCyan+cnum+FgRed+" had an error:\n",err,FgWhite);
				connections[cnum] = null;
				dbcon.end(()=>{
					console.log(FgYellow+"Disconnected client "+FgCyan+cnum+FgYellow+" from database"+FgWhite);
				});
			});
			connection.on('data', function(data) {
				console.log(FgMagenta,data,FgWhite);
				console.log(FgBlue,data.toString(),FgWhite);
				if(data[0]==0x71&&/*true||*/(data[data.length-2]==0x0D&&data[data.length-1]==0x0A)){
					//<ascii>
					var number = "";
					for(i=0;i<data.length;i++){
						//console.log(String.fromCharCode(data[i]));
						if(/([0-9])/.test(String.fromCharCode(data[i]))){
							number += String.fromCharCode(data[i]);
						}
					}
					if(number != ""){
						number = parseInt(number);
					}
					if(number != NaN && number != ""){
						console.log(FgGreen+"starting lookup for: "+FgCyan+number+FgWhite);
						dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+number, function (err, result){
							if(err){
								throw err;
							}else{
								if(result.length == 0){
									var send = "\n\rfail\n\r";
									send += number+"\n\r";
									send += "unknown\n\r";
									send += "+++\n\r";
									connection.write(send,(b)=>{
										if(b){
											console.log(FgRed+"Entry not found\n=> sent:"+FgWhite+send);
										}
									});
								}else{
									var send = "\n\rok\n\r";
									send += result[0]["rufnummer"]+"\n\r";
									send += result[0]["name"]+"\n\r";
									send += result[0]["typ"]+"\n\r";
									send += result[0]["hostname"]+"\n\r";
									send += result[0]["port"]+"\n\r";
									send += result[0]["extention"]+"\n\r";
									send += "+++\n\r";
									connection.write(send,(b)=>{
										if(b){
											console.log(FgGreen+"Entry found\n=> sent:"+FgWhite+send);
										}
									});
								}
							}
						});
					}
					//</ascii>
				}else{
					handlePacket(decData(data),cnum,dbcon,connection); //TCP
				}
			});
		//console.log(FgYellow+"Disconnected client "+FgCyan+cnum+FgYellow+" from database!"+FgWhite);
		});
	});
	server.listen(PORT, function() {
		console.log('server is listening on port '+PORT);
	});
}
function updateQueue(){
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	dbcon.connect(function(err){
		if(err){
			throw(FgRed+"Connection to database threw an error:\n",err,FgWhite);
			return;
		}
		console.log(FgGreen+"Connected to database for server syncronisation!"+FgWhite);
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE changed="+1, function(err, result1){
			dbcon.query("UPDATE telefonbuch.teilnehmer SET changed=0;", function(err, result3) {
				console.log(FgGreen+result3.changedRows+" rows were updated!"+FgWhite);
			});
			if(result1.length > 0){
				console.log(FgCyan,result1);
				console.log("rows to update: "+result1.length);
				dbcon.query("SELECT * FROM telefonbuch.servers", function (err, result2) {
					async.each(result2,(server,cb1)=>{
						async.each(result1,(message,cb2)=>{
							dbcon.query("DELETE * FROM telefonbuch.queue WHERE server="+server.uid+"AND WHERE message="+message.uid,(err, result3)=>{
								dbcon.query("INSERT INTO telefonbuch.queue (server,message,timestamp) VALUES ("+server.uid+","+message.uid+","+Math.round(new Date().getTime()/1000)+")",cb2);
							});
						},cb1);
					},()=>{
						dbcon.end(()=>{
							qwd.stdin.write("sendqueue");
							console.log(FgYellow+"Disconnected from server database!"+FgWhite);
							setTimeout(updateQueue,UPDATEQUEUEINTERVAL);
						});
					});
				});
			}else{
				console.log(FgYellow+"no rows to update"+FgWhite);
					dbcon.end(()=>{console.log(FgYellow+"Disconnected from server database!"+FgWhite);
				});
				if(qwdec == null){
					qwdec = "unknown";
					qwd.stdin.write("sendqueue");
				}
				setTimeout(updateQueue,UPDATEQUEUEINTERVAL);
			}
		});
	});
} //TODO: call!
function getFullQuery(){
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	dbcon.connect(()=>{
			dbcon.query("SELECT * FROM telefonbuch.servers",(err,res)=>{
				if(err){
					throw err;
				}
				async.eachSeries(res,(r,cb)=>{
					connect(dbcon,()=>{},{port:r.port,host:r.addresse},(client,cnum)=>{
						client.write(encPacket({packagetype:6,datalength:5,data:{serverpin:serverpin,version:1}}),()=>{
							connections[cnum].state = FULLQUERY;
							connections[cnum].cb=cb;
						});
					});
				});
			});
	});
}
var qwdec;
function startQWD(){
	qwd=cp.spawn('node',["queuewatchdog.js"]);
	qwd.on('exit',(ec)=>{
		qwdec = ec;
		console.log("qwd process exited with code "+ec);
		startQWD();
	});
	qwd.stdout.on('data',(data)=>{
		if(qwd_stdout_log == ""){
			console.log(FgBlue+'qwd stdout: '+FgWhite+data);
		}else if(qwd_stdout_log == "-"){}else{
			try{
				fs.appendFileSync(qwd_stdout_log,data);
			}catch(e){
				console.log(FgBlue+'qwd stdout: '+FgWhite+data);
			}
		}
	});
	qwd.stderr.on('data',(data)=>{
		if(qwd_stderr_log == ""){
			console.log(FgRed+'qwd stderr: '+FgWhite+data);
		}else if(qwd_stdout_log == "-"){}else{
			try{
				fs.appendFileSync(qwd_stderr_log,data);
			}catch(e){
				console.log(FgRed+'qwd stderr: '+FgWhite+data);
			}
		}
	});
}

if(module.parent === null){
	console.log(FgMagenta+"Initialising!"+FgWhite);
	init();
	//startQWD();
	//updateQueue();
	//getFullQuery();
}
