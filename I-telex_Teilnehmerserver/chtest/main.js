const cp=require('child_process');
function StartChild(){
	child=cp.spawn('node',["child.js"]);
	child.on('exit',(ec)=>{
		console.log("child process exited with code "+ec);
		StartChild();
	});
	child.stdout.on('data',(data)=>{
		console.log('qwd stdout: '+data);
	});
	child.stderr.on('data',(data)=>{
		console.log('qwd stderr: '+data);
	});
}
StartChild();
setTimeout(()=>{child.stdin.write("update!");},3000);
