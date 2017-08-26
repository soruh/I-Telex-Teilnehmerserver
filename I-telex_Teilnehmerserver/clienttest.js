var net = require('net');
var client = net.connect({port: 11811}, function() {
   console.log('connected to server!');
});
client.on('data', function(data) {
  console.log(data.toString());
  if(data.toString().split("")[0] != String.fromCharCode(0x09)){
    client.write(Buffer.from([0x08,0x00]));
  }
});
client.on('end', function() {
   console.log('disconnected from server');
});
client.on('error', function(err) {
   console.log(err);
});
//client.write(Buffer.from([0x03,0x05,0x16,0xAA,0x34,0x00,0x01]));
//client.write(Buffer.from([0x03,0x04,0x16,0xAA,0x34,0x00]));
//client.write(Buffer.from([0x01,0x08,0x16,0xAA,0x34,0x00,0x34,0x12,0x86,0x00,/**/0x03,0x05,0x33,0x16,0x00,0x00,0x01,/**/0x0A,0x29,0x01,0x54,0x31,0x30,0x30,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]),"binary");
//client.write(Buffer.from([0x01,0x08,0x16,0xAA,0x34,0x00,0x34,0x12,0x86,0x00]);
//client.write(Buffer.from([0x03,0x05,0x33,0x16,0x00,0x00,0x01]),"binary");
////var searchstr = "4 7";
////client.write(Buffer.from([0x0A,0x29,0x01].concat(StringToHex(searchstr)).concat(nulsarr(40-StringToHex(searchstr).length))),"binary");
//client.write(Buffer.from([0x06,0x05,0x01,0x16,0xAA,0x34,0x00]));
//client.write(Buffer.from([0x0A,0x29,0x01,0x54,0x31,0x30,0x30,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]));
client.write(Buffer.from([0x07,0x05,0x01,0x16,0xAA,0x34,0x00]));
