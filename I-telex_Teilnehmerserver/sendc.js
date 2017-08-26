function SendChanges(){
	var con = mysql.createConnection({
		host: "localhost",
		user: "telefonbuch",
		password: "amesads"
	});
	con.connect(function(err){
		if(err){
			console.log(FgRed+"Connection to database threw an error:\n",err,FgWhite);
			return;
		}
		console.log(FgGreen+"Connected to database for server syncronisation!"+FgWhite);
		con.query("SELECT * FROM telefonbuch.teilnehmer WHERE changed="+1, function(err, result1){
			con.query("UPDATE telefonbuch.teilnehmer SET changed=0;", function(err, var result3) {
				console.log(FgGreen+result3.changedRows+" rows were updated!"+FgWhite);
			});
			if(result1.length > 0){
				console.log("rows to update: "+result1.length);
				con.query("SELECT * FROM telefonbuch.servers", function (err, results2) {
					for(k=0;k<results2.length;k++){
						console.log(FgRed+"could not connect to:\n",result2[k],"\n",e,FgWhite);
						for(n=0;n<result1.length;n++){
							con.query("DELETE * FROM telefonbuch.queue WHERE server="result2[k].uid+"AND WHERE message="+result1[n],(err, var result3)=>{
								con.query("INSERT INTO telefonbuch.queue (server,message,timestamp) VALUES 	("+result2[k].uid+","+result1[n].uid+","+new Date().getTime()+")");
							});
						}
					}
				});
			}else{
				console.log(FgYellow+"no rows to update"+FgWhite);
			}
			console.log(FgYellow+"Disconnected from server database!"+FgWhite);
		});
	}
}