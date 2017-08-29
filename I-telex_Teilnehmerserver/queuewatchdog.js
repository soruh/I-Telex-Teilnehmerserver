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
const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;
const QUEUE_SEND_INTERVAL = 60000

const net = require('net');
const mysql = require('mysql');
const async = require('async');
const validatepin = 3451414;

var connections = [];
var handles = {};
for(i=1;i<=10;i++){handles[i] = {};}

handles[8][RESPONDING] = (obj,cnum,dbcon,connection)=>{
	var dbcon = mysql.createConnection({
		host: "localhost",
		user: "telefonbuch",
		password: "amesads"
	});
	if(connections[cnum].writebuffer.length > 0){
		console.log("writing!");
		var b = connection.write(encPacket({packagetype:5,datalength:100,data:connections[cnum].writebuffer[0]}));
		if(b){
			console.log("wrote!");
			console.log(connections[cnum].writebuffer[0]);
			dbcon.query("DELETE FROM telefonbuch.queue WHERE message="+connections[cnum].writebuffer[0].uid+" AND server="+connections[cnum].servernum+";",function(err,res) {
				if(err){
					throw err;
				}else if(res.affectedRows > 0){
					console.log(FgGreen+"deleted queue entry "+FgCyan+connections[cnum].writebuffer[0].uid+FgGreen+" from queue"+FgWhite);
					connections[cnum].writebuffer = connections[cnum].writebuffer.splice(1);
				}
			});
		}else{
			//throw "error writing";
			console.log("error writing");
		}
	}else if(connections[cnum].writebuffer.length <= 0){
		connection.write(encPacket({packagetype:9,datalength:0}));
		connections[cnum].writebuffer = [];
		connections[cnum].state = STANDBY;
	}
};

var sendInt = setInterval(SendQueue,QUEUE_SEND_INTERVAL);
process.stdin.on('data',(data)=>{
	if(data.toString() === "sendqueue"){
		clearInterval(sendInt);
		SendQueue(()=>{
			sendInt = setInterval(SendQueue,QUEUE_SEND_INTERVAL);
		});
	}
	console.log("stdin: "+data);
});
/*dbcon.query("DELETE FROM telefonbuch.queue WHERE uid="+row.uid, function (err, result2) {
	console.log(FgGreen+"deleted queue entry "+FgCyan+result2.uid+FgGreen+" from queue"+FgWhite);
});*/
function SendQueue(callback){
	console.log(FgCyan+"Sending Queue!"+FgWhite);
	var dbcon = mysql.createConnection({
		host: "localhost",
		user: "telefonbuch",
		password: "amesads"
	});
	dbcon.query("SELECT * FROM telefonbuch.teilnehmer", function (err, teilnehmer){
		if(err){
			throw err;
		}
		dbcon.query("SELECT * FROM telefonbuch.queue", function (err, results){//order by server
			if(err) console.log(err);
			if(results.length>0){
				var servers = {};
				for(i in results){
					if(!servers[results[i].server]){
						servers[results[i].server] = [];
					}
					servers[results[i].server][servers[results[i].server].length] = results[i];
				}
				console.log(BgMagenta,FgBlack,servers,BgBlack,FgWhite);
				async.eachSeries(servers,function(server,cb){
					console.log(FgMagenta,server,FgWhite);
					dbcon.query("SELECT * FROM telefonbuch.servers WHERE uid="+server[0].server+";",(err, result2)=>{
						if(err){
							throw err;
						}
						var serverinf = result2[0];
						console.log(FgCyan,serverinf,FgWhite);
						try{
							connect(dbcon,cb,{host:serverinf.addresse,port: serverinf.port},function(client,cnum){
								connections[cnum].servernum = server[0].server;
								console.log(FgGreen+'connected to server: '+serverinf.addresse+" on port: "+serverinf.port+FgWhite);
								connections[cnum].writebuffer = [];
								async.each(server,(serverdata,scb)=>{
									console.log(FgCyan,serverdata,FgWhite);
									dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE uid="+serverdata.message+";",(err, result3)=>{
										connections[cnum].writebuffer[connections[cnum].writebuffer.length] = result3[0];
										scb();
									});
								},()=>{
									client.write(encPacket({packagetype:7,datalength:5,data:{serverpin:validatepin,version:1}}),()=>{
										connections[cnum].state = RESPONDING;
										cb();
									});
								});
							});
						}catch(e){
							throw e;
							//cb();
						}
					})
				},()=>{
					console.log("done");
					dbcon.end();
					try{callback();}catch(e){}
				});
			}else{
				console.log(FgYellow,"No queue!",FgWhite);
				try{callback();}catch(e){}
			}
		});
	});
}
function connect(dbcon,cb,options,callback){
	console.log(FgWhite,options);
	try {
		var socket = new net.Socket();
		var cnum = -1;
		for(i=0;i<connections.length;i++){
			if(connections[i] == null){
				cnum = i;
			}
		}
		if(cnum == -1){
			cnum = connections.length;
		}
		connections[cnum] = {/*connection:socket,*/state:STANDBY};
		socket.on('data',(data)=>{
			handlePacket(decData(data),cnum,dbcon,socket);
		});
		socket.on('error',(error)=>{
			console.log(FgRed,error,FgWhite);
			socket.end();
			cb();
		});
		socket.connect(options,(connection)=>{
			return(callback(socket,cnum));
		});
	}catch(e){
		throw e;
		//cb();
	}
}
function handlePacket(obj,cnum,dbcon,connection){
	console.log(FgMagenta+"state: "+FgCyan+connections[cnum]["state"]+FgWhite);
	console.log(BgYellow,FgRed,obj,FgWhite,BgBlack);
	if(typeof handles[obj.packagetype][connections[cnum]["state"]] === "function"){
		try{
			handles[obj.packagetype][connections[cnum]["state"]](obj,cnum,dbcon,connection);
		}catch(e){
			console.log(FgRed,e,FgWhite);
		}
	}else{
		console.log(FgRed+"packagetype ["+FgCyan+obj.packagetype+FgRed+" ] not supported in state ["+FgCyan+connections[cnum]["state"]+FgRed+"]"+FgWhite);
	}
}
function encPacket(obj){
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
			.concat(deConcatValue(data.hostname,40))
			.concat(deConcatValue(data.ipaddresse,4))
			.concat(deConcatValue(parseInt(data.port),2))
			.concat(deConcatValue(data.extention,1))
			.concat(deConcatValue(parseInt(data.pin),2))
			.concat(deConcatValue(parseInt(data.moddate),4));
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
		//The Address_confirm(0x02) packet is not supposed to be sent to the server
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
			if(arr[i] > 0){
				str += String.fromCharCode(arr[i]);
			}
		}
		return(str/*.replace(/(\u0000)/g,"")*/);
	}
}
function deConcatValue(value,size){
	//console.log(value);
	var array = [];
	if(typeof value === "string"){
		//console.log("string");
		for(i=0;i<value.length;i++){
			array[i] = value.charCodeAt(i);
		}
		array[array.length] = 0;
	}else if(typeof value === "number"){
		//console.log("number");
		while(value>0){
			array[array.length] = value%256;
			value = Math.floor(value/256);
		}
	}else if(typeof value === "undefined"){
		//console.log("undefined");
	}
	if(array.length>size){
		throw	"Value turned into a bigger than expecte Bytearray!\n"+array.length+" > "+size;
	}
	while(array.length<size){
		array[array.length] = 0;
	}
	return(array);
}
