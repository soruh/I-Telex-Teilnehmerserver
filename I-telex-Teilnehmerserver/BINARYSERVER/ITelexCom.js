const PWD = process.env.PWD;
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const colors = require(PWD+"/COMMONMODULES/colors.js");

const config = require(PWD+'/COMMONMODULES/config.js');

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');
/*const mySqlConnectionOptions = {
	host: config.SQL_host,
	user: config.SQL_user,
	password: config.SQL_password
};*/
//<STATES>
const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;
//</STATES>
var connections = [];	//list of active connections

function connect(dbcon,onEnd,options,handles,callback){
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
		connections[cnum] = {connection:socket,readbuffer:[],state:STANDBY,timeout:setTimeout(timeout,config.get("CONNECTIONTIMEOUT"),cnum,connections)};
		socket.on('data',function(data){
			if(cv(2)) console.log(colors.FgCyan,data,"\n",data.toString(),colors.FgWhite);
			if(cv(2)) console.log(connections.readbuffer);
			clearTimeout(connections[cnum].timeout);
			connections[cnum].timeout = setTimeout(timeout,config.get("CONNECTIONTIMEOUT"),cnum,connections);
			var res = checkFullPackage(data, connections.readbuffer);
			if(res[1]){
				connections.readbuffer = res[1];
			}
			if(res[0]){
				handlePacket(decData(res[0]),cnum,dbcon,socket,handles);
			}
		});
		socket.on('error',function(error){
			if(error.code == "ECONNREFUSED"){
				console.log("server "+connections[cnum].servernum+" could not be reached");
			}else{
				if(cv(0)) console.log(colors.FgRed,error,colors.FgWhite);
			}
			try{clearTimeout(connections[cnum].timeout);}catch(e){}
			connections.splice(cnum,1);
			try{onEnd();}catch(e){}
		});
		socket.on('end',function(){
			try{clearTimeout(connections[cnum].timeout);}catch(e){}
			connections.splice(cnum,1);
			try{onEnd();}catch(e){}
		});
		socket.connect(options,function(connection){
			return(callback(socket,cnum));
		});
	}catch(e){
		if(cv(0)) console.log(e);
		//cb();
	}
}
function timeout(n,connections){
	console.log("server "+connections[n].servernum+" timed out");
	connections[n].connection.end();
}
function handlePacket(obj,cnum,dbcon,connection,handles){
	if(!obj){
		if(cv(0)) console.log(colors.FgRed+"no package to handle"+colors.FgWhite);
	}else{
		if(cv(2)) console.log(colors.FgMagenta+"state: "+colors.FgCyan+connections[cnum]["state"]+colors.FgWhite);
		if(cv(2)) console.log(colors.BgYellow,colors.FgRed,obj,colors.FgWhite,colors.BgBlack);
		if(obj.packagetype==0xff){
			if(cv(2)) console.log(obj.data);
			if(cv(0)) console.log("remote client had error:",colors.FgRed+Buffer.from(obj.data).toString());
		}else{
			try{
				console.log(obj);
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
			.concat(deConcatValue(data.gesperrt,1))//TODO
			.concat(deConcatValue(data.deleted,1))
			.concat(deConcatValue(data.typ,1))
			.concat(deConcatValue(data.hostname,40))
			.concat(deConcatValue(numip,4))
			.concat(deConcatValue(parseInt(data.port),2))
			.concat(deConcatValue(parseInt(data.extension),1))
			.concat(deConcatValue(parseInt(data.pin),2))
			.concat(deConcatValue(parseInt(data.moddate)+2208988800,4));
			break;
		case 6:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(config.get("SERVERPIN"),4));
			break;
		case 7:
			var array = deConcatValue(data.version,1)
			.concat(deConcatValue(config.get("SERVERPIN"),4));
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
				gesperrt:concatByteArray(buffer.slice(44,45),"number"),
				deleted:concatByteArray(buffer.slice(45,46),"number"),
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
			console.error("unknown packagetype: "+packagetype);
			return(false);
			break;
	}
}
function decData(buffer){
	console.log(buffer);
	var typepos = 0;
	var out = [];
	while(typepos<buffer.length-1){
		console.log(typepos,buffer.length);
		var packagetype = parseInt(buffer[typepos],10);
		console.log(packagetype);
		var datalength = parseInt(buffer[typepos+1],10);
		console.log(datalength);
		var blockdata = [];
		for(i=0;i<datalength;i++){
			blockdata[i] = buffer[typepos+2+i];
		}
		console.log(blockdata);
		var data=decPacket(packagetype,blockdata);
		console.log(data);
		if(data){
			out.push({
				packagetype:packagetype,
				datalength,datalength,
				data:data
			});
		}else{
			console.log("error, no data");
		}
		typepos += datalength+2;
	}
	return(out[0]);
}
function checkFullPackage(buffer, part){
	var data = buffer;
	if(part){
		data = part.concat(buffer);
	}
	var packagetype = parseInt(data[0],10);
	var packagelength = parseInt(data[1],10)+2;
	if(data.length == packagelength){
		return([data, []]);
	}else if(data.length > packagelength){
		var res = checkFullPackage(data.slice(packagelength+1,data.length));
		return([data.slice(0,packagelength).concat(res[0]), res[1]]);
	}else if(data.length < packagelength){
		return([[], data]);
	}else{
		return([[], []]);
	}
}//return(data, part)
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
		SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE rufnummer="+number, function(result){
			if(result.length == 0||result.gesperrt==1){
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
				if((result[0]["typ"]==2)||(result[0]["typ"]==4)||(result[0]["typ"]==5)){
					send += result[0]["ipaddresse"]+"\n\r";
				}else if((result[0]["typ"]==1)||(result[0]["typ"]==3)){
					send += result[0]["hostname"]+"\n\r";
				}else if(result[0]["typ"]==6){
					send += result[0]["hostname"]+"\n\r";
				}
				send += result[0]["port"]+"\n\r";
				send += result[0]["extension"]+"\n\r";
				send += "+++\n\r";
				connection.write(send,function(){
					if(cv(1)) console.log(colors.FgGreen+"Entry found, sent:\n"+colors.FgWhite+send);
				});
			}
		});
	}
}
function SendQueue(handles,callback){
	if(cv(2)) console.log(colors.FgCyan+"Sending Queue!"+colors.FgWhite);
	var dbcon = mysql.createConnection(mySqlConnectionOptions);
	SqlQuery(dbcon,"SELECT * FROM teilnehmer;",function(teilnehmer){
		SqlQuery(dbcon,"SELECT * FROM queue;",function(results){
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
					SqlQuery(dbcon,"SELECT * FROM servers WHERE uid="+server[0].server+";",function(result2){
						var serverinf = result2[0];
						if(cv(2)) console.log(colors.FgCyan,serverinf,colors.FgWhite);
						try{
							var isConnected = false;
							for(c of connections){
								if(c.servernum == server[0].server){
									var isConnected = true;
								}
							}
							if(!isConnected){
								connect(dbcon,cb,{host:serverinf.addresse,port: serverinf.port},handles,function(client,cnum){
									connections[cnum].servernum = server[0].server;
									if(cv(1)) console.log(colors.FgGreen+'connected to server '+server[0].server+': '+serverinf.addresse+" on port "+serverinf.port+colors.FgWhite);
									connections[cnum].writebuffer = [];
									async.each(server,function(serverdata,scb){
										if(cv(2)) console.log(colors.FgCyan,serverdata,colors.FgWhite);
										SqlQuery(dbcon,"SELECT * FROM teilnehmer WHERE uid="+serverdata.message+";",function(result3){
											connections[cnum].writebuffer[connections[cnum].writebuffer.length] = result3[0];
											scb();
										});
									},function(){
										client.write(encPacket({packagetype:7,datalength:5,data:{serverpin:config.get("SERVERPIN"),version:1}}),()=>{
											connections[cnum].state = RESPONDING;
											cb();
										});
									});
								});
							}else{
								if(cv(1)) console.log(colors.FgYellow+"already connected to server "+server[0].server+colors.FgWhite);
							}
						}catch(e){
							if(cv(0)) console.log(e);
							cb();
						}
					})
				},function(){
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
	return(level <= config.get("LOGGING_VERBOSITY"));
}
function SqlQuery(dbcon,query,callback){
	console.log(colors.FgCyan,query,colors.FgWhite);
	dbcon.query(query,function(err,res){
		if(err){
			if(cv(0)) console.log(colors.FgRed,err,colors.FgBlack);
			callback([]);
		}else{
			callback(res);
		}
	});
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
module.exports.timeout=timeout;
module.exports.checkFullPackage=checkFullPackage;
module.exports.connections=connections;
module.exports.cv=cv;
module.exports.SqlQuery=SqlQuery;
module.exports.states = {
	STANDBY:STANDBY,
	RESPONDING:RESPONDING,
	FULLQUERY:FULLQUERY,
	LOGIN:LOGIN
};