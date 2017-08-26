const net = require('net');
var server = net.createServer(function(connection) {
  connection.on('data',(data)=>{
    console.log(data[0],data);
    if(data[0]==5||data[0]==7){
      /*setTimeout(()=>{*/connection.write(Buffer.from([0x08,0x00]));//},1000);
    }else if(data[0]==9){
      connection.end();
    }
  });
  connection.on('error',(error)=>{
    console.log(error);
  });
});
server.listen(10001, function() {
  console.log('server is listening');
});
