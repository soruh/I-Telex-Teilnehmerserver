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

const serverpin = 3451414;
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const cp = require('child_process');
const fs = require('fs');

const PORT = 11811;
const QUEUEUPDTATEINTERVAL = 10000;
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
	//console.log(obj);
	var number = obj.data.rufnummer;
	var pin = obj.data.pin;
	var port = obj.data.port;
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
	if(obj.version == 1){
		console.log(obj);
		dbcon.query("SELECT * from telefonbuch.teilnehmer WHERE rufnummer="+obj.rufnummer+";",(err,res)=>{
			if(err){
				throw err
			}else{
				if(res.length == 1){
					if(obj.timestamp > res.moddate){
						dbcon.query("UPDATE telefonbuch.teilnehmer SET rufnummer = "+obj.rufnummer+",name = "+obj.name+",typ = "+obj.typ+",hostname = "+obj.hostname+",ipadresse = "+obj.ipadresse+",port = "+obj.port+",extention = "+obj.extention+",pin = "+obj.pin+",gesperrt = "+obj.gesperrt+",moddate = "+obj.moddate+",changed = "+0+"WHERE rufnummer="+obj.rufnummer+";",(err,res2)=>{
							if(err){
								throw err;
							}else{
								connection.write(encPacket({packagetype:8,datalength:0}));
							}
						});
					}
				}else if(res.length == 0){
					dbcon.query("INSERT INTO telefonbuch.teilnehmer(rufnummer,name,typ,hostname,ipadresse,port,extention,pin,gesperrt,moddate,changed)VALUES("+obj.rufnummer+","+obj.name+","+obj.typ+","+obj.hostname+","+obj.ipadresse+","+obj.port+","+obj.extention+","+obj.pin+","+obj.gesperrt+","+obj.moddate+","+0+");",(err,res2)=>{
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
handles[5][LOGIN] = (obj,cnum,dbcon,connection)=>{
	if(obj.version == 1){
		console.log(obj);
		dbcon.query("SELECT * from telefonbuch.teilnehmer WHERE rufnummer="+obj.rufnummer+";",(err,res)=>{
			if(err){
				throw err
			}else{
				if(res.length == 1){
					if(obj.timestamp > res.moddate){
						dbcon.query("UPDATE telefonbuch.teilnehmerSETrufnummer = "+obj.rufnummer+",name = "+obj.name+",typ = "+obj.typ+",hostname = "+obj.hostname+",ipadresse = "+obj.ipadresse+",port = "+obj.port+",extention = "+obj.extention+",pin = "+obj.pin+",gesperrt = "+obj.gesperrt+",moddate = "+obj.moddate+",changed = "+0+"WHERE rufnummer="+obj.rufnummer+";",(err,res2)=>{
							if(err){
								throw err;
							}else{
								connection.write(encPacket({packagetype:8,datalength:0}));
							}
						});
					}
				}else if(res.length == 0){
					dbcon.query("INSERT INTO telefonbuch.teilnehmer(rufnummer,name,typ,hostname,ipadresse,port,extention,pin,gesperrt,moddate,changed)VALUES("+obj.rufnummer+","+obj.name+","+obj.typ+","+obj.hostname+","+obj.ipadresse+","+obj.port+","+obj.extention+","+obj.pin+","+obj.gesperrt+","+obj.moddate+","+0+");",(err,res2)=>{
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
	if(obj.pin == serverpin){
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
	if(obj.pin == serverpin){
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
};
handles[9][LOGIN] = (obj,cnum,dbcon,connection)=>{
	connections[cnum].state = STANDBY;
};
handles[10][STANDBY] = (obj,cnum,dbcon,connection)=>{
	console.log(obj);
	var version = obj.data.version;
	var query = obj.data.pattern;
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
function handlePacket(obj,cnum,dbcon,connection){
	console.log(FgMagenta+"state: "+FgCyan+connections[cnum]["state"]+FgWhite);
	console.log(BgYellow,FgRed,obj,FgWhite,BgBlack);
	try{
		if(handles[obj.packagetype][connections[cnum]["state"]]){
			handles[obj.packagetype][connections[cnum]["state"]](obj,cnum,dbcon,connection);
		}else{
			console.log(FgRed+"packagetype ["+FgCyan+obj.packagetype+FgRed+" ] not supported in state ["+FgCyan+connections[cnum]["state"]+FgRed+"]"+FgWhite);
		}
	}catch(e){
		throw e;
	}
}
function encPacket(obj) {
	console.log(BgYellow,FgBlue,obj,FgWhite,BgBlack);
	var data = obj.data;
	switch(obj.packagetype){
		case 1:
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.pin,2))
			.concat(deConcatValue(data.port,2));
			break;
		case 2:
			var array = deConcatValue(data.ipaddresse,4);
			break;
		case 3:
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.version,1));
			break;
		case 4:
		var array = [];
			break;
		case 5:
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.name,40))
			.concat(deConcatValue(data.flags,2))
			.concat(deConcatValue(data.typ,1))
			.concat(deConcatValue(data.addresse,40))
			.concat(deConcatValue(data.ipaddresse,4))
			.concat(deConcatValue(data.port,2))
			.concat(deConcatValue(data.durchwahl,1))
			.concat(deConcatValue(data.pin,2))
			.concat(deConcatValue(data.timestamp,4));
			break;
		case 6:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(data.serverpin,4));
			break;
		case 7:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(data.serverpin,4));
			break;
		case 8:
			var array = [];
			break;
		case 9:
			var array = [];
			break;
		case 10:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(data.pattern,40));
			break;
	}
	var header = [obj.packagetype,array.length];
	if(array.length > obj.datalength){
		throw "Buffer bigger than expected:\n"+
		array.length+" > "+obj.datalength;
	}
	console.log(FgRed,Buffer.from(header.concat(array)),FgWhite);
	return(Buffer.from(header.concat(array)));
}
function decPacket(packagetype,buffer){
	switch(packagetype){
		case 1:
			var data = {
				rufnummer:ConcatByteArray(buffer.slice(0,4),"number"),
				pin:ConcatByteArray(buffer.slice(4,6),"number"),
				port:ConcatByteArray(buffer.slice(6,8),"number")
			};
			return(data);
			break;
		case 2:
			var data = {
				ipaddresse:ConcatByteArray(buffer.slice(0,4),"string")
			};
			return(data);
			break;
		//The 2(0x02) packet is not supposed to be sent to the server
		case 3:
			var data = {
 				rufnummer:ConcatByteArray(buffer.slice(0,4),"number")
 			};
			if(buffer.slice(4,5).length > 0){
				data["version"] = ConcatByteArray(buffer.slice(4,5),"number");
			}else{
				data["version"] = 1;
			}
 			return(data);
			break;
		case 4:
			var data = {};
			return(data);
			break;
		case 5:
			var data = {
				rufnummer:ConcatByteArray(buffer.slice(0,4),"number"),
				name:ConcatByteArray(buffer.slice(4,44),"string"),
				flags:ConcatByteArray(buffer.slice(44,46),"number"),
				typ:ConcatByteArray(buffer.slice(46,47),"number"),
				addresse:ConcatByteArray(buffer.slice(47,87),"string"),
				ipaddresse:ConcatByteArray(buffer.slice(87,91),"string"),
				port:ConcatByteArray(buffer.slice(91,93),"number"),
				durchwahl:ConcatByteArray(buffer.slice(93,94),"number"),
				pin:ConcatByteArray(buffer.slice(94,96),"number"),
				timestamp:ConcatByteArray(buffer.slice(96,100),"number")
			};
			return(data);
			break;
		case 6:
			var data = {
				version:ConcatByteArray(buffer.slice(0,1),"number"),
				serverpin:ConcatByteArray(buffer.slice(1,5),"number")
			};
			return(data);
			break;
		case 7:
			var data = {
				version:ConcatByteArray(buffer.slice(0,1),"number"),
				serverpin:ConcatByteArray(buffer.slice(1,5),"number")
			};
			return(data);
			break;
		case 8:
			var data = {};
			return(data);
			break;
		case 9:
			var data = {};
			return(data);
			break;
		case 10:
			var data = {
				version:ConcatByteArray(buffer.slice(0,1),"number"),
				pattern:ConcatByteArray(buffer.slice(1,41),"string")
			};
			return(data);
			break;
	}
}
function decData(buffer){
	var typepos = 0;
	var outarr = [];
	while(typepos<buffer.length-1){
		var packagetype = parseInt(buffer[typepos],10);
		var datalength = parseInt(buffer[typepos+1],10);
		var blockdata = [];
		for(i=0;i<datalength;i++){
			blockdata[i] = buffer[typepos+2+i];
		}
		var data=decPacket(packagetype,blockdata);
		outarr[outarr.length] = {
			packagetype:packagetype,
			datalength,datalength,
			data:data
		};
		typepos += datalength+2;
	}
	return(outarr/**/[0]/**/);//array of objects => only returning first
}
function ConcatByteArray(arr,type){
	if(type==="number"){
		var num = 0;
		for (i=arr.length-1;i>=0;i--){
			num*=256;
			num += arr[i];
		}
		return(num)
	}else if(type==="string"){
		var str = "";
		for (i=0;i<arr.length;i++){
			str += String.fromCharCode(arr[i]);
		}
		return(str.replace(/(\u0000)/g,""));
	}
}
function deConcatValue(value,size){
	var array = [];
	if(typeof value === "string"){
		for(i=0;i<value.length;i++){
			array[i] = value.charCodeAt(i);
		}
	}else if(typeof value === "number"){
		while(value>0){
			array[array.length] = value%256;
			value = Math.floor(value/256);
		}
	}
	if(array.length>size){
		throw	"Value turned into a bigger than expecte Bytearray!";
	}
	while(array.length<size){
		array[array.length] = 0;
	}
	return(array);
}
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
		var dbcon = mysql.createConnection({
			host: "localhost",
			user: "telefonbuch",
			password: "amesads"
		});
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
		console.log('server is listening');
	});
}
function UpdateQueue(){
	var dbcon = mysql.createConnection({
		host: "localhost",
		user: "telefonbuch",
		password: "amesads"
	});
	dbcon.connect(function(err){
		if(err){
			console.log(FgRed+"Connection to database threw an error:\n",err,FgWhite);
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
			}
		});
	});
} //TODO: call!
var qwdec;
function StartQWD(){
	qwd=cp.spawn('node',["queuewatchdog.js"]);
	qwd.on('exit',(ec)=>{
		qwdec = ec;
		console.log("qwd process exited with code "+ec);
		StartQWD();
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
	StartQWD();
	UpdateQueue();
	var UpdateQueueInt = setInterval(UpdateQueue,QUEUEUPDTATEINTERVAL);
}
//<ALT>
/*
function StringToHex(str){
	var arr = [];
	for(i in str.split("")){
		arr[i] = str.charCodeAt(i);
	}
	return(arr);
}
function hexify(num){
	var arr = num.toString(16).split("");
	var str = "";
	for (i=arr.length-1;i>=0;i--){
		str += arr[i].toString(16);
	}
	return(str);
}
function nulsarr(num){
	var arr = [];
	for(i=0;i<num;i++){
		arr[i] = 0x00;
	}
	return(arr);
}
function hextostring(data){
	var str = "";
	for (i in data){
		//if(data[i].toString(16) != "0" || true){
		str += String.fromCharCode(data[i]);
		//}
	}
	return(str);
}
*/
//</ALT>
/*
console.log(data+" | "+typeof data);
console.log("length: "+length);
var outarr = [];
if(data == undefined){
outarr = nulsarr(length);
}else{
if(typeof data == "string"){
outarr = StringToHex(data);
outarr = outarr.concat(nulsarr(length-StringToHex(data).length));
}else{
hexstring = data.toString(16);
console.log("hexstring: "+hexstring);
for(i=hexstring.length-1;i>=0;i-=2){
if(hexstring[i-1]){
outarr[outarr.length] = parseInt(hexstring[i-1]+hexstring[i],16);
}else{
outarr[outarr.length] = parseInt("0"+hexstring[i],16);
}
}
outarr = outarr.concat(nulsarr(length-hexstring.length));
}
}
console.log(outarr);
console.log("\n");
return(outarr);
}
*/
/*
function OLD(){
	switch(obj.packagetype){
		case 1:
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+number,function(err_a,result_a){
			if(result_a&&(result_a!=[])){
				var res = result_a[0];
				console.log(res);
				if(res.pin==pin&&res.port==port){
					dbcon.query("UPDATE telefonbuch.teilnehmer SET ipaddresse='"+connection.remoteAddress+"' WHERE rufnummer="+number,function(err_b,result_b){
						dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+number,function(err_c,result_c){
							console.log(Buffer.from(result_c[0].ipaddresse));
							connection.write(Buffer.from([0x02,0x04].concat(StringToHex(result_c[0].ipaddresse))),"binary");
						});
					});
				}else if(res.pin!=pin){
					connection.end();
				}else if(res.pin==pin&&res.port!=port){

				}
			}
		});
		break;
	case 3:
		var rufnummer = ConcatByteArray(blockdata.slice(0,4));
		var version = ConcatByteArray(blockdata.slice(4,5));
		console.log("rufnummer: "+rufnummer);
		console.log("version: "+version);
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+rufnummer+";",function(err,result){
			console.log("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+rufnummer+";");
			console.log(result);
			if(err){
				console.log(err);
			}else{
				if((result[0]!=undefined)&&(result!=[])){
					5(result[0],connection);
				}else{
					^^.from([0x04,0x00]),"binary");
				}
			}
		});
		break;
	case 8:
		if(queryresult != [] && queryresultpos != -1){
			switch(state){
				case "standby":
					5(queryresult[queryresultpos],connection);
					break;
				case "FullQuery":
					5(queryresult[queryresultpos],connection,serverpin);
					break;
				case "Login":
					5(queryresult[queryresultpos],connection,serverpin);
					break;
				default:
					5(queryresult[queryresultpos],connection);
			}//state = "standby";
			if(queryresultpos<queryresult.length-1){
				queryresultpos++;
			}else{
				queryresult = []
				queryresultpos = -1;
				state = "standby";
				connection.write(Buffer.from([0x09,0x00]));
			}
		}
		break;
	case 10:
		var version = ConcatByteArray(blockdata.slice(0,1));
		var query = hextostring(blockdata.slice(1,41));
		console.log("version: "+version);
		console.log("query: "+query);
		var searchstring = "SELECT * FROM telefonbuch.teilnehmer WHERE name LIKE '%%'";
		queryarr = query.split(" ");
		for(i in queryarr){
			queryarr[i] = queryarr[i].replace(new RegExp(String.fromCharCode(0x00),"g"),"");
			searchstring += " AND name LIKE '%"+queryarr[i]+"%'";
		}
		searchstring +=";"
		console.log(searchstring);
		dbcon.query(searchstring,function(err,result){
			if(err){
				console.log(err);
			}else{
				console.log(result);
				if((result[0]!=undefined)&&(result!=[])){
					queryresultpos = 0;
					queryresult = result;
					console.log(queryresult);
					5(queryresult[queryresultpos],connection);
					queryresultpos++;
				}else{
					connection.write(Buffer.from([0x09,0x00]));
				}
			}
		});
		break;
	//server communication
	case 6:
			var pin = ConcatByteArray(blockdata.slice(1,5));
			console.log("pin: "+pin);
			if(pin == serverpin){
				connectionpin = pin;
			dbcon.query("SELECT * FROM telefonbuch.teilnehmer",function(err,result){
				if(err){
					console.log(err);
				}else{
					if((result[0]!=undefined)&&(result!=[])){
						queryresultpos = 0;
						queryresult = result;
						state = "FullQuery";
						console.log(queryresult);
						5(queryresult[queryresultpos],connection,pin);
						queryresultpos++;
					}else{
						connection.write(Buffer.from([0x09,0x00]));
					}
				}
			});
		}
		break;
	case 7:
		var pin = ConcatByteArray(blockdata.slice(1,5));
		console.log("pin: "+pin);
		if(pin == serverpin){
			connection.write(Buffer.from([0x08,0x00]));
			state = "Login";
		}
		break;
	case 5:
		var pin = ConcatByteArray(blockdata.slice(94,96));
		if(pin == serverpin){
			switch(state){
				default://////////////////////////////////////////TODO
					console.log(blockdata);
					var rufnummer = ConcatByteArray(blockdata.slice(0,4));
					var name = ConcatByteArray(blockdata.slice(4,44));
					var typ = ConcatByteArray(blockdata.slice(46,47));
					var hostname = ConcatByteArray(blockdata.slice(47,87));
					var ipaddresse = ConcatByteArray(blockdata.slice(87,91));
					var port = ConcatByteArray(blockdata.slice(91,93));
					var extention = ConcatByteArray(blockdata.slice(93,94));
					var gesperrt = 0;//TODO 46,44
					var moddate = ConcatByteArray(blockdata.slice(96,100));
					dbcon.query("UPDATE telefonbuch.teilnehmer SET rufnummer= "+rufnummer+",name='"+name+"',typ="+typ+",hostname='"+hostname+"',ipaddresse='"+ipaddresse+"',port='"+port+"',extention='"+extention+"',gesperrt="+gesperrt+", moddate = "+moddate+" WHERE rufnummer="+rufnummer, function (err, result) {
						if(err){
							console.log(err);
						}else{
							console.log(result);
						}
					});
				break;
			}
		}
		break;
		case 9:
		state = "standby";
		break;
	}
}
*/
/*
console.log("decData",serverpin);
console.log("hex",serverpin.toString(16));
console.log(hexify(serverpin));*/
