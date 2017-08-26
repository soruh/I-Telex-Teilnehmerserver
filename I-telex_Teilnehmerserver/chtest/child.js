console.log('child proc');
var stdin = process.stdin;
//console.log(stdin);
stdin.on('data',(data)=>{
	console.log("stdin: "+data);
});
/*
var d = new Date().getTime()+2000;
while(d>new Date().getTime()){
	;
}*/
//setTimeout(()=>{throw "error";},1000);
