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
			console.log(FgCyan,data,"\n",data.toString(),FgWhite);
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
		if(obj.packagetype==0xff){
			throw FgRed+Buffer.from(obj.data).toString();
		}
		try{
			if(handles[obj.packagetype]!=undefined){
				handles[obj.packagetype][connections[cnum]["state"]](obj,cnum,dbcon,connection);
			}else{
				FgRed+"packagetype ["+FgCyan+obj.packagetype+FgRed+" ] not supported in state ["+FgCyan+connections[cnum]["state"]+FgRed+"]"+FgWhite
			}
		}catch(e){
			console.log(FgRed,e,FgWhite);
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
			.concat(deConcatValue(data.hostname,40))
			.concat(deConcatValue(numip,4))
			.concat(deConcatValue(parseInt(data.port),2))
			.concat(deConcatValue(parseInt(data.extention),1))
			.concat(deConcatValue(parseInt(data.pin),2))
			.concat(deConcatValue(parseInt(data.moddate)+2208988800,4));
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
	console.log(value);
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
		throw	"Value "+value+" turned into a bigger than expecte Bytearray!\n"+array.length+" > "+size;
	}
	while(array.length<size){
		array[array.length] = 0;
	}
	return(array);
}

module.exports=
connect.toString()+
handlePacket.toString()+
encPacket.toString()+
decPacket.toString()+
decData.toString()+
concatByteArray.toString()+
deConcatValue.toString();
