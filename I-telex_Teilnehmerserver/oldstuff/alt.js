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
		console.log(FgRed,e,FgWhite);
		//throw err;
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
			var iparr = data.ipadresse.split(".");
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
			var iparr = data.ipadresse.split(".");
			var numip=0
			for(i in iparr){
				numip += iparr[i]*Math.pow(2,(i*8));
			}
			var array = deConcatValue(data.rufnummer,4)
			.concat(deConcatValue(data.name,40))
			.concat(deConcatValue(data.flags,2))
			.concat(deConcatValue(data.typ,1))
			.concat(deConcatValue(data.addresse,40))
			.concat(deConcatValue(numip,4))
			.concat(deConcatValue(parseInt(data.port),2))
			.concat(deConcatValue(data.durchwahl,1))
			.concat(deConcatValue(parseInt(data.pin,2)))
			.concat(deConcatValue(data.timestamp+2209032000,4));
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
	console.log(FgBlue,Buffer.from(header.concat(array)),FgWhite);
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
			var intip = concatByteArray(buffer.slice(87,91),"number");
			var a = (intip>>0)&0xff;
			var b = (intip>>8)&0xff;
			var c = (intip>>16)&0xff;
			var d = (intip>>24)&0xff;
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
				timestamp:concatByteArray(buffer.slice(96,100),"number")-2209032000
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
		connections[cnum] = {state:STANDBY};
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
		var rufnummer = concatByteArray(blockdata.slice(0,4));
		var version = concatByteArray(blockdata.slice(4,5));
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
		var version = concatByteArray(blockdata.slice(0,1));
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
			var pin = concatByteArray(blockdata.slice(1,5));
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
		var pin = concatByteArray(blockdata.slice(1,5));
		console.log("pin: "+pin);
		if(pin == serverpin){
			connection.write(Buffer.from([0x08,0x00]));
			state = "Login";
		}
		break;
	case 5:
		var pin = concatByteArray(blockdata.slice(94,96));
		if(pin == serverpin){
			switch(state){
				default://////////////////////////////////////////TODO
					console.log(blockdata);
					var rufnummer = concatByteArray(blockdata.slice(0,4));
					var name = concatByteArray(blockdata.slice(4,44));
					var typ = concatByteArray(blockdata.slice(46,47));
					var hostname = concatByteArray(blockdata.slice(47,87));
					var ipaddresse = concatByteArray(blockdata.slice(87,91));
					var port = concatByteArray(blockdata.slice(91,93));
					var extention = concatByteArray(blockdata.slice(93,94));
					var gesperrt = 0;//TODO 46,44
					var moddate = concatByteArray(blockdata.slice(96,100));
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
