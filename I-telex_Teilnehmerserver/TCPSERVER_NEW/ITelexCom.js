const net = require('net');
const mysql = require('mysql');
const async = require('async');
const colors = require("./colors.js")
const config = require('./config.js');
const mySqlConnectionOptions = {
	host: config.SQL_host,
	user: config.SQL_user,
	password: config.SQL_password
};


//<STATES>
const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;
//</STATES>
var connections = [];	//list of active connections

function connect(dbcon,cb,options,handles,callback){
	if(cv(2)) console.log(colors.FgWhite,options);
	try{
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
			if(cv(2)) console.log(colors.FgCyan,data,"\n",data.toString(),colors.FgWhite);
			handlePacket(decData(data),cnum,dbcon,socket,handles);
		});
		socket.on('error',(error)=>{
			if(cv(0)) console.log(colors.FgRed,error,colors.FgWhite);
			socket.end();
			cb();
		});
		socket.connect(options,(connection)=>{
			return(callback(socket,cnum));
		});
	}catch(e){
		if(cv(0)) console.log(e);
		//cb();
	}
}
function handlePacket(obj,cnum,dbcon,connection,handles){
	if(!obj){
		if(cv(0)) console.log(colors.FgRed+"'handlePacket' missing obj"+colors.FgWhite);
	}else{
		if(cv(2)) console.log(colors.FgMagenta+"state: "+colors.FgCyan+connections[cnum]["state"]+colors.FgWhite);
		if(cv(2)) console.log(colors.BgYellow,colors.FgRed,obj,colors.FgWhite,colors.BgBlack);
		if(obj.packagetype==0xff){
			if(cv(2)) console.log(obj.data);
			if(cv(2)) console.log(colors.FgRed+Buffer.from(obj.data).toString());
		}
		try{
			if(handles[obj.packagetype]!=undefined){
				handles[obj.packagetype][connections[cnum]["state"]](obj,cnum,dbcon,connection,handles);
			}else{
				if(cv(0)) console.log(colors.FgRed+"packagetype ["+colors.FgCyan+obj.packagetype+colors.FgRed+" ] not supported in state ["+colors.FgCyan+connections[cnum]["state"]+colors.FgRed+"]"+colors.FgWhite);
			}
		}catch(e){
			if(cv(0)) console.log(colors.FgRed,e,colors.FgWhite);
		}
	}
}
function encPacket(obj) {
	if(cv(2)) console.log(colors.BgYellow,colors.FgBlue,obj,colors.FgWhite,colors.BgBlack);
	var data = obj.data;
	switch(obj.packagetype){
		case 1:
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.pin,2))
			.concat(deConcatValue(data.port,2));
			break;
		case 2:
			var iparr = data.ipaddresse.split(".");
			var numip=0
			for(i in iparr){
				numip += iparr[i]*Math.pow(2,(i*8));
			}
			var array = deConcatValue(numip,4);
			break;
		case 3:
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.version,1));
			break;
		case 4:
		var array = [];
			break;
		case 5:
			var iparr = data.ipaddresse.split(".");
			var numip=0
			for(i in iparr){
				numip += iparr[i]*Math.pow(2,(i*8));
			}
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.name,40))
			.concat(deConcatValue(data.flags,2))
			.concat(deConcatValue(data.typ,1))
			.concat(deConcatValue(data.hostname,40))
			.concat(deConcatValue(numip,4))
			.concat(deConcatValue(parseInt(data.port),2))
			.concat(deConcatValue(parseInt(data.extention),1))
			.concat(deConcatValue(parseInt(data.pin),2))
			.concat(deConcatValue(parseInt(data.moddate)+2208988800,4));
			break;
		case 6:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(data.config.SERVERPIN,4));
			break;
		case 7:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(data.config.SERVERPIN,4));
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
		if(cv(0)) console.log("Buffer bigger than expected:\n"+array.length+" > "+obj.datalength);
	}
	if(cv(2)) console.log(colors.FgBlue,Buffer.from(header.concat(array)),colors.FgWhite);
	return(Buffer.from(header.concat(array)));
}
function decPacket(packagetype,buffer){
	switch(packagetype){
		case 1:
			var data = {
				rufnummer:concatByteArray(buffer.slice(0,4),"number"),
				pin:concatByteArray(buffer.slice(4,6),"number"),
				port:concatByteArray(buffer.slice(6,8),"number")
			};
			return(data);
			break;
		case 2:
			var data = {
				ipaddresse:concatByteArray(buffer.slice(0,4),"string")
			};
			return(data);
			break;
		//The 2(0x02) packet is not supposed to be sent to the server
		case 3:
			var data = {
 				rufnummer:concatByteArray(buffer.slice(0,4),"number")
 			};
			if(buffer.slice(4,5).length > 0){
				data["version"] = concatByteArray(buffer.slice(4,5),"number");
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
			var numip = concatByteArray(buffer.slice(87,91),"number");
			var a = (numip>>0)&0xff;
			var b = (numip>>8)&0xff;
			var c = (numip>>16)&0xff;
			var d = (numip>>24)&0xff;
			var ipaddresse = a+"."+b+"."+c+"."+d;
			var data = {
				rufnummer:concatByteArray(buffer.slice(0,4),"number"),
				name:concatByteArray(buffer.slice(4,44),"string"),
				flags:concatByteArray(buffer.slice(44,46),"number"),
				typ:concatByteArray(buffer.slice(46,47),"number"),
				addresse:concatByteArray(buffer.slice(47,87),"string"),
				ipaddresse:ipaddresse,
				port:concatByteArray(buffer.slice(91,93),"number"),
				durchwahl:concatByteArray(buffer.slice(93,94),"number"),
				pin:concatByteArray(buffer.slice(94,96),"number"),
				timestamp:concatByteArray(buffer.slice(96,100),"number")-2208988800
			};
			return(data);
			break;
		case 6:
			var data = {
				version:concatByteArray(buffer.slice(0,1),"number"),
				serverpin:concatByteArray(buffer.slice(1,5),"number")
			};
			return(data);
			break;
		case 7:
			var data = {
				version:concatByteArray(buffer.slice(0,1),"number"),
				serverpin:concatByteArray(buffer.slice(1,5),"number")
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
				version:concatByteArray(buffer.slice(0,1),"number"),
				pattern:concatByteArray(buffer.slice(1,41),"string")
			};
			return(data);
			break;
		default:
			return(buffer);
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
function concatByteArray(arr,type){
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
	if(cv(2)) console.log(value);
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
	if(array.length>size||array.length==undefined){
		if(cv(0)) console.log("Value "+value+" turned into a bigger than expecte Bytearray!\n"+array.length+" > "+size);
	}
	while(array.length<size){
		array[array.length] = 0;
	}
	return(array);
}
function ascii(data,connection,dbcon){
	var number = "";
	for(i=0;i<data.length;i++){
		//if(cv(2)) console.log(String.fromCharCode(data[i]));
		if(/([0-9])/.test(String.fromCharCode(data[i]))){
			number += String.fromCharCode(data[i]);
		}
	}
	if(number!=""){number = parseInt(number);}
	if(number!=NaN&&number!=""){
		if(cv(1)) console.log(colors.FgGreen+"starting lookup for: "+colors.FgCyan+number+colors.FgWhite);
		dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE rufnummer="+number, function (err, result){
			if(err){
				if(cv(0)) console.log(err);
			}else{
				if(result.length == 0){
					var send = "fail\n\r";
					send += number+"\n\r";
					send += "unknown\n\r";
					send += "+++\n\r";
					connection.write(send,function(){
						if(cv(1)) console.log(colors.FgRed+"Entry not found, sent:\n"+colors.FgWhite+send);
					});
				}else{
					var send = "ok\n\r";
					send += result[0]["rufnummer"]+"\n\r";
					send += result[0]["name"]+"\n\r";
					send += result[0]["typ"]+"\n\r";
					if(result[0]["typ"]==5){
						send += result[0]["ipaddresse"]+"\n\r";
					}else{
						send += result[0]["hostname"]+"\n\r";
					}
					send += result[0]["port"]+"\n\r";
					send += result[0]["extention"]+"\n\r";
					send += "+++\n\r";
					connection.write(send,function(){
						if(cv(1)) console.log(colors.FgGreen+"Entry found, sent:\n"+colors.FgWhite+send);
					});
				}
			}
		});
	}
}
function SendQueue(callback){
	if(cv(2)) console.log(colors.FgCyan+"Sending Queue!"+colors.FgWhite);
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	dbcon.query("SELECT * FROM telefonbuch.teilnehmer", function (err, teilnehmer){
		if(err){
			if(cv(0)) console.log(err);
		}
		dbcon.query("SELECT * FROM telefonbuch.queue", function (err, results){//order by server
			if(err) throw(err);
			if(results.length>0){
				var servers = {};
				for(i in results){
					if(!servers[results[i].server]){
						servers[results[i].server] = [];
					}
					servers[results[i].server][servers[results[i].server].length] = results[i];
				}
				if(cv(2)) console.log(colors.BgMagenta,colors.FgBlack,servers,colors.BgBlack,colors.FgWhite);
				async.eachSeries(servers,function(server,cb){
					if(cv(2)) console.log(colors.FgMagenta,server,colors.FgWhite);
					dbcon.query("SELECT * FROM telefonbuch.servers WHERE uid="+server[0].server+";",(err, result2)=>{
						if(err){
							if(cv(0)) console.log(err);
						}
						var serverinf = result2[0];
						if(cv(2)) console.log(colors.FgCyan,serverinf,colors.FgWhite);
						try{
							ITelexCom.connect(dbcon,cb,{host:serverinf.addresse,port: serverinf.port},handles,function(client,cnum){
								connections[cnum].servernum = server[0].server;
								if(cv(1)) console.log(colors.FgGreen+'connected to server: '+serverinf.addresse+" on port: "+serverinf.port+colors.FgWhite);
								connections[cnum].writebuffer = [];
								async.each(server,(serverdata,scb)=>{
									if(cv(2)) console.log(colors.FgCyan,serverdata,colors.FgWhite);
									dbcon.query("SELECT * FROM telefonbuch.teilnehmer WHERE uid="+serverdata.message+";",(err, result3)=>{
										connections[cnum].writebuffer[connections[cnum].writebuffer.length] = result3[0];
										scb();
									});
								},()=>{
									client.write(ITelexCom.encPacket({packagetype:7,datalength:5,data:{config.SERVERPIN:config.SERVERPIN,version:1}}),()=>{
										connections[cnum].state = RESPONDING;
										cb();
									});
								});
							});
						}catch(e){
							if(cv(0)) console.log(e);
							//cb();
						}
					})
				},()=>{
					if(cv(2)) console.log("done");
					dbcon.end();
					try{callback();}catch(e){}
				});
			}else{
				if(cv(2)) console.log(colors.FgYellow,"No queue!",colors.FgWhite);
				try{callback();}catch(e){}
			}
		});
	});
}
function cv(level){ //check verbosity
	return(level <= config.LOGGING_VERBOSITY);
}

module.exports.ascii=ascii;
module.exports.connect=connect;
module.exports.handlePacket=handlePacket;
module.exports.encPacket=encPacket;
module.exports.decPacket=decPacket;
module.exports.decData=decData;
module.exports.concatByteArray=concatByteArray;
module.exports.deConcatValue=deConcatValue;
module.exports.SendQueue=SendQueue;
module.exports.connections=connections;
module.exports.cv=cv;
module.exports.states = {
	STANDBY:STANDBY,
	RESPONDING:RESPONDING,
	FULLQUERY:FULLQUERY,
	LOGIN:LOGIN
};
module.exports.SERVERPIN = config.SERVERPIN;
