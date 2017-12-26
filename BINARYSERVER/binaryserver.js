if(module.parent!=null){var mod = module;var load_order = [module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev = [];for(i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[37m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[37m":"\x1b[33m"+load_order[i]+"\x1b[37m");}console.log("loaded: "+load_order_rev.join(" --> "));}
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));

const ll = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js")).ll;
const net = require('net');
const mysql = require('mysql');
const async = require('async');
const cp = require('child_process');
const fs = require('fs');
const ITelexCom = require(path.join(PWD,"/BINARYSERVER/ITelexCom.js"));
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');

/*<PKGTYPES>
Client_update: 1
Address_confirm: 2
Peer_query: 3
Peer_not_found: 4
Peer_reply: 5
Sync_FullQuery: 6
Sync_Login: 7
Acknowledge: 8
End_of_List: 9
Peer_search: 10
</PKGTYPES>*/
var handles = {};	//functions for handeling packages
for(i = 1;i <= 10;i++){handles[i] = {};}
//handes[packagetype][state of this connection]
//handles[2][ITelexCom.states.STANDBY] = (obj,cnum,pool,connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,pool,connection)=>{}; NOT USED
handles[1][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	var number = obj.data.rufnummer;
	var pin = obj.data.pin;
	var port = obj.data.port;
	ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE rufnummer = "+number,function(result_a){
		if(result_a&&(result_a.length>0)){
			var res = result_a[0];
			if(ITelexCom.cv(2)) ll(res);
			if(res.pin == pin){
				ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET port = '"+port+"', ipaddresse = '"+connection.remoteAddress.replace(/^.*:/,'')+"' WHERE rufnummer = "+number+";",function(result_b){
					ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE rufnummer = "+number+";",function(result_c){
						try{
							connection.write(ITelexCom.encPackage({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary",function(){if(typeof cb === "function") cb();});
						}catch(e){
							if(ITelexCom.cv(0)) ll(colors.FgRed,e,colors.Reset);
							if(typeof cb === "function") cb();
						}
					});
				});
			}else if(res.pin != pin){
				connection.end();
				if(typeof cb === "function") cb();
			}
		}else{
			ITelexCom.SqlQuery(pool,"INSERT INTO teilnehmer (name,moddate,typ,rufnummer,port,pin,ipaddresse,gesperrt) VALUES ('?','"+Math.floor(new Date().getTime()/1000)+"','5','"+number+"','"+port+"','"+pin+"','"+connection.remoteAddress.replace(/^.*:/,'')+"','1');",function(result_b){
				ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE rufnummer = "+number+";",function(result_c){
					if(result_c.length>0){
						try{
							connection.write(ITelexCom.encPackage({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary",function(){if(typeof cb === "function") cb();});
						}catch(e){
							if(ITelexCom.cv(0)) ll(colors.FgRed,e,colors.Reset);
							if(typeof cb === "function") cb();
						}
						//connection.end();
					}else{
						ll("no such entry");
						//connection.end();
						if(typeof cb === "function") cb();
					}
				});
			});
		}
	});
};
handles[3][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	if(obj.data.version == 1){
		var rufnummer = obj.data.rufnummer;
		ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE rufnummer = "+rufnummer+";",function(result){
			if(ITelexCom.cv(2)) ll(colors.FgCyan,result,colors.Reset);
			if((result[0] != undefined)&&(result != [])&&(obj.gesperrt != 1)&&(obj.typ != 0)){
				result[0].pin = 0;
				connection.write(ITelexCom.encPackage({packagetype:5,datalength:100,data:result[0]}),function(){if(typeof cb === "function") cb();});
			}else{
				connection.write(ITelexCom.encPackage({packagetype:4,datalength:0}),function(){if(typeof cb === "function") cb();});
			}
		});
	}else{
		if(ITelexCom.cv(0)) ll(colors.FgRed,"unsupported package version, sending '0x04' package",colors.Reset);
		connection.write(ITelexCom.encPackage({packagetype:4,datalength:0}),function(){if(typeof cb === "function") cb();});
	}
};
handles[5][ITelexCom.states.FULLQUERY] = function(obj,cnum,pool,connection,handles,cb){
	ITelexCom.SqlQuery(pool,"SELECT * from teilnehmer WHERE rufnummer = "+mysql.escape(obj.data.rufnummer)+";",function(res){
		var o = {
			rufnummer:obj.data.rufnummer,
			name:obj.data.name,
			typ:obj.data.typ,
			hostname:obj.data.addresse,
			ipaddresse:obj.data.ipaddresse,
			port:obj.data.port,
			extension:obj.data.durchwahl,
			pin:obj.data.pin,
			gesperrt:obj.data.gesperrt,
			moddate:obj.data.timestamp,
			changed:0
		};
		if(res.length == 1){
			if(obj.data.timestamp > res.moddate){
				if(ITelexCom.cv(0)) ll(obj.data.timestamp+" > "+res.moddate);
				//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET rufnummer = "+mysql.escape(obj.data.rufnummer)+",name = "+mysql.escape(obj.data.name)+",typ = "+mysql.escape(obj.data.typ)+",hostname = "+mysql.escape(obj.data.addresse)+",ipaddresse = "+mysql.escape(obj.data.ipaddresse)+",port = "+mysql.escape(obj.data.port)+",extension = "+mysql.escape(obj.data.durchwahl)+",pin = "+mysql.escape(obj.data.pin)+",gesperrt = "+mysql.escape(obj.data.flags)+",moddate = "+mysql.escape(obj.data.timestamp)+",changed = "+mysql.escape(0)+"WHERE rufnummer = "+mysql.escape(obj.data.rufnummer)+";",function(res2){
				//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET rufnummer = "+mysql.escape(obj.data.rufnummer)+",name = "+(mysql.escape(obj.data.name)||"")+",typ = "+mysql.escape(obj.data.typ)+",hostname = "+(mysql.escape(obj.data.addresse)||"")+",ipaddresse = "+(mysql.escape(obj.data.ipaddresse)||"")+",port = "+mysql.escape(obj.data.port)+",extension = "+(mysql.escape(obj.data.durchwahl)||"")+",pin = "+mysql.escape(obj.data.pin)+",gesperrt = "+(mysql.escape(obj.data.gesperrt)||"")+",moddate = "+mysql.escape(obj.data.timestamp)+",changed = "+0+" WHERE rufnummer = "+obj.data.rufnummer+";",function(res2){
				var sets = ""
				for(k in o){
					if(o[k]!=undefined){
						sets+=k+" = "+mysql.escape(o[k])+", ";
					}
				}
				var q = "UPDATE teilnehmer SET "+sets.substring(0, sets.length - 2)+" WHERE rufnummer = "+obj.data.rufnummer+";";
				ITelexCom.SqlQuery(pool,q,function(res2){
					connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
				});
			}else{
				connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
			}
		}else if(res.length == 0){
			//ITelexCom.SqlQuery(pool,"INSERT INTO teilnehmer(rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed)VALUES("+mysql.escape(obj.data.rufnummer)+","+mysql.escape(obj.data.name)+","+mysql.escape(obj.data.typ)+","+mysql.escape(obj.data.addresse)+","+mysql.escape(obj.data.ipaddresse)+","+mysql.escape(obj.data.port)+","+mysql.escape(obj.data.durchwahl)+","+mysql.escape(obj.data.pin)+","+mysql.escape(obj.data.flags)+","+mysql.escape(obj.data.timestamp)+","+mysql.escape(0)+");",function(res2){
			//var q = "INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed) VALUES ("+mysql.escape(obj.data.rufnummer)+","+(mysql.escape(obj.data.name)||"")+","+mysql.escape(obj.data.typ)+","+(mysql.escape(obj.data.addresse)||"")+","+(mysql.escape(obj.data.ipaddresse)||"")+","+mysql.escape(obj.data.port)+","+(mysql.escape(obj.data.durchwahl)||"")+","+mysql.escape(obj.data.pin)+","+(mysql.escape(obj.data.gesperrt)||"")+","+mysql.escape(obj.data.timestamp)+","+mysql.escape(0)+");"
			var names = "";
			var values = "";
			for(k in o){
				if(o[k]!=undefined){
					names+=k+", ";
					values+=mysql.escape(o[k])+", ";
				}
			}
			var q = "INSERT INTO teilnehmer("+names.substring(0, names.length - 2)+") VALUES ("+values.substring(0, values.length - 2)+");";
			ITelexCom.SqlQuery(pool,q,function(res2){
				connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
			});
		}else{
			if(ITelexCom.cv(0)) ll('Something really strange happened, the "rufnummer" field should be unique!');
			if(typeof cb === "function") cb();
		}
	});
};
handles[5][ITelexCom.states.LOGIN] = function(obj,cnum,pool,connection,handles,cb){
		ITelexCom.SqlQuery(pool,"SELECT * from teilnehmer WHERE rufnummer = "+obj.data.rufnummer+";",function(res){
			if(ITelexCom.cv(2)) ll(res);
			var o = {
				rufnummer:obj.data.rufnummer,
				name:obj.data.name,
				typ:obj.data.typ,
				hostname:obj.data.addresse,
				ipaddresse:obj.data.ipaddresse,
				port:obj.data.port,
				extension:obj.data.durchwahl,
				pin:obj.data.pin,
				gesperrt:obj.data.gesperrt,
				moddate:obj.data.timestamp,
				changed:0
			};
			if(res.length == 1){
				var res=res[0];
				if(obj.data.timestamp > res.moddate){
					//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET rufnummer = "+mysql.escape(obj.data.rufnummer)+",name = "+(mysql.escape(obj.data.name)||"")+",typ = "+mysql.escape(obj.data.typ)+",hostname = "+(mysql.escape(obj.data.addresse)||"")+",ipaddresse = "+(mysql.escape(obj.data.ipaddresse)||"")+",port = "+mysql.escape(obj.data.port)+",extension = "+(mysql.escape(obj.data.durchwahl)||"")+",pin = "+mysql.escape(obj.data.pin)+",gesperrt = "+(mysql.escape(obj.data.gesperrt)||"")+",moddate = "+mysql.escape(obj.data.timestamp)+",changed = "+0+" WHERE rufnummer = "+obj.data.rufnummer+";",function(res2){
					var sets = ""
					for(k in o){
						if(o[k]!=undefined){
							sets+=k+" = "+mysql.escape(o[k])+", ";
						}
					}
					var q = "UPDATE teilnehmer SET "+sets.substring(0, sets.length - 2)+" WHERE rufnummer = "+obj.data.rufnummer+";";
					ITelexCom.SqlQuery(pool,q,function(res2){
						connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
					});
				}else{
					if(ITelexCom.cv(2)) ll(colors.FgRed+"recieved entry is "+colors.FgCyan+(parseInt(res.moddate)-parseInt(obj.data.timestamp))+colors.FgRed+" seconds older and was ignored"+colors.Reset);
					connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
				}
			}else if(res.length == 0){
				//var q = "INSERT INTO teilnehmer (rufnummer,name,typ,hostname,ipaddresse,port,extension,pin,gesperrt,moddate,changed) VALUES ("+mysql.escape(obj.data.rufnummer)+","+(mysql.escape(obj.data.name)||"")+","+mysql.escape(obj.data.typ)+","+(mysql.escape(obj.data.addresse)||"")+","+(mysql.escape(obj.data.ipaddresse)||"")+","+mysql.escape(obj.data.port)+","+(mysql.escape(obj.data.durchwahl)||"")+","+mysql.escape(obj.data.pin)+","+(mysql.escape(obj.data.gesperrt)||"")+","+mysql.escape(obj.data.timestamp)+","+mysql.escape(0)+");"
				var names = "";
				var values = "";
				for(k in o){
					if(o[k]!=undefined){
						names+=k+", ";
						values+=mysql.escape(o[k])+", ";
					}
				}
				var q = "INSERT INTO teilnehmer("+names.substring(0, names.length - 2)+") VALUES ("+values.substring(0, values.length - 2)+");";
				ITelexCom.SqlQuery(pool,q,function(res2){
					connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
				});
			}else{
				if(ITelexCom.cv(0)) ll('Something really strange happened, the "rufnummer" field should be unique!');
				if(typeof cb === "function") cb();
			}
		});
};//TODO: look for difference in FULLQUERY & LOGIN
handles[6][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	if(obj.data.serverpin == config.get("SERVERPIN")){
		if(ITelexCom.cv(1)) ll(colors.FgGreen,"serverpin is correct!",colors.Reset);
		ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer",function(result){
			if((result[0] != undefined)&&(result != [])){
				ITelexCom.connections[cnum].writebuffer = result;
				ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
				ITelexCom.handlePackage({packagetype:8,datalength:0,data:{}},cnum,pool,connection,handles,cb);
			}else{
				connection.write(ITelexCom.encPackage({packagetype:9,datalength:0}),function(){if(typeof cb === "function") cb();});
			}
		});
	}else{
		if(ITelexCom.cv(1)){
			ll(colors.FgRed+"serverpin is incorrect!"+colors.FgCyan+obj.data.serverpin+colors.FgRed+" != "+colors.FgCyan+config.get("SERVERPIN")+colors.FgRed+"ending connection!"+colors.Reset);//TODO: remove pin logging
			connection.end();
		}
		if(typeof cb === "function") cb();
	}
};
handles[7][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	if(obj.data.serverpin == config.get("SERVERPIN")){
		if(ITelexCom.cv(1)) ll(colors.FgGreen,"serverpin is correct!",colors.Reset);
		connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){
			ITelexCom.connections[cnum].state = ITelexCom.states.LOGIN;
			if(typeof cb === "function") cb();
		});
		//ITelexCom.handlePackage({packagetype:8,datalength:0,data:{}},cnum,pool,connection,handles);
	}else{
		if(ITelexCom.cv(1)){
			ll(colors.FgRed+"serverpin is incorrect!"+colors.FgCyan+obj.data.serverpin+colors.FgRed+" != "+colors.FgCyan+config.get("SERVERPIN")+colors.FgRed+"ending connection!"+colors.Reset);
			connection.end();
		}
		if(typeof cb === "function") cb();
	}
};
handles[8][ITelexCom.states.RESPONDING] = function(obj,cnum,pool,connection,handles,cb){
	if(ITelexCom.cv(2)){
		var toSend = [];
		for(o of ITelexCom.connections[cnum].writebuffer){
			toSend.push(o.rufnummer);
		}
		ll(colors.FgGreen,"entrys to transmit:",colors.FgCyan,toSend,colors.Reset);
	}
	if(ITelexCom.connections[cnum].writebuffer.length > 0){
		connection.write(ITelexCom.encPackage({packagetype:5,datalength:100,data:ITelexCom.connections[cnum].writebuffer[0]}),function(){
			ITelexCom.connections[cnum].writebuffer = ITelexCom.connections[cnum].writebuffer.slice(1);
			if(typeof cb === "function") cb();
		});
	}else if(ITelexCom.connections[cnum].writebuffer.length  ==  0){
		connection.write(ITelexCom.encPackage({packagetype:9,datalength:0}),function(){
			ITelexCom.connections[cnum].writebuffer = [];
			ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
			if(typeof cb === "function") cb();
		});
	}else{
		if(typeof cb === "function") cb();
	}
};
handles[9][ITelexCom.states.FULLQUERY] = function(obj,cnum,pool,connection,handles,cb){
	ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	ITelexCom.connections[cnum].cb();
	if(typeof cb === "function") cb();
};
handles[9][ITelexCom.states.LOGIN] = function(obj,cnum,pool,connection,handles,cb){
	ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
	if(typeof cb === "function") cb();
};
handles[10][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	if(ITelexCom.cv(2)) ll(obj);
	var version = obj.data.version;
	var query = obj.data.pattern;
	var searchstring = "SELECT * FROM teilnehmer WHERE";
	queryarr = query.split(" ");
	for(i in queryarr){
		searchstring +=  " AND name LIKE '%"+queryarr[i]+"%'";
	}
	searchstring += ";"
	searchstring = searchstring.replace("WHERE AND","WHERE");
	ITelexCom.SqlQuery(pool,searchstring,function(result){
		if((result[0] != undefined)&&(result != [])){
			var towrite = [];
			for(o of result){
				if(o.gesperrt != 1&&o.typ != 0){
					o.pin = 0;
					towrite.push(o);
				}
			}
			ITelexCom.connections[cnum].writebuffer = towrite;
			ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
			ITelexCom.handlePackage({packagetype:8,datalength:0,data:{}},cnum,pool,connection,handles,cb);
		}else{
			connection.write(ITelexCom.encPackage({packagetype:9,datalength:0}),function(){if(typeof cb === "function") cb();});
		}
	});
};
function init(){
	var server = net.createServer(function(connection){
		try{
			var cnum = -1;
			for(i = 0;i<ITelexCom.connections.length;i++){
				if(ITelexCom.connections[i] == null){
					cnum = i;
				}
			}
			if(cnum == -1){
				cnum = ITelexCom.connections.length;
			}
			ITelexCom.connections[cnum] = {connection:connection,state:ITelexCom.states.STANDBY};
			// var pool = mysql.createConnection(mySqlConnectionOptions);
			if(ITelexCom.cv(1)) ll(colors.FgGreen+"client "+colors.FgCyan+cnum+colors.FgGreen+" connected with ipaddress: "+colors.FgCyan+connection.remoteAddress+colors.Reset);
			//.replace(/^.*:/,'')
			/*pool.connect(function(err){
				if(err){
					if(ITelexCom.cv(0)) ll(colors.FgRed+"Connection of client "+colors.FgCyan+cnum+colors.FgRed+" to database threw an error:\n",err,colors.Reset);
					connection.end(()=>{if(ITelexCom.cv(1)) ll(colors.FgRed+"Terminated connection with client "+colors.FgCyan+cnum+colors.Reset);});
					return;
				}*/
				//if(ITelexCom.cv(2)) ll(connection);
				//if(ITelexCom.cv(1)) ll(colors.FgGreen+"Connected client "+colors.FgCyan+cnum+colors.FgGreen+" to database"+colors.Reset);
				var queryresultpos = -1;
				var queryresult = [];
				var connectionpin;
				connection.setTimeout(config.get("CONNECTIONTIMEOUT"));
				connection.on('timeout', function(){
				    connection.destroy();
						connection.end();
				})
				connection.on('end', function() {
					if(ITelexCom.cv(1)) ll(colors.FgYellow+"client "+colors.FgCyan+cnum+colors.FgYellow+" disconnected"+colors.Reset);
					if(ITelexCom.connections[cnum].connection = connection) ITelexCom.connections[cnum] = null;
					//pool.end(()=>{
						//if(ITelexCom.cv(1)) ll(colors.FgYellow+"Disconnected client "+colors.FgCyan+cnum+colors.FgYellow+" from database"+colors.Reset);
					//});
				});
				connection.on('error', function(err) {
					if(ITelexCom.cv(1)) ll(colors.FgRed+"client "+colors.FgCyan+cnum+colors.FgRed+" had an error:\n",err,colors.Reset);
					if(ITelexCom.connections[cnum].connection = connection) ITelexCom.connections[cnum] = null;
					//pool.end(function(){
						//if(ITelexCom.cv(1)) ll(colors.FgYellow+"Disconnected client "+colors.FgCyan+cnum+colors.FgYellow+" from database"+colors.Reset);
					//});
				});
				connection.on('data', function(data) {
					if(ITelexCom.cv(2)){
						ll(colors.FgGreen+"recieved data:"+colors.Reset);
						ll(colors.FgCyan,data,colors.Reset);
						ll(colors.FgYellow,data.toString(),colors.Reset);
					}
					if(data[0] == 0x71&&/[0-9]/.test(String.fromCharCode(data[1]))/*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/){
						if(ITelexCom.cv(2)) ll(colors.FgGreen+"serving ascii request"+colors.Reset);
						ITelexCom.ascii(data,connection,pool); //TODO: check for fragmentation
					}else{
						if(ITelexCom.cv(2)) ll(colors.FgGreen+"serving binary request"+colors.Reset);
						var res = ITelexCom.checkFullPackage(data, ITelexCom.connections.readbuffer);
						//if(ITelexCom.cv(2)) ll(res);
						if(res[1].length > 0){
							ITelexCom.connections.readbuffer = res[1];
						}
						if(res[0]){
							async.eachSeries(ITelexCom.decData(res[0]),function(pkg,cb){
								ITelexCom.handlePackage(pkg,cnum,pool,connection,handles,cb);
							});
						}
						/*if(res[0].length > 0){
							ITelexCom.handlePackage(ITelexCom.decData(res[0]),cnum,pool,connection,handles); //BINARY
						}*/
					}
				});
			//});
		}catch(e){
			console.error(e);
		}
	});
	server.listen(config.get("BINARYPORT"), function(){
		if(ITelexCom.cv(0)) ll(colors.FgMagenta,"server is listening on port "+config.get("BINARYPORT"),colors.Reset);
	});
}
function updateQueue(){

		if(ITelexCom.cv(2)) ll(colors.FgGreen+"Updating Queue!"+colors.Reset);
		ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE changed = "+1, function(result1){
			if(result1.length > 0){
				if(ITelexCom.cv(2)){
					var changed_numbers = [];
					for(o of result1){
						changed_numbers.push(o.rufnummer);
					}
					ll(colors.FgGreen,"numbers to enqueue:",colors.FgCyan,changed_numbers,colors.Reset);
				}
				//if(ITelexCom.cv(1)&&!ITelexCom.cv(2)) ll(colors.FgGreen,"numbers to enqueue:",colors.FgCyan,result1.length,colors.Reset);
				ITelexCom.SqlQuery(pool,"SELECT * FROM servers", function(result2){
					async.each(result2,function(server,cb1){
						async.each(result1,function(message,cb2){
							ITelexCom.SqlQuery(pool,"DELETE FROM queue WHERE server = "+server.uid+" AND message = "+message.uid,function(result3){
								ITelexCom.SqlQuery(pool,"INSERT INTO queue (server,message,timestamp) VALUES ("+server.uid+","+message.uid+","+Math.floor(new Date().getTime()/1000)+")",function(){
									ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(result3){
										if(ITelexCom.cv(2)) ll(colors.FgGreen,"enqueued:",colors.FgCyan,message.rufnummer,colors.Reset);
										cb2();
									});
								});
							});
						},cb1);
					},function(){
						//pool.end(()=>{
							qwd.stdin.write("sendqueue");
							setTimeout(updateQueue,config.get("UPDATEQUEUEINTERVAL"));
						//});
					});
				});
			}else{
				if(ITelexCom.cv(2)) ll(colors.FgYellow+"no numbers to enqueue"+colors.Reset);
				if(qwdec == null){
					qwdec = "unknown";
					qwd.stdin.write("sendqueue");
				}
				setTimeout(updateQueue,config.get("UPDATEQUEUEINTERVAL"));
			}
		});
	//});
} //TODO: call!
function getFullQuery(){
	// var pool = mysql.createConnection(mySqlConnectionOptions);
	//pool.connect(()=>{
		ITelexCom.SqlQuery(pool,"SELECT * FROM servers",function(res){
			for(i in res){
				if(res[i].addresse == config.get("FULL_QUERY_SERVER")){
					res = res[i];
				}
			}
			async.eachSeries(res,function(r,cb){
				ITelexCom.connect(pool,function(){},{port:r.port,host:r.addresse},handles,function(client,cnum){
					client.write(ITelexCom.encPackage({packagetype:6,datalength:5,data:{serverpin:config.get("SERVERPIN"),version:1}}),function(){
						ITelexCom.connections[cnum].state = ITelexCom.states.FULLQUERY;
						ITelexCom.connections[cnum].cb = cb;
					});
				});
			},function(){
				setTimeout(getFullQuery, config.get("FULLQUERYINTERVAL"));
			});
		});
	//});
}
var qwdec;	//queuewatchdog exit code
function startQWD(){
	ll(colors.FgMagenta,"Initialising queuewatchdog!",colors.Reset);
	qwd = cp.spawn('node',[path.join(PWD,"/BINARYSERVER/queuewatchdog.js")]);
	qwd.on('exit',function(ec){
		qwdec = ec;
		if(ITelexCom.cv(0)) console.error(colors.FgRed+"qwd process exited with code "+colrs.FgCyan+ec+colors.Reset);
		//throw "qwd process exited with code "+ec;
		startQWD();
	});
	qwd.stderr.on('data',function(data){
		if(config.get("QWD_STDERR_LOG") == ""){
			if(ITelexCom.cv(0)) process.stderr.write(colors.FgRed+'qwd: '+data+colors.Reset);
		}else if(config.get("QWD_STDOUT_LOG") == "-"){
		}else{
			try{
				fs.appendFileSync(config.get("QWD_STDERR_LOG"),data);
			}catch(e){
				if(ITelexCom.cv(0)) process.stderr.write(colors.FgRed+'qwd: '+data+colors.Reset);
			}
		}
	});
	qwd.stdout.on('data',function(data){
		if(config.get("QWD_STDOUT_LOG") == ""){
			if(ITelexCom.cv(0)) process.stdout.write(colors.FgBlue+'qwd: '+colors.Reset+data);
		}else if(config.get("QWD_STDOUT_LOG") == "-"){
		}else{
			try{
				fs.appendFileSync(config.get("QWD_STDOUT_LOG"),data);
			}catch(e){
				if(ITelexCom.cv(0)) process.stdout.write(colors.FgBlue+'qwd: '+colors.Reset+data);
			}
		}
	});
}




var pool = mysql.createPool(mySqlConnectionOptions);
pool.getConnection(function(err, connection){
	if(err){
		console.error(colors.FgRed,"Could not connect to database!",colors.Reset);
		throw err;
	}else{
		connection.release();
		if(module.parent === null){
			if(ITelexCom.cv(0)) ll(colors.FgMagenta+"Initialising!"+colors.Reset);
			init();
			startQWD();
			//updateQueue();
			getFullQuery();
		}else{
			module.exports = {
				init:init,
				startQWD:startQWD,
				updateQueue:updateQueue,
				getFullQuery:getFullQuery
			};
		}
	}
});
