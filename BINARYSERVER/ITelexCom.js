"use strict";
if(module.parent!=null){var mod=module;var load_order=[module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev=[];for(let i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[0m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[0m":"\x1b[33m"+load_order[i]+"\x1b[0m");}console.log("loaded: "+load_order_rev.join(" ––> "));}

Date.prototype.getTimezone = function getTimezone(){
   let offset = -1*this.getTimezoneOffset();
   let offsetStr = ("0"+Math.floor(offset/60)).slice(-2)+":"+("0"+offset%60).slice(-2);
   return("UTC"+(offsetStr[0]=="-"?"":"+")+offsetStr);
}

const path = require('path');
const PWD = path.normalize(path.join(__dirname, '..'));

const {ll,lle,llo} = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js"));
const util = require('util');
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const ip = require('ip');
const colors = require(path.join(PWD, "/COMMONMODULES/colors.js"));
const config = require(path.join(PWD, '/COMMONMODULES/config.js'));
const nodemailer = require("nodemailer");

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');
mySqlConnectionOptions.multipleStatements = true;

//<STATES>
const STANDBY = 0;
const RESPONDING = 1;
const FULLQUERY = 2;
const LOGIN = 3;

const stateNames = {
	0: "standby",
	1: "responding",
	2: "performing fullquery",
	3: "performing login"
};
const PackageNames = {
	1: "Client_update",
	2: "Address_confirm",
	3: "Peer_query",
	4: "Peer_not_found",
	5: "Peer_reply",
	6: "Sync_FullQuery",
	7: "Sync_Login",
	8: "Acknowledge",
	9: "End_of_List",
	10: "Peer_search"
};
const PackageSizes = {
	1: 8,
	2: 4,
	3: 5,
	4: 0,
	5: 100,
	6: 5,
	7: 5,
	8: 0,
	9: 0,
	10: 41
};

//</STATES>
var connections = {}; //list of active connections

var timeouts = {};

var serverErrors = {};

function Timer(fn, countdown){
	var timout;
	function _time_diff(date1, date2){
		return date2 ? date2 - date1 : new Date().getTime() - date1;
	}
	function cancel(){
		clearTimeout(timout);
	}
	function getRemaining(){
		this.total_time_run = _time_diff(this.start_time);
		this.remaining = countdown - this.total_time_run;
		return (this.remaining);
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
		if (this.complete){
			if (cv(3)) ll(colors.FgCyan + "restarted " + colors.FgMagenta + "timeout" + colors.Reset);
			this.start_time = new Date().getTime();
			this.resume();
		} else {
			timout = setTimeout(fn, this.remaining);
		}
	}
	this.start_time = new Date().getTime();
	timout = setTimeout(fn, countdown);

	return {
		cancel: cancel,
		pause: pause,
		resume: resume,
		complete: false,
		start_time: this.start_time,
		getRemaining: getRemaining
	};
}
function TimeoutWrapper(fn, countdown){
	var fnName = fn.toString().split("(")[0].split(" ")[1];
	var args = [];
	args.push(function (){
		if (cv(3)) ll(colors.FgMagenta + "callback for timeout: " + colors.FgCyan + fnName + colors.Reset);
		for (let k of Object.keys(timeouts)){
			timeouts[k].resume();
			if (cv(3)) ll(colors.FgYellow + "resumed " + colors.FgMagenta + "timeout: " + colors.FgCyan + k + colors.FgMagenta + " remaining: " + colors.FgCyan + timeouts[k].remaining + colors.Reset);
		}
	});
	for (let i in arguments){
		if (i > 2) args.push(arguments[i]);
	}
	if (cv(1)) ll(colors.FgMagenta + "set timeout for: " + colors.FgCyan + fnName + colors.FgMagenta + " to " + colors.FgCyan + countdown + colors.FgMagenta + "ms" + colors.Reset);
	timeouts[fnName] = new Timer(function (){
		for (let k of Object.keys(timeouts)){
			timeouts[k].pause();
			if (cv(3)) ll(colors.FgBlue + "paused " + colors.FgMagenta + "timeout: " + colors.FgCyan + k + colors.FgMagenta + " remaining: " + colors.FgCyan + timeouts[k].remaining + colors.Reset);
		}
		if (cv(3)) ll(colors.FgMagenta + "called: " + colors.FgCyan + fnName + colors.FgMagenta + " with: " + colors.FgCyan, args.slice(1), colors.Reset);
		fn.apply(null, args);
	}, countdown);
}


function handlePackage(obj, cnum, pool, connection, handles, cb){
	if (!obj){
		if (cv(0)) lle(colors.FgRed + "no package to handle" + colors.Reset);
		if (typeof cb === "function") cb();
	} else {
		if (cv(2)) ll(colors.FgGreen + "state: " + colors.FgCyan + stateNames[connections[cnum].state] + "(" + connections[cnum].state + ")" + colors.Reset);
		if (obj.packagetype == 0xff){
			if (cv(0)) lle(colors.FgRed + "remote client had error:", Buffer.from(obj.data).toString());
			if (typeof cb === "function") cb();
		} else {
			try {
				if (cv(2)){
					ll(colors.FgGreen + "handling package:" + colors.FgCyan, obj, colors.FgGreen + "for: " + colors.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.rufnummer : connection.remoteAddress) + colors.Reset);
				} else if (cv(1)){
					ll(colors.FgGreen + "handling packagetype:" + colors.FgCyan, obj.packagetype, colors.FgGreen + "for: " + colors.FgCyan + (obj.packagetype == 1 ? "#" + obj.data.rufnummer : connection.remoteAddress) + colors.Reset);
				}
				if (typeof handles[obj.packagetype][connections[cnum].state] == "function"){
					if (cv(2)) ll(colors.FgGreen + "calling handler for packagetype " + colors.FgCyan + PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors.FgGreen + " in state " + colors.FgCyan + stateNames[connections[cnum].state] + "(" + connections[cnum].state + ")" + colors.Reset);
					try{
						handles[obj.packagetype][connections[cnum].state](obj, cnum, pool, connection, handles, cb);
					}catch(e){
						if (typeof cb === "function") cb();
					}
				} else {
					if (cv(0)) lle(colors.FgRed + "packagetype " + colors.FgCyan + PackageNames[obj.packagetype] + "(" + obj.packagetype + ")" + colors.FgRed + " not supported in state " + colors.FgCyan + stateNames[connections[cnum].state] + "(" + connections[cnum].state + ")" + colors.Reset);
					if (typeof cb === "function") cb();
				}
			} catch (e){
				if (cv(0)) lle(colors.FgRed, e, colors.Reset);
				if (typeof cb === "function") cb();
			}
		}
	}
}

function checkFullPackage(buffer, part){
	//if(cv(2)) ll(part);
	//if(cv(2)) ll(buffer);
	buffer = Array.prototype.slice.call(buffer, 0);
	var data = buffer;
	if (part){
		data = part.concat(buffer);
	}
	//if(cv(2)) ll(data);
	var packagetype = data[0];
	var packagelength = data[1] + 2;
	if (data.length == packagelength){
		return ([data, []]);
	} else if (data.length > packagelength){
		var res = checkFullPackage(data.slice(packagelength + 1, data.length));
		return ([data.slice(0, packagelength).concat(res[0]), res[1]]);
	} else if (data.length < packagelength){
		return ([
			[], data
		]);
	} else {
		return ([
			[],
			[]
		]);
	}
} //return(data, part)
function encPackage(obj){
	if (cv(2)) ll(colors.FgGreen+"encoding:"+colors.FgCyan,obj,colors.Reset);
	var data = obj.data;
	switch (obj.packagetype){
	case 1:
		var array = ValueToBytearray(data.rufnummer, 4)
			.concat(ValueToBytearray(data.pin, 2))
			.concat(ValueToBytearray(data.port, 2));
		if(obj.datalength == null) obj.datalength = 8;
		break;
	case 2:
		data.ipaddresse = ip.isV4Format(data.ipaddresse)?data.ipaddresse:(ip.isV6Format(data.ipaddresse)?(ip.isV4Format(data.ipaddresse.split("::")[1])?data.ipaddresse.split("::")[1]:""):"");
		var iparr = data.ipaddresse==null?[]:data.ipaddresse.split(".");
		var numip = 0
		for (let i in iparr){
			numip += iparr[i] * Math.pow(2, (i * 8));
		}
		var array = ValueToBytearray(numip, 4);
		if(obj.datalength == null) obj.datalength = 4;
		break;
	case 3:
		var array = ValueToBytearray(data.rufnummer, 4)
			.concat(ValueToBytearray(data.version, 1));
		if(obj.datalength == null) obj.datalength = 5;
		break;
	case 4:
		var array = [];
		if(obj.datalength == null) obj.datalength = 0;
		break;
	case 5:
		var flags = data.gesperrt * 2;
		var iparr = data.ipaddresse==null?[]:data.ipaddresse.split(".");
		var numip = 0;
		for (let i in iparr){
			numip += iparr[i] * Math.pow(2, (i * 8));
		}

		if (data.extension == ""||data.extension==null){
			var ext = 0;
		} else if (data.extension == "0"){
			var ext = 110;
		} else if (data.extension == "00"){
			var ext = 100;
		} else if (data.extension.toString().length == 1){
			var ext = parseInt(data.extension) + 100;
		} else {
			var ext = parseInt(data.extension);
		}

		var array = ValueToBytearray(data.rufnummer, 4)
			.concat(ValueToBytearray(data.name, 40))
			.concat(ValueToBytearray(flags, 2))
			.concat(ValueToBytearray(data.typ, 1))
			.concat(ValueToBytearray(data.hostname, 40))
			.concat(ValueToBytearray(numip, 4))
			.concat(ValueToBytearray(parseInt(data.port), 2))
			.concat(ValueToBytearray(ext, 1))
			.concat(ValueToBytearray(parseInt(data.pin), 2))
			.concat(ValueToBytearray(parseInt(data.moddate) + 2208988800, 4));
		if(obj.datalength == null) obj.datalength = 100;
		break;
	case 6:
		var array = ValueToBytearray(data.version, 1)
			.concat(ValueToBytearray(config.get("serverPin"), 4));
		if(obj.datalength == null) obj.datalength = 5;
		break;
	case 7:
		var array = ValueToBytearray(data.version, 1)
			.concat(ValueToBytearray(config.get("serverPin"), 4));
		if(obj.datalength == null) obj.datalength = 5;
		break;
	case 8:
		var array = [];
		if(obj.datalength == null) obj.datalength = 0;
		break;
	case 9:
		var array = [];
		if(obj.datalength == null) obj.datalength = 0;
		break;
	case 10:
		// var array = ValueToBytearray(data.version,1)
		// .concat(ValueToBytearray(data.pattern,40));
		var array = ValueToBytearray(data.pattern, 40)
			.concat(ValueToBytearray(data.version, 1));
		if(obj.datalength == null) obj.datalength = 41;
		break;
	}
	var header = [obj.packagetype, array.length];
	if (array.length != obj.datalength){
		if (cv(0)) lle("Buffer had unexpected size:\n" + array.length + " != " + obj.datalength);
		return (Buffer.from([]));
	}
	if (cv(2)) ll(colors.FgGreen + "encoded:" + colors.FgCyan, Buffer.from(header.concat(array)), colors.Reset);
	return (Buffer.from(header.concat(array)));
}
function decPackage(packagetype, buffer){
	switch (packagetype){
	case 1:
		var data = {
			rufnummer: BytearrayToValue(buffer.slice(0, 4), "number"),
			pin: BytearrayToValue(buffer.slice(4, 6), "number"),
			port: BytearrayToValue(buffer.slice(6, 8), "number")
		};
		break;
	case 2:
		var data = {
			ipaddresse:BytearrayToValue(buffer.slice(0, 4), "ip")
		};
		break;
	case 3:
		var data = {
			rufnummer: BytearrayToValue(buffer.slice(0, 4), "number")
		};
		if (buffer.slice(4, 5).length > 0){
			data["version"] = BytearrayToValue(buffer.slice(4, 5), "number");
		} else {
			data["version"] = 1;
		}
		break;
	case 4:
		var data = {};
		break;
	case 5:

		var flags = buffer.slice(44, 46);

		var data = {
			rufnummer: BytearrayToValue(buffer.slice(0, 4), "number"),
			name: BytearrayToValue(buffer.slice(4, 44), "string"),
			gesperrt: flags[0] / 2,
			typ: BytearrayToValue(buffer.slice(46, 47), "number"),
			addresse: BytearrayToValue(buffer.slice(47, 87), "string"),
			ipaddresse: BytearrayToValue(buffer.slice(87, 91), "ip"),
			port: BytearrayToValue(buffer.slice(91, 93), "number"),
			durchwahl: BytearrayToValue(buffer.slice(93, 94), "number"),
			pin: BytearrayToValue(buffer.slice(94, 96), "number"),
			timestamp: BytearrayToValue(buffer.slice(96, 100), "number") - 2208988800
		};
		if (data.durchwahl == 0){
			data.durchwahl = null;
		} else if (data.durchwahl == 110){
			data.durchwahl = "0";
		} else if (data.durchwahl == 100){
			data.durchwahl = "00";
		} else if(data.durchwahl > 110){
			data.durchwahl = null;
		} else if (data.durchwahl > 100){
			data.durchwahl = (data.durchwahl - 100).toString();
		} else if (data.durchwahl < 10){
			data.durchwahl = "0" + data.durchwahl
		} else {
			data.durchwahl = data.durchwahl.toString();
		}

		break;
	case 6:
		var data = {
			version: BytearrayToValue(buffer.slice(0, 1), "number"),
			serverpin: BytearrayToValue(buffer.slice(1, 5), "number")
		};
		break;
	case 7:
		var data = {
			version: BytearrayToValue(buffer.slice(0, 1), "number"),
			serverpin: BytearrayToValue(buffer.slice(1, 5), "number")
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
			version: BytearrayToValue(buffer.slice(0, 1), "number"),
			pattern: BytearrayToValue(buffer.slice(1, 41), "string")
			//pattern:BytearrayToValue(buffer.slice(0,40),"string"),
			//version:BytearrayToValue(buffer.slice(40,41),"number")
		};
		break;
	default:
		if(cv(1)) lle("invalid/unsupported packagetype: " + packagetype);
		data = false;
		break;
	}
	return (data);
}
function decData(buffer){
	if (cv(2)) ll(colors.FgGreen + "decoding:", colors.FgCyan, Buffer.from(buffer), colors.Reset);
	var out = [];
  for(var typepos = 0;typepos < buffer.length - 1;typepos += datalength + 2){
		var packagetype = parseInt(buffer[typepos], 10);
		var datalength = parseInt(buffer[typepos + 1], 10);

		if(PackageSizes[packagetype] != datalength){
			ll(`size missmatch: ${PackageSizes[packagetype]} != ${datalength}`);
			continue;
		}

		var blockdata = [];
		for (let i = 0; i < datalength; i++){
			blockdata[i] = buffer[typepos + 2 + i];
		}
		var data = decPackage(packagetype, blockdata);
		if (data){
			out.push({
				packagetype: packagetype,
				datalength: datalength,
				data: data
			});
		} else {
			if(cv(1)) lle("error, no data");
		}
	}
	if (cv(2)) ll(colors.FgGreen + "decoded:", colors.FgCyan, out, colors.Reset);
	return(out);
}

function BytearrayToValue(arr, type){
	if (type === "number"){
		var num = 0;
		for (let i = arr.length - 1; i >= 0; i--){
			num *= 256;
			num += arr[i];
		}
		return (num);
	}else if (type === "string"){
		var str = "";
		for (let i = 0; i < arr.length; i++){
			if (arr[i] != 0){
				str += String.fromCharCode(arr[i]);
			} else {
				break;
			}
		}
		return (str.replace(/(\u0000)/g, ""));
	}else if(type === "ip"){
		let numip = BytearrayToValue(arr, "number");
		if(numip == 0){
			return(null);
		}else{
			let str = "";
			for(let i=0;i<4;i++){
				str += ((numip >> (8*i)) & 255)+(i==3?"":".")
			}
			return(str);
		}
	}
}
function ValueToBytearray(value, size){
	//if(cv(2)) ll(value);
	var array = [];
	if (typeof value === "string"){
		for (let i = 0; i < value.length; i++){
			array[i] = value.charCodeAt(i);
		}
	} else if (typeof value === "number"){
		while (value > 0){
			array[array.length] = value % 256;
			value = Math.floor(value / 256);
		}
	}
	if (array.length > size || array.length == undefined){
		if (cv(0)) lle("Value " + value + " turned into a bigger than expecte Bytearray!\n" + array.length + " > " + size);
	}
	while (array.length < size){
		array[array.length] = 0;
	}
	return (array);
}


function connect(pool, transporter, after, options, handles, callback){
	let onEnd = function(){
		//if (cv(2)) ll(`${colors.FgYellow}calling onEnd handler for server ${util.inspect(options)}${colors.Reset}`);
		try{
			after();
		}catch(e){}
	}
	if (cv(1)) ll(colors.FgGreen+"trying to connect to:" + colors.FgCyan, options, colors.Reset);
	try {
		let serverkey = options.host+":"+options.port;
		var socket = new net.Socket();
		var cnum = -1;
		let maxKey = Math.max.apply(Math,Object.keys(connections));
		if(!isFinite(maxKey)) maxKey=0;
		for (let i = 0; i <= maxKey+1; i++){
			if (!connections.hasOwnProperty(i)){
				cnum = i;
				break;
			}
		}
		connections[cnum] = {
			connection: socket,
			readbuffer: [],
			state: STANDBY,
			packages: [],
			handling: false
		};
		socket.setTimeout(config.get("connectionTimeout"));
		socket.on('timeout', function (){
			try {
				if(cv(1)) lle(colors.FgRed+"server: "+colors.FgCyan,options,colors.FgRed+" timed out"+colors.Reset);
				// socket.emit("end");
				// socket.emit("error",new Error("timeout"));
				socket.end();
			}catch(e) {

			}finally{
				if(typeof onEnd === "function") onEnd();
			}
		});
		socket.on('data', function (data){
			if(cv(2)){
				ll(colors.FgGreen+"recieved data:"+colors.Reset);
				ll(colors.FgCyan,data,colors.Reset);
				ll(colors.FgCyan,data.toString().replace(/\u0000/g,"").replace(/[^ -~]/g," "),colors.Reset);
			}
			try {
				//if(cv(2)) ll(colors.FgCyan,data,"\n"+colors.FgYellow,data.toString(),colors.Reset);
				//if(cv(2)) ll(connections.readbuffer);
				var res = checkFullPackage(data, connections.readbuffer);
				//if(cv(2)) ll(res);
				if (res[1]){
					connections[cnum].readbuffer = res[1];
				}
				if (res[0]){
					if (typeof connections[cnum].packages != "object") connections[cnum].packages = [];
					connections[cnum].packages = connections[cnum].packages.concat(decData(res[0]));
					let timeout = function (){
						if (cv(2)) ll(colors.FgGreen + "handling: " + colors.FgCyan + connections[cnum].handling + colors.Reset);
						if (connections[cnum].handling === false){
							connections[cnum].handling = true;
							if (connections[cnum].timeout != null){
								clearTimeout(connections[cnum].timeout);
								connections[cnum].timeout = null;
							}
							async.eachOfSeries(connections[cnum].packages, function (pkg, key, cb){
								if ((cv(1) && (Object.keys(connections[cnum].packages).length > 1)) || cv(2)) ll(colors.FgGreen + "handling package " + colors.FgCyan + (key + 1) + "/" + Object.keys(connections[cnum].packages).length + colors.Reset);
								handlePackage(pkg, cnum, pool, socket, handles, function (){
									connections[cnum].packages.splice(key, 1);
									cb();
								});
							}, function (){
								connections[cnum].handling = false;
							});
						} else {
							if (connections[cnum].timeout == null){
								connections[cnum].timeout = setTimeout(timeout, 10);
							}
						}
					}
					timeout();
				}
				/*if(res[0]){
					handlePackage(decData(res[0]),cnum,pool,socket,handles);
				}*/
			}catch(e) {

			}
		});
		socket.on('error', function (error){
			if(cv(3)) lle(error);
			try {
				// if(error.code == "ECONNREFUSED"||error.code == "EHOSTUNREACH"){
				if(error.code != "ECONNRESET"){
					if(cv(1)) ll(`${colors.FgRed}server ${colors.FgCyan+util.inspect(options)+colors.FgRed} had an error${colors.Reset}`)
					/*let exists = false;
					for(let k in serverErrors){
						if(k == serverkey){
							exists = true;
							break;
						}
					}*/
					let exists = Object.keys(serverErrors).findIndex(function(k){return(k==serverkey)})>-1;
					if(exists){
						serverErrors[serverkey].errors.push({error:error,timeStamp:Date.now()});
						serverErrors[serverkey].errorCounter++;
					}else{
						serverErrors[serverkey] = {
							errors: [{error: error,timeStamp:Date.now()}],
							errorCounter: 1
						}
					}
					if(config.get("warnAtErrorCounts").indexOf(serverErrors[serverkey].errorCounter)>-1){
						sendEmail(transporter,"ServerError",{
							"[server]":serverkey,
							"[errorCounter]":serverErrors[serverkey].errorCounter,
	            "[date]":new Date().toLocaleString(),
              "[timeZone]":new Date().getTimezone()
	          },function(){});
					}
					if (cv(0)) lle(colors.FgRed+"server "+colors.FgCyan,options,colors.FgRed+" could not be reached; errorCounter:"+colors.FgCyan,serverErrors[serverkey].errorCounter,colors.Reset);
				}
				// } else {
				// 	if (cv(0)) lle(colors.FgRed, error, colors.Reset);
				// }
			} catch (e){
				if(cv(2)) lle(e);
			} finally {
				if (connections[cnum]&&connections[cnum].connection = socket){
          //setTimeout(function(cnum){delete connections[cnum];},1000,cnum);
          setTimeout(function(cnum){
					  delete connections[cnum];
					  ll(`${colors.FgGreen}deleted connections[${cnum}]${colors.Reset}`);
					},1000,cnum);
        }
				if(typeof onEnd === "function") onEnd();
			}
		});
		socket.on('end', function (){
			ll(colors.FgYellow+"The connection to server "+colors.FgCyan+cnum+colors.FgYellow+" ended!"+colors.Reset);
			try {
				if (connections[cnum]&&connections[cnum].connection = socket){
          //setTimeout(function(cnum){delete connections[cnum];},1000,cnum);
          setTimeout(function(cnum){
					  delete connections[cnum];
					  ll(`${colors.FgGreen}deleted connections[${cnum}]${colors.Reset}`);
					},1000,cnum);
        }
			} catch (e){
				//if(cv(2)) lle(e);
			} finally {
				if(typeof onEnd === "function") onEnd();
			}
		});
		socket.connect(options, function (connection){
			if (cv(1)) ll(colors.FgGreen+"connected to:" + colors.FgCyan, options,colors.FgGreen+"as server "+colors.FgCyan+cnum, colors.Reset);
			if(serverErrors[serverkey]&&(serverErrors[serverkey].errorCounter>0)){
				serverErrors[serverkey].errorCounter=0;
				if (cv(2)) ll(colors.FgGreen+"reset error counter for: "+colors.FgCyan,options,colors.Reset);
			}
			if(typeof callback === "function") callback(socket, cnum);
		});
	} catch (e){
		if (cv(2)) lle(e);
		if(typeof onEnd === "function") onEnd();
	}
}
function ascii(data, connection, pool){
	var number = "";
	for (let i = 0; i < data.length; i++){
		//if(cv(2)) ll(String.fromCharCode(data[i]));
		if (/([0-9])/.test(String.fromCharCode(data[i]))){
			number += String.fromCharCode(data[i]);
		}
	}
	if (number != ""){
		number = parseInt(number);
	}
	if (!isNaN(number) && number != ""){
		if (cv(1)) ll(colors.FgGreen + "starting lookup for: " + colors.FgCyan + number + colors.Reset);
		SqlQuery(pool, "SELECT * FROM teilnehmer WHERE rufnummer=" + number + ";", function (result){

			if((!result)||result.length == 0 || result.gesperrt == 1 || result.typ == 0){
				var send = "fail\r\n";
				send += number + "\r\n";
				send += "unknown\r\n";
				send += "+++\r\n";
				connection.write(send, function (){
					if (cv(1)){
						var m = colors.FgRed + "Entry not found/visible";
					}
					if (cv(2)){
						m += ", sent:\n" + colors.FgCyan + send + colors.Reset;
					} else {
						m += colors.Reset;
					}
					if (cv(1)) ll(m);
				});
			}else{
				var send = "ok\r\n";
				send += result[0]["rufnummer"] + "\r\n";
				send += result[0]["name"] + "\r\n";
				send += result[0]["typ"] + "\r\n";
				if ((result[0]["typ"] == 2) || (result[0]["typ"] == 4) || (result[0]["typ"] == 5)){
					send += result[0]["ipaddresse"] + "\r\n";
				} else if ((result[0]["typ"] == 1) || (result[0]["typ"] == 3)){
					send += result[0]["hostname"] + "\r\n";
				} else if (result[0]["typ"] == 6){
					send += result[0]["hostname"] + "\r\n";
				}
				send += result[0]["port"] + "\r\n";
				send += (result[0]["extension"]||"-") + "\r\n";
				send += "+++\r\n";
				connection.write(send, function (){
					if (cv(1)) var m = colors.FgGreen + "Entry found";
					if (cv(2)){
						m += ", sent:\n" + colors.FgYellow + send + colors.Reset;
					} else {
						m += colors.Reset;
					}
					if (cv(1)) ll(m);
				});
			}
		});
	}
}

function cv(level){ //check verbosity
	return (level <= config.get("loggingVerbosity"));
}
function SqlQuery(sqlPool, query, callback){
	if (cv(2)||(/(update)|(insert)/gi.test(query)&&cv(1))) llo(1,colors.BgLightBlue+colors.FgBlack+query+colors.Reset);
	sqlPool.query(query, function (err, res){
		try {
			if (cv(3)) ll("number of open connections: "+sqlPool._allConnections.length);
		} catch (e){
			if (cv(2)) ll("not a pool");
		}
		if (err){
			if (cv(0)) llo(1,colors.FgRed,err,colors.Reset);
			if (typeof callback === "function") callback(false);
		} else {
			if (typeof callback === "function") callback(res);
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

function sendEmail(transporter,messageName,values,callback){
  let message = config.get("eMail").messages[messageName];
  if(!message){
    callback();
  }else{
    let mailOptions = {
        from: config.get("eMail").from,
        to: config.get("eMail").to,
        subject: message.subject
    };
  	let content = {};
    if(message.text){
      content.text = message.text;
    }else if(message.html){
      content.html = message.html;
    }else{
      mailOptions.text = "configuration error in config.json";
    }
  	let type = Object.keys(content)[0];
  	mailOptions[type] = content[type];
  	for(let k in values){
  		mailOptions[type] = mailOptions[type].replace(new RegExp(k.replace(/\[/g,"\\[").replace(/\]/g,"\\]"),"g"),values[k]);
  	}
    if(cv(2)){
  		ll("sending mail:\n",mailOptions,"\nto server",transporter.options.host);
  	}else if(cv(1)){
  		ll(`${colors.FgGreen}sending email of type ${colors.FgCyan+messageName+colors.Reset}`);
  	}
    transporter.sendMail(mailOptions, function(error, info){
        if (error){
          if(cv(2)) lle(error);
  				if(typeof callback === "function") callback();
        }else{
  	      if(cv(1)) ll('Message sent:', info.messageId);
  	      if(config.get("eMail").useTestAccount) ll('Preview URL:', nodemailer.getTestMessageUrl(info));
  	      if(typeof callback === "function") callback();
  			}
    });
  }
}


//functions
module.exports.checkFullPackage = checkFullPackage;
module.exports.BytearrayToValue = BytearrayToValue;
module.exports.ValueToBytearray = ValueToBytearray;
module.exports.TimeoutWrapper 	= TimeoutWrapper;
module.exports.handlePackage 		= handlePackage;
module.exports.decPackage 			= decPackage;
module.exports.encPackage 			= encPackage;
module.exports.sendEmail 				= sendEmail;
module.exports.SqlQuery 				= SqlQuery;
module.exports.decData 					= decData;
module.exports.connect 					= connect;
module.exports.ascii 						= ascii;
module.exports.cv 							= cv;

//variables
module.exports.connections			= connections;
module.exports.timeouts					= timeouts;
module.exports.serverErrors					= serverErrors;

//constants
module.exports.PackageNames 		= PackageNames;
module.exports.stateNames   		= stateNames;
module.exports.states       		= {
	STANDBY: STANDBY,
	RESPONDING: RESPONDING,
	FULLQUERY: FULLQUERY,
	LOGIN: LOGIN
};
