var mysql = require('mysql');
function test(){
  console.log("hallo");
}
var sqlcon = mysql.createConnection({
  host: "localhost",
  user: "telefonbuch",
  password: "amesads"
});
sqlcon.query("UPDATE telefonbuch.teilnehmer set moddate="+Math.round(new Date().getTime()/1000),(err,res)=>{
  console.log(err,res);
});
