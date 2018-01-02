"use strict";
if(module.parent!=null){var mod = module;var load_order = [module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev = [];for(let i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[37m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[37m":"\x1b[33m"+load_order[i]+"\x1b[37m");}console.log("loaded: "+load_order_rev.join(" --> "));}
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));

const ll = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js")).ll;
const lle = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js")).lle;
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');

//<STATES>
const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;

const stateNames = {0:"standby",1:"responding",2:"performing fullquery",3:"performing login"};
const PackageNames = {1:"Client_update",2:"Address_confirm",3:"Peer_query",4:"Peer_not_found",5:"Peer_reply",6:"Sync_FullQuery",7:"Sync_Login",8:"Acknowledge",9:"End_of_List",10:"Peer_search"};
//</STATES>
var connections = {};	//list of active connections

var timeouts = {};
function Timer(fn, countdown){
    var timout;
    function _time_diff(date1, date2){
      return date2 ? date2 - date1 : new Date().getTime() - date1;
    }
    function cancel(){
    	clearTimeout(timout);
    }
    function pause(){
			this.paused = true;
      clearTimeout(timout);
      this.total_time_run = _time_diff(this.start_time);
      this.complete = this.total_time_run >= countdown;
			this.remaining = countdown - this.total_time_run;
    }
    function resume(){
			this.paused = false;
			this.total_time_run = _time_diff(this.start_time);
			this.complete = this.total_time_run >= countdown;
			this.remaining = countdown - this.total_time_run;
      timout = this.complete ? -1 : setTimeout(fn, this.remaining);
    }
    this.start_time = new Date().getTime();
    timout = setTimeout(fn, countdown);

    return {cancel:cancel,pause:pause,resume:resume,complete:false,start_time:this.start_time};
}
function TimeoutWrapper(fn, countdown){
	var fnName = fn.toString().split("(")[0].split(" ")[1];
	var args = [];
	for(let i in arguments){
		if(i>2) args.push(arguments[i]);
	}
	args.push(function(){
		if(cv(3)) ll(colors.FgMagenta+"callback for timeout: "+colors.FgCyan+fnName+colors.Reset);
		for(let k of Object.keys(timeouts)){
			if(timeouts[k].complete){
				timeouts[k].start_time = new Date().getTime();
				if(cv(3)) ll(colors.FgMagenta+"restarted timeout for: "+colors.FgCyan+fnName+colors.Reset);
			}
			timeouts[k].resume();
		}
	});
	if(cv(1)) ll(colors.FgMagenta+"set timeout for: "+colors.FgCyan+fnName+colors.FgMagenta+" to "+colors.FgCyan+countdown+colors.FgMagenta+"ms"+colors.Reset);
	timeouts[fnName] = new Timer(function(){
		for(let k of Object.keys(timeouts)){
			timeouts[k].pause();
		}
		if(cv(3)) ll(colors.FgMagenta+"called: "+colors.FgCyan+fnName+colors.FgMagenta+" with: "+colors.FgCyan,args.slice(1),colors.Reset);
		fn.apply(null,args);
	},countdown);
}

function connect(pool,onEnd,options,handles,callback){
	if(cv(2)) ll(colors.FgGreen,"trying to connect to:"+colors.FgCyan,options,colors.Reset);
	try{
		var socket = new net.Socket();
    var cnum = -1;
    for(let i = 0;i<Object.keys(connections).length;i++){
      if(!connections.hasOwnProperty(i)){
        cnum = i;
      }
    }
    if(cnum == -1){
      cnum = Object.keys(connections).length;
    }
		connections[cnum] = {connection:socket,readbuffer:[],state:STANDBY,packages:[],handling:false};
		socket.setTimeout(config.get("CONNECTIONTIMEOUT"));
		socket.on('timeout', function(){
		    socket.destroy();
				socket.end();
		});
		socket.on('data',function(data){
			//if(cv(2)) ll(colors.FgCyan,data,"\n"+colors.FgYellow,data.toString(),colors.Reset);
			//if(cv(2)) ll(connections.readbuffer);
			var res = checkFullPackage(data, connections.readbuffer);
			//if(cv(2)) ll(res);
			if(res[1]){
				connections[cnum].readbuffer = res[1];
			}
			if(res[0]){
				if(typeof connections[cnum].packages != "object") connections[cnum].packages = [];
				connections[cnum].packages = connections[cnum].packages.concat(decData(res[0]));
				let timeout = function(){
					if(cv(2)) ll(colors.FgGreen+"handling: "+colors.FgCyan+connections[cnum].handling+colors.Reset);
					if(connections[cnum].handling === false){
						connections[cnum].handling = true;
						if(connections[cnum].timeout != null){
							clearTimeout(connections[cnum].timeout);
							connections[cnum].timeout = null;
						}
						async.eachOfSeries(connections[cnum].packages,function(pkg,key,cb){
							if((cv(1)&&(Object.keys(connections[cnum].packages).length > 1))||cv(2)) ll(colors.FgGreen+"handling package "+colors.FgCyan+(key+1)+"/"+Object.keys(connections[cnum].packages).length+colors.Reset);
							handlePackage(pkg,cnum,pool,socket,handles,function(){
								connections[cnum].packages.splice(key,1);
								cb();
							});
						},function(){
							connections[cnum].handling = false;
						});
					}else{
						if(connections[cnum].timeout == null){
							connections[cnum].timeout = setTimeout(timeout,10);
						}
					}
				}
				timeout();
			}
			/*if(res[0]){
				handlePackage(decData(res[0]),cnum,pool,socket,handles);
			}*/
		});
		socket.on('error',function(error){
			if(error.code == "ECONNREFUSED"){
				ll("server "+connections[cnum].servernum+" could not be reached");
			}else{
				if(cv(0)) lle("in "+module.parent.filename+"\n",colors.FgRed,error,colors.Reset);
			}
			if(connections[cnum].connection = socket) connections.splice(cnum,1);
			try{
				try{onEnd();}catch(e){}
			}catch(e){
				if(cv(2)) lle(e);
			}
		});
		socket.on('end',function(){
			if(connections[cnum].connection = socket) delete connections[cnum];
			try{
				try{onEnd();}catch(e){}
			}catch(e){
				if(cv(2)) lle(e);
			}
		});
		socket.connect(options,function(connection){
			return(callback(socket,cnum));
		});
	}catch(e){
		if(cv(2)) lle(e);
		//cb();
	}
}
function handlePackage(obj,cnum,pool,connection,handles,cb){
	if(!obj){
		if(cv(0)) lle(colors.FgRed+"no package to handle"+colors.Reset);
		if(typeof cb === "function") cb();
	}else{
		if(cv(2)) ll(colors.FgGreen+"state: "+colors.FgCyan+stateNames[connections[cnum].state]+"("+connections[cnum].state+")"+colors.Reset);
		if(obj.packagetype==0xff){
			if(cv(0)) lle(colors.FgRed+"remote client had error:",Buffer.from(obj.data).toString());
			if(typeof cb === "function") cb();
		}else{
			try{
				if(cv(2)){
          ll(colors.FgGreen+"handeling package:"+colors.FgCyan,obj,colors.FgGreen+"for: "+colors.FgCyan+(obj.packagetype == 1?"#"+obj.data.rufnummer:connection.remoteAddress)+colors.Reset);
        }else if(cv(1)){
          ll(colors.FgGreen+"handeling packagetype:"+colors.FgCyan,obj.packagetype,colors.FgGreen+"for: "+colors.FgCyan+(obj.packagetype == 1?"#"+obj.data.rufnummer:connection.remoteAddress)+colors.Reset);
        }
				if(typeof handles[obj.packagetype][connections[cnum].state]=="function"){
					handles[obj.packagetype][connections[cnum].state](obj,cnum,pool,connection,handles,cb);
					if(cv(2)) ll(colors.FgGreen+"calling handler for packagetype "+colors.FgCyan+PackageNames[obj.packagetype]+"("+obj.packagetype+")"+colors.FgGreen+" in state "+colors.FgCyan+stateNames[connections[cnum].state]+"("+connections[cnum].state+")"+colors.Reset);
				}else{
					if(cv(0)) lle(colors.FgRed+"packagetype "+colors.FgCyan+PackageNames[obj.packagetype]+"("+obj.packagetype+")"+colors.FgRed+" not supported in state "+colors.FgCyan+stateNames[connections[cnum].state]+"("+connections[cnum].state+")"+colors.Reset);
					if(typeof cb === "function") cb();
				}
			}catch(e){
				if(cv(0)) lle(colors.FgRed,e,colors.Reset);
				if(typeof cb === "function") cb();
			}
		}
	}
}
function encPackage(obj){
	if(cv(2)) ll(colors.FgGreen,"encoding:",colors.FgCyan,obj,colors.Reset);
	var data = obj.data;
	switch(obj.packagetype){
		case 1:
			var array = ValueToBytearray(data.rufnummer,4)
			.concat(ValueToBytearray(data.pin,2))
			.concat(ValueToBytearray(data.port,2));
			break;
		case 2:
			var iparr = data.ipaddresse.split(".");
			var numip=0
			for(let i in iparr){
				numip += iparr[i]*Math.pow(2,(i*8));
			}
			var array = ValueToBytearray(numip,4);
			break;
		case 3:
			var array = ValueToBytearray(data.rufnummer,4)
			.concat(ValueToBytearray(data.version,1));
			break;
		case 4:
		var array = [];
			break;
		case 5:
			var flags = data.gesperrt;
			var iparr = data.ipaddresse.split(".");
			var numip=0;
			for(let i in iparr){
				numip += iparr[i]*Math.pow(2,(i*8));
			}
			var array = ValueToBytearray(data.rufnummer,4)
			.concat(ValueToBytearray(data.name,40))
			.concat(ValueToBytearray(flags,2))
			.concat(ValueToBytearray(data.typ,1))
			.concat(ValueToBytearray(data.hostname,40))
			.concat(ValueToBytearray(numip,4))
			.concat(ValueToBytearray(parseInt(data.port),2))
			.concat(ValueToBytearray(parseInt(data.extension),1))
			.concat(ValueToBytearray(parseInt(data.pin),2))
			.concat(ValueToBytearray(parseInt(data.moddate)+2208988800,4));
			break;
		case 6:
			var array = ValueToBytearray(data.version,1)
			.concat(ValueToBytearray(config.get("SERVERPIN"),4));
			break;
		case 7:
			var array = ValueToBytearray(data.version,1)
			.concat(ValueToBytearray(config.get("SERVERPIN"),4));
			break;
		case 8:
			var array = [];
			break;
		case 9:
			var array = [];
			break;
		case 10:
			// var array = ValueToBytearray(data.version,1)
			// .concat(ValueToBytearray(data.pattern,40));
			var array = ValueToBytearray(data.pattern,40)
			.concat(ValueToBytearray(data.version,1));
			break;
	}
	var header = [obj.packagetype,array.length];
	if(array.length != obj.datalength){
		if(cv(0)) lle("Buffer had unexpected size:\n"+array.length+" != "+obj.datalength);
		return(Buffer.from([]));
	}
	if(cv(2)) ll(colors.FgGreen+"encoded:"+colors.FgCyan,Buffer.from(header.concat(array)),colors.Reset);
	return(Buffer.from(header.concat(array)));
}
function decPackage(packagetype,buffer){
	switch(packagetype){
		case 1:
			var data = {
				rufnummer:BytearrayToValue(buffer.slice(0,4),"number"),
				pin:BytearrayToValue(buffer.slice(4,6),"number"),
				port:BytearrayToValue(buffer.slice(6,8),"number")
			};
			break;
		/*
		case 2:
			var data = {
				ipaddresse:BytearrayToValue(buffer.slice(0,4),"string")
			};
			break;
		The 2(0x02) package is not supposed to be sent to the server*/
		case 3:
			var data = {
 				rufnummer:BytearrayToValue(buffer.slice(0,4),"number")
 			};
			if(buffer.slice(4,5).length > 0){
				data["version"] = BytearrayToValue(buffer.slice(4,5),"number");
			}else{
				data["version"] = 1;
			}
			break;
		case 4:
			var data = {};
			break;
		case 5:
			var numip = BytearrayToValue(buffer.slice(87,91),"number");
			/*
			var iparr = [];
			for(let i=0;i<=3;i++){
				iparr[i] = (numip>>i*8)&255
			}
			var ipaddresse = iparr.join(".");
			*/
			var a = (numip>>0)&255;
			var b = (numip>>8)&255;
			var c = (numip>>16)&255;
			var d = (numip>>24)&255;
			var ipaddresse = a+"."+b+"."+c+"."+d;
			var flags = buffer.slice(44,46);
			var data = {
				rufnummer:BytearrayToValue(buffer.slice(0,4),"number"),
				name:BytearrayToValue(buffer.slice(4,44),"string"),
				gesperrt:flags[0],
				typ:BytearrayToValue(buffer.slice(46,47),"number"),
				addresse:BytearrayToValue(buffer.slice(47,87),"string"),
				ipaddresse:ipaddresse,
				port:BytearrayToValue(buffer.slice(91,93),"number"),
				durchwahl:BytearrayToValue(buffer.slice(93,94),"number"),
				pin:BytearrayToValue(buffer.slice(94,96),"number"),
				timestamp:BytearrayToValue(buffer.slice(96,100),"number")-2208988800
			};
			break;
		case 6:
			var data = {
				version:BytearrayToValue(buffer.slice(0,1),"number"),
				serverpin:BytearrayToValue(buffer.slice(1,5),"number")
			};
			break;
		case 7:
			var data = {
				version:BytearrayToValue(buffer.slice(0,1),"number"),
				serverpin:BytearrayToValue(buffer.slice(1,5),"number")
			};
			break;
		case 8:
			var data = {};
			break;
		case 9:
			var data = {};
			break;
		case 10:
			var data = {
				// version:BytearrayToValue(buffer.slice(0,1),"number"),
				// pattern:BytearrayToValue(buffer.slice(1,41),"string")
				pattern:BytearrayToValue(buffer.slice(0,40),"string"),
				version:BytearrayToValue(buffer.slice(40,41),"number")
			};
			break;
		default:
			lle("invalid/unsupported packagetype: "+packagetype);
			data = false;
			break;
	}
		return(data);
}
function decData(buffer){
	if(cv(2)) ll(colors.FgGreen+"decoding:",colors.FgCyan,Buffer.from(buffer), colors.Reset);
	var typepos = 0;
	var out = [];
	while(typepos<buffer.length-1){
		var packagetype = parseInt(buffer[typepos],10);
		var datalength = parseInt(buffer[typepos+1],10);
		var blockdata = [];
		for(let i=0;i<datalength;i++){
			blockdata[i] = buffer[typepos+2+i];
		}
		var data=decPackage(packagetype,blockdata);
		if(data){
			out.push({
				packagetype:packagetype,
				datalength:datalength,
				data:data
			});
		}else{
			ll("error, no data");
		}
		typepos += datalength+2;
	}
	if(cv(2)) ll(colors.FgGreen+"decoded:",colors.FgCyan,out[0],colors.Reset);
	return(out);	//TODO
}
function checkFullPackage(buffer, part){
	//if(cv(2)) ll(part);
	//if(cv(2)) ll(buffer);
	buffer = Array.prototype.slice.call(buffer, 0);
	var data = buffer;
	if(part){
		data = part.concat(buffer);
	}
	//if(cv(2)) ll(data);
	var packagetype = data[0];
	var packagelength = data[1]+2;
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
function BytearrayToValue(arr,type){
	if(type==="number"){
		var num = 0;
		for(let i=arr.length-1;i>=0;i--){
			num *= 256;
			num += arr[i];
		}
		return(num);
	}else if(type==="string"){
		var str = "";
		for(let i=0;i<arr.length;i++){
			if(arr[i] != 0){
				str += String.fromCharCode(arr[i]);
			}else{
				break;
			}
		}
		return(str.replace(/(\u0000)/g,""));
	}
}
function ValueToBytearray(value,size){
	//if(cv(2)) ll(value);
	var array = [];
	if(typeof value === "string"){
		for(let i=0;i<value.length;i++){
			array[i] = value.charCodeAt(i);
		}
	}else if(typeof value === "number"){
		while(value>0){
			array[array.length] = value%256;
			value = Math.floor(value/256);
		}
	}
	if(array.length>size||array.length==undefined){
		if(cv(0)) lle("Value "+value+" turned into a bigger than expecte Bytearray!\n"+array.length+" > "+size);
	}
	while(array.length<size){
		array[array.length] = 0;
	}
	return(array);
}
function ascii(data,connection,pool){
	var number = "";
	for(let i=0;i<data.length;i++){
		//if(cv(2)) ll(String.fromCharCode(data[i]));
		if(/([0-9])/.test(String.fromCharCode(data[i]))){
			number += String.fromCharCode(data[i]);
		}
	}
	if(number!=""){number = parseInt(number);}
	if(!isNaN(number)&&number!=""){
		if(cv(1)) ll(colors.FgGreen+"starting lookup for: "+colors.FgCyan+number+colors.Reset);
		SqlQuery(pool,"SELECT * FROM teilnehmer WHERE rufnummer="+number+";", function(result){
			if(result.length == 0||result.gesperrt == 1||result.typ == 0){
				var send = "fail\n\r";
				send += number+"\n\r";
				send += "unknown\n\r";
				send += "+++\n\r";
				connection.write(send,function(){
					if(cv(1)) m = colors.FgRed+"Entry not found/visible";
					if(cv(2)){
						m += ", sent:\n"+colors.FgYellow+send+colors.Reset;
					}else{
						m += colors.Reset;
					}
					if(cv(1)) ll(m);
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
					if(cv(1)) m = colors.FgGreen+"Entry found";
					if(cv(2)){
						m += ", sent:\n"+colors.FgYellow+send+colors.Reset;
					}else{
						m += colors.Reset;
					}
					if(cv(1)) ll(m);
				});
			}
		});
	}
}

function cv(level){ //check verbosity
	return(level <= config.get("LOGGING_VERBOSITY"));
}
function SqlQuery(sqlPool,query,callback){
	if(cv(2)) ll(colors.BgWhite+colors.FgBlack,query,colors.Reset+colors.Reset);
	sqlPool.query(query,function(err,res){
		try{
			if(cv(2)) ll("number of open connections: "+sqlPool._allConnections.length);
		}catch(e){
			if(cv(2)) ll("not a pool");
		}
		if(err){
			if(cv(0)) lle(colors.FgRed,err,colors.Reset);
			if(typeof callback === "function") callback([]);
		}else{
			if(typeof callback === "function") callback(res);
		}
	});
	/*try{
		sqlPool.getConnection(function(e,c){
			if(e){
				if(cv(0)) lle(colors.FgRed,e,colors.Reset);
				c.release();
			}else{
				c.query(query,function(err,res){
					c.release();
					//console.log(sqlPool);
					try{
						ll("number of open connections: "+sqlPool._allConnections.length);
					}catch(e){
						//ll("sqlPool threadId: "+sqlPool.threadId);
						console.trace(sqlPool.threadId);
					}
					if(err){
						if(cv(0)) lle(colors.FgRed,err,colors.Reset);
						if(typeof callback === "function") callback([]);
					}else{
						if(typeof callback === "function") callback(res);
					}
				});
			}
		});
	}catch(e){
		console.log(sqlPool);
		throw(e);
	}*/
}

module.exports.ascii=ascii;
module.exports.TimeoutWrapper=TimeoutWrapper;
module.exports.timeouts=timeouts;
module.exports.connect=connect;
module.exports.handlePackage=handlePackage;
module.exports.encPackage=encPackage;
module.exports.decPackage=decPackage;
module.exports.decData=decData;
module.exports.BytearrayToValue=BytearrayToValue;
module.exports.ValueToBytearray=ValueToBytearray;
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
