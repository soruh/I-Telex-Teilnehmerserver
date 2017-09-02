/*
var ip = "84.179.128.193"
var iparr = ip.split(".");
var numip=0
for(i in iparr){
	numip += iparr[i]*Math.pow(2,(i*8));
}

var a = (intip>>0)&0xff;
var b = (intip>>8)&0xff;
var c = (intip>>16)&0xff;
var d = (intip>>24)&0xff;
var ipaddresse = a+"."+b+"."+c+"."+d;
console.log(ip,ipaddresse);
*/
var functions=require("./functions.js");
eval(functions.connect);
eval(functions.handlePacket);
eval(functions.encPacket);
eval(functions.decPacket);
eval(functions.decData);
eval(functions.concatByteArray);
eval(functions.deConcatValue);

console.log(deConcatValue("d",2));
