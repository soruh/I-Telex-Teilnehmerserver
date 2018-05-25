"use strict";
const util = require('util');
const net = require('net');
const fs = require('fs');
const path = require('path');
const dnslookup = require('dns').lookup;

const async = require('async');
const mysql = require('mysql');
const ip = require('ip');

const PWD = path.normalize(path.join(__dirname,'..'));

const config = require(path.join(PWD,'/COMMONMODULES/config.js'));
const {ll,lle,llo} = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js"));
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));
if(config.get("disableColors")) colors.disable();
const ITelexCom = require(path.join(PWD,"/BINARYSERVER/ITelexCom.js"));
const cv = ITelexCom.cv;

const readonly = (config.get("serverPin") == null);
if(readonly) ll(`${colors.FgMagenta}Starting in read-only mode!${colors.Reset}`);

const nodemailer = require('nodemailer');

const mySqlConnectionOptions = config.get('mySqlConnectionOptions');


var transporter;

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
for(let i = 1;i <= 10;i++){handles[i] = {};}
//handes[packagetype][state of this connection]
//handles[2][ITelexCom.states.STANDBY] = (obj,cnum,pool,connection)=>{}; NOT USED
//handles[4][WAITING] = (obj,cnum,pool,connection)=>{}; NOT USED
handles[1][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
			var number = obj.data.rufnummer;
			var pin = obj.data.pin;
			var port = obj.data.port;
			var ipaddress = connection.remoteAddress.replace(/^.*:/,'');
			if(number<10000){
				if(cv(1)) lle(`${colors.FgRed}client tried to update ${number} which is too small(<10000)${colors.Reset}`);
		    ITelexCom.sendEmail(transporter,"invalidNumber",{
					"[IpFull]":connection.remoteAddress,
					"[Ip]":(ip.isV4Format(connection.remoteAddress.split("::")[1])?connection.remoteAddress.split("::")[1]:connection.remoteAddress),
					"[number]":number,
					"[date]":new Date().toLocaleString(),
					"[timeZone]":new Date().getTimezone()
        },function(){
					connection.end();
					cb();
				});
			}else{
			    ITelexCom.SqlQuery(pool,`SELECT * FROM teilnehmer WHERE rufnummer = ${number};`,function(result_a){
				    let results = [];
				    if(result_a){
				      for(let r of result_a){
								if(r.typ != 0){
								  results.push(r);
								}
				      }
				    }
						if(results.length==1){
							var res = results[0];
							if(res.pin == pin){
								if(res.typ == 5){
								ITelexCom.SqlQuery(pool,`UPDATE teilnehmer SET port = '${port}', ipaddresse = '${ipaddress}' ${((port!=res.port||ipaddress!=res.ipaddresse)?(",changed = '1', moddate ="+Math.floor(new Date().getTime()/1000)):"")} WHERE rufnummer = ${number};`,function(result_b){
									ITelexCom.SqlQuery(pool,`SELECT * FROM teilnehmer WHERE rufnummer = ${number};`,function(result_c){
										try{
											connection.write(ITelexCom.encPackage({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary",function(){if(typeof cb === "function") cb();});
										}catch(e){
											if(cv(0)) ll(colors.FgRed,e,colors.Reset);
											if(typeof cb === "function") cb();
										}
									});
								});
							}else{
							  if(cv(1)) ll(colors.FgRed+"not DynIp type"+colors.Reset);
										connection.end();
							  ITelexCom.sendEmail(transporter,"wrongDynIpType",{
							    "[typ]":res.typ,
							    "[IpFull]":connection.remoteAddress,
							    "[Ip]":(ip.isV4Format(connection.remoteAddress.split("::")[1])?connection.remoteAddress.split("::")[1]:connection.remoteAddress),
							    "[number]":res.rufnummer,
							    "[name]":res.name,
							    "[date]":new Date().toLocaleString(),
									"[timeZone]":new Date().getTimezone()
							  },cb);
							}
							}else{
								if(cv(1)) ll(colors.FgRed+"wrong DynIp pin"+colors.Reset);
								connection.end();
					ITelexCom.sendEmail(transporter,"wrongDynIpPin",{
							"[Ip]":(ip.isV4Format(connection.remoteAddress.split("::")[1])?connection.remoteAddress.split("::")[1]:connection.remoteAddress),
										"[number]":res.rufnummer,
										"[name]":res.name,
										"[date]":new Date().toLocaleString(),
										"[timeZone]":new Date().getTimezone()
								},cb);
							}
					}else if(results.length==0){
				    let query = `INSERT INTO teilnehmer (name,moddate,typ,rufnummer,port,pin,ipaddresse,gesperrt,changed) VALUES ('?','${Math.floor(new Date().getTime()/1000)}','5','${number}','${port}','${pin}','${connection.remoteAddress.replace(/^.*:/,'')}','1','1');`;
				    if(result_a&&(result_a.length>0)){
					  	query = `DELETE FROM teilnehmer WHERE rufnummer=${number};`+query;
				    }
						ITelexCom.SqlQuery(pool,query,function(result_b){
							if(result_b){
							  ITelexCom.sendEmail(transporter,"new",{
							    "[IpFull]":connection.remoteAddress,
							    "[Ip]":(ip.isV4Format(connection.remoteAddress.split("::")[1])?connection.remoteAddress.split("::")[1]:connection.remoteAddress),
							    "[number]":number,
							    "[date]":new Date().toLocaleString(),
									"[timeZone]":new Date().getTimezone()
							  },cb);
							  ITelexCom.SqlQuery(pool,`SELECT * FROM teilnehmer WHERE rufnummer = ${number};`,function(result_c){
							    try{
							      connection.write(ITelexCom.encPackage({packagetype:2,datalength:4,data:{ipaddresse:result_c[0].ipaddresse}}),"binary",function(){if(typeof cb === "function") cb();});
							    }catch(e){
							      if(cv(0)) ll(colors.FgRed,e,colors.Reset);
							      if(typeof cb === "function") cb();
							    }
							  });
							}else{
					  		lle(colors.FgRed+"could not create entry",colors.Reset);
					  		if(typeof cb === "function") cb();
							}
						});
					}else{
			      console.error(colors.FgRed,res,solors.Reset);
			    }
				});
			}
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[3][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
			if(obj.data.version == 1){
				var rufnummer = obj.data.rufnummer;
				ITelexCom.SqlQuery(pool,`SELECT * FROM teilnehmer WHERE rufnummer = ${mysql.escape(rufnummer)};`,function(result){ //TODO check if escape breaks things
					if(cv(2)) ll(colors.FgCyan,result,colors.Reset);
					if((result[0] != undefined)&&(result != [])&&(obj.gesperrt != 1)&&(obj.typ != 0)){
						result[0].pin = 0;
						connection.write(ITelexCom.encPackage({packagetype:5,datalength:100,data:result[0]}),function(){if(typeof cb === "function") cb();});
					}else{
						connection.write(ITelexCom.encPackage({packagetype:4,datalength:0}),function(){if(typeof cb === "function") cb();});
					}
				});
			}else{
				if(cv(0)) ll(colors.FgRed,"unsupported package version, sending '0x04' package",colors.Reset);
				connection.write(ITelexCom.encPackage({packagetype:4,datalength:0}),function(){if(typeof cb === "function") cb();});
			}
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[5][ITelexCom.states.FULLQUERY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
		  if(cv(1)) ll(colors.FgGreen+"got dataset for:",colors.FgCyan,obj.data.rufnummer,colors.Reset);
			ITelexCom.SqlQuery(pool,`SELECT * from teilnehmer WHERE rufnummer = ${mysql.escape(obj.data.rufnummer)};`,function(res){
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
					changed:(config.get("setChangedOnNewerEntry")?1:0)
				};
		    // var doLU = ((o.hostname!=""&&o.ipaddresse==null)&&config.get("doDnsLookups"));
		    // function lookup(host,callback){
		    //   if(host){
		    //     if(cv(2)) ll(colors.FgGreen+"starting nslookup for: "+colors.FgCyan+host+colors.FgGreen+" ..."+colors.Reset);
		    //     dnslookup(host,{verbatim:true},function(err, address, family){
		    //       if(cv(3)&&err) lle(colors.FgRed,err,colors.Reset);
		    //       if(cv(2)&&(!(err))) ll(colors.FgGreen+"nslookup got ip: "+colors.FgCyan+address+colors.Reset);
		    //       if(typeof callback === "function") callback(address,res,o,connection,cb);
		    //     });
		    //   }else{
		    //     if(typeof callback === "function") callback(null,res,o,connection,cb);
		    //   }
		    // }
			  if(res.length == 1){
		      var res=res[0];
			    if(obj.data.timestamp > res.moddate){
		        // lookup((doLU?o.hostname:false),function(addr,res,o,connection,cb){
		        //   if(doLU&&addr){
		        //     o.ipaddresse = addr;
		        //   }
		          if(cv(2)) ll(colors.FgGreen+"entry is older: "+colors.FgCyan+obj.data.timestamp+colors.FgGreen+" > "+colors.FgCyan+res.moddate+colors.Reset);
		          var sets = "";
		          for(let k in o){
		            if(o[k]!=undefined){
		              sets+=k+" = "+mysql.escape(o[k])+", ";
		            }else{
		              sets+=k+" = DEFAULT, ";
		            }
		          }
		          var q = `UPDATE teilnehmer SET ${sets.substring(0,sets.length-2)} WHERE rufnummer = ${obj.data.rufnummer};`;
		          ITelexCom.SqlQuery(pool,q,function(res2){
		            connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
		          });
		        // });
		      }else{
		        if(cv(2)) ll(colors.FgYellow+"recieved entry is "+colors.FgCyan+(parseInt(res.moddate)-parseInt(obj.data.timestamp))+colors.FgYellow+" seconds older and was ignored"+colors.Reset);
		        connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
		      }
		    }else if(res.length == 0){
		      // lookup((doLU?o.hostname:false),function(addr,res,o,connection,cb){
		      //   if(doLU&&addr){
		      //     o.ipaddresse = addr;
		      //   }
		        var names = "";
		        var values = "";
		        for(let k in o){
		          if(o[k]!=undefined){
		            names+=k+", ";
		            values+=mysql.escape(o[k])+", ";
		          }
		        }
		        var q = `INSERT INTO teilnehmer(${names.substring(0, names.length - 2)}) VALUES (${values.substring(0, values.length - 2)});`;
		        ITelexCom.SqlQuery(pool,q,function(res2){
		          connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){if(typeof cb === "function") cb();});
		        });
		      // });
		    }else{
		      if(cv(0)) ll('Something really strange happened, the "rufnummer" field should be unique!');
		      if(typeof cb === "function") cb();
		    }
		  });
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[5][ITelexCom.states.LOGIN] = handles[5][ITelexCom.states.FULLQUERY];
handles[6][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
			if(obj.data.serverpin == config.get("serverPin")||(readonly&&config.get("allowFullQueryInReadonly"))){
				if(cv(1)) ll(colors.FgGreen,"serverpin is correct!",colors.Reset);
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
				if(cv(1)){
					ll(colors.FgRed+"serverpin is incorrect! "+colors.FgCyan+obj.data.serverpin+colors.FgRed+" != "+colors.FgCyan+config.get("serverPin")+colors.FgRed+" ending connection!"+colors.Reset);//TODO: remove pin logging
					connection.end();
				}
		    ITelexCom.sendEmail(transporter,"wrongServerPin",{
		      "[IpFull]":connection.remoteAddress,
		      "[Ip]":(ip.isV4Format(connection.remoteAddress.split("::")[1])?connection.remoteAddress.split("::")[1]:connection.remoteAddress),
		      "[date]":new Date().toLocaleString(),
					"[timeZone]":new Date().getTimezone()
		    },cb);
			}
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[7][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
			if((obj.data.serverpin == config.get("serverPin"))||(readonly&&config.get("allowLoginInReadonly"))){
				if(cv(1)) ll(colors.FgGreen,"serverpin is correct!",colors.Reset);
				connection.write(ITelexCom.encPackage({packagetype:8,datalength:0}),function(){
					ITelexCom.connections[cnum].state = ITelexCom.states.LOGIN;
					if(typeof cb === "function") cb();
				});
			}else{
				if(cv(1)){
					ll(colors.FgRed+"serverpin is incorrect!"+colors.FgCyan+obj.data.serverpin+colors.FgRed+" != "+colors.FgCyan+config.get("serverPin")+colors.FgRed+"ending connection!"+colors.Reset);
					connection.end();
				}
		    ITelexCom.sendEmail(transporter,"wrongServerPin",{
		      "[IpFull]":connection.remoteAddress,
		      "[Ip]":(ip.isV4Format(connection.remoteAddress.split("::")[1])?connection.remoteAddress.split("::")[1]:connection.remoteAddress),
		      "[date]":new Date().toLocaleString(),
					"[timeZone]":new Date().getTimezone()
		    },cb);
			}
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[8][ITelexCom.states.RESPONDING] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
		  if(cv(1)){
		    var toSend = [];
				for(let o of ITelexCom.connections[cnum].writebuffer){
					toSend.push(o.rufnummer);
				}
				ll(colors.FgGreen+"entrys to transmit:"+colors.FgCyan+(cv(2)?util.inspect(toSend).replace(/\n/g,""):toSend.length)+colors.Reset);
			}
			if(ITelexCom.connections[cnum].writebuffer.length > 0){
				connection.write(ITelexCom.encPackage({packagetype:5,datalength:100,data:ITelexCom.connections[cnum].writebuffer[0]}),function(){
		      if(cv(1)) ll(colors.FgGreen+"sent dataset for:",colors.FgCyan,ITelexCom.connections[cnum].writebuffer[0].rufnummer,colors.Reset);
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
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[9][ITelexCom.states.FULLQUERY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
			ITelexCom.connections[cnum].state = ITelexCom.states.STANDBY;
		  if(typeof ITelexCom.connections[cnum].cb === "function") ITelexCom.connections[cnum].cb();
			if(typeof cb === "function") cb();
		  connection.end();
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
handles[9][ITelexCom.states.LOGIN] = handles[9][ITelexCom.states.FULLQUERY];
handles[10][ITelexCom.states.STANDBY] = function(obj,cnum,pool,connection,handles,cb){
	try{
		if(ITelexCom.connections.hasOwnProperty(cnum)){
			if(cv(2)) ll(obj);
			var version = obj.data.version;
			var query = obj.data.pattern;
			var searchstring = "SELECT * FROM teilnehmer WHERE";
			var queryarr = query.split(" ");
			for(let i in queryarr){
				searchstring +=  " AND name LIKE '%"+queryarr[i]+"%'";
			}
			searchstring += ";"
			searchstring = searchstring.replace("WHERE AND","WHERE");
			ITelexCom.SqlQuery(pool,searchstring,function(result){
				if((result[0] != undefined)&&(result != [])){
					var towrite = [];
					for(let o of result){
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
		}else{
			if(typeof cb === "function") cb();
		}
	}catch(e){
		if(typeof cb === "function") cb();
	}
};
function init(){
	if(cv(0)) ll(colors.FgMagenta+"Initialising!"+colors.Reset);
	var server = net.createServer(function(connection){
		try{
			var cnum = -1;
			let maxKey = Math.max.apply(Math,Object.keys(ITelexCom.connections));
			if(!isFinite(maxKey)) maxKey=0;
			for(let i = 0;i<=maxKey+1;i++){
				if(!ITelexCom.connections.hasOwnProperty(i)){
					cnum = i;
					break;
				}
			}
			ITelexCom.connections[cnum] = {connection:connection,state:ITelexCom.states.STANDBY,handling:false};
			if(cv(1)) ll(colors.FgGreen+"client "+colors.FgCyan+cnum+colors.FgGreen+" connected with ipaddress: "+colors.FgCyan+connection.remoteAddress+colors.Reset); //.replace(/^.*:/,'')
			if(connection.remoteAddress == undefined) setTimeout(function(){ll(connection.remoteAddress)},1000);
			var queryresultpos = -1;
			var queryresult = [];
			var connectionpin;
			connection.setTimeout(config.get("connectionTimeout"));
			connection.on('timeout', function(){
        if(cv(1)) ll(colors.FgYellow+"client "+colors.FgCyan+cnum+colors.FgYellow+" timed out"+colors.Reset);
			  connection.end();
			})
			connection.on('end', function(){
				if(cv(1)) ll(colors.FgYellow+"client "+colors.FgCyan+cnum+colors.FgYellow+" disconnected"+colors.Reset);
				try{clearTimeout(ITelexCom.connections[cnum].timeout)}catch(e){}
				if(ITelexCom.connections[cnum]&&ITelexCom.connections[cnum].connection == connection){
          setTimeout(function(cnum){
					  delete ITelexCom.connections[cnum];
					  ll(`${colors.FgGreen}deleted connections[${colors.FgCyan+cnum+colors.FgGreen}]${colors.Reset}`);
					},1000,cnum);
        }
			});
			connection.on('error', function(err) {
				if(cv(1)) ll(colors.FgRed+"client "+colors.FgCyan+cnum+colors.FgRed+" had an error:\n",err,colors.Reset);
				try{clearTimeout(ITelexCom.connections[cnum].timeout)}catch(e){}
        if(ITelexCom.connections[cnum]&&ITelexCom.connections[cnum].connection == connection){
          setTimeout(function(cnum){
					  delete ITelexCom.connections[cnum];
					  ll(`${colors.FgGreen}deleted connections[${colors.FgCyan+cnum+colors.FgGreen}]${colors.Reset}`);
					},1000,cnum);
        }
			});
			connection.on('data', function(data) {
				if(cv(2)){
					ll(colors.FgGreen+"recieved data:"+colors.Reset);
					ll(colors.FgCyan,data,colors.Reset);
					ll(colors.FgCyan,data.toString().replace(/\u0000/g,"").replace(/[^ -~]/g," "),colors.Reset);
				}
				if(data[0] == 113&&/[0-9]/.test(String.fromCharCode(data[1]))/*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/){
					if(cv(2)) ll(colors.FgGreen+"serving ascii request"+colors.Reset);
					ITelexCom.ascii(data,connection,pool); //TODO: check for fragmentation //probably not needed
				}else if(data[0] == 99){
					if(config.get("doDnsLookups")){
						var arg = data.slice(1).toString().replace(/\n/g,"").replace(/\r/g,"");
						if(cv(1)) ll(`${colors.FgGreen}checking if ${colors.FgCyan+arg+colors.FgGreen} belongs to participant${colors.Reset}`);
						if(ip.isV4Format(arg)||ip.isV6Format(arg)){
							check(arg);
						}else{
							dnslookup(arg,{verbatim:true},function(err, address, family){
								if(cv(3)&&err) lle(colors.FgRed,err,colors.Reset);
								check(address);
							});
						}
						function check(IpAddr){
		          if(ip.isV4Format(IpAddr)||ip.isV6Format(IpAddr)){
		            ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE gesperrt != 1 AND typ != 0;", function(res){
		              var ips = [];
		              async.eachOf(res,function(r,key,cb){
		                if((!r.ipaddresse)&&r.hostname){
											// ll(`hostname: ${r.hostname}`)
		                  dnslookup(r.hostname,{verbatim:true},function(err, address, family){
		                    if(cv(3)&&err) lle(colors.FgRed,err,colors.Reset);
		                    if(address){
													ips.push(address);
													// ll(`${r.hostname} resolved to ${address}`);
												}
		                    cb();
		                  });
		                }else if(r.ipaddresse&&(ip.isV4Format(r.ipaddresse)||ip.isV6Format(r.ipaddresse))){
											// ll(`ip: ${r.ipaddresse}`);
		                  ips.push(r.ipaddresse);
		                  cb();
		                }else{
		                  cb();
		                }
		              },function(){
		                // ips = ips.filter(function(elem, pos){
		                //   return ips.indexOf(elem) == pos;
		                // });
										// ll(JSON.stringify(ips))
										let exists = ips.filter(function(i){return(ip.isEqual(i,IpAddr))}).length > 0;
										// ll(exists);
		                // var exists = 0;
		                // for(var i in ips){
		                //   if(ip.isEqual(ips[i],IpAddr)){
		                //     exists = 1;
		                //   }
		                // }
		                connection.write(exists+"\r\n");
		              });
		            });
		          }else{
		            // connection.write("-1\r\n");
								connection.write("ERROR\r\nnot a valid host or ip\r\n");
		          }
						}
					}else{
						connection.write("ERROR\r\nthis server does not support this function\r\n");
					}
        }else{
					if(cv(2)) ll(colors.FgGreen+"serving binary request"+colors.Reset);
					var res = ITelexCom.checkFullPackage(data, ITelexCom.connections.readbuffer);
					if(res[1].length > 0){
						ITelexCom.connections.readbuffer = res[1];
					}
					if(res[0]){
						if(typeof ITelexCom.connections[cnum].packages != "object") ITelexCom.connections[cnum].packages = [];
						ITelexCom.connections[cnum].packages = ITelexCom.connections[cnum].packages.concat(ITelexCom.decData(res[0]));
						let timeout = function(){
							if(cv(2)) ll(colors.FgGreen+"handling: "+colors.FgCyan+ITelexCom.connections[cnum].handling+colors.Reset);
							if(ITelexCom.connections[cnum].handling === false){
								ITelexCom.connections[cnum].handling = true;
								if(ITelexCom.connections[cnum].timeout != null){
									clearTimeout(ITelexCom.connections[cnum].timeout);
									ITelexCom.connections[cnum].timeout = null;
								}
								async.eachOfSeries((ITelexCom.connections[cnum].packages!=undefined?ITelexCom.connections[cnum].packages:[]),function(pkg,key,cb){
									if((cv(1)&&(Object.keys(ITelexCom.connections[cnum].packages).length > 1))||cv(2)) ll(colors.FgGreen+"handling package "+colors.FgCyan+(key+1)+"/"+Object.keys(ITelexCom.connections[cnum].packages).length+colors.Reset);
									ITelexCom.handlePackage(pkg,cnum,pool,connection,handles,function(){
										ITelexCom.connections[cnum].packages.splice(key,1);
										cb();
									});
								},function(){
                    ITelexCom.connections[cnum].handling = false;
								});
							}else{
								if(ITelexCom.connections[cnum].timeout == null){
									ITelexCom.connections[cnum].timeout = setTimeout(timeout,10);
								}
							}
						}
						timeout();
					}
				}
			});
		}catch(e){
			lle(e);
		}
	});
	server.listen(config.get("binaryPort"), function(){
		if(cv(0)) ll(colors.FgMagenta+"server is listening on port "+colors.FgCyan+config.get("binaryPort"),colors.Reset);

		ITelexCom.TimeoutWrapper(getFullQuery, config.get("fullQueryInterval"));
		ITelexCom.TimeoutWrapper(updateQueue,config.get("updateQueueInterval"));
		ITelexCom.TimeoutWrapper(sendQueue,config.get("queueSendInterval"));
		getFullQuery();
		//updateQueue();
	});
}
function updateQueue(callback){
	if(cv(2)) ll(colors.FgMagenta+"updating "+colors.FgCyan+"Queue"+colors.FgMagenta+"!"+colors.Reset);
	ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer WHERE changed = "+1, function(changed){
		if(changed.length > 0){
			if(cv(2)){
				var changed_numbers = [];
				for(let o of changed){
					changed_numbers.push(o.rufnummer);
				}
				ll(colors.FgGreen+"numbers to enqueue:"+colors.FgCyan,changed_numbers,colors.Reset);
			}
			if(cv(1)&&!cv(2)) ll(colors.FgCyan+changed.length+colors.FgGreen+" numbers to enqueue"+colors.Reset);

			ITelexCom.SqlQuery(pool,"SELECT * FROM servers;", function(servers){
				if(servers.length>0){
					async.each(servers,function(server,cb1){
						async.each(changed,function(message,cb2){
							ITelexCom.SqlQuery(pool,"SELECT * FROM queue WHERE server = "+server.uid+" AND message = "+message.uid,function(qentry){
								if(qentry.length == 1){
									ITelexCom.SqlQuery(pool,"UPDATE queue SET timestamp = "+Math.floor(new Date().getTime()/1000)+" WHERE server = "+server.uid+" AND message = "+message.uid,function(){
										//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
											if(cv(2)) ll(colors.FgGreen,"enqueued:",colors.FgCyan,message.rufnummer,colors.Reset);
											cb2();
										//});
									});
								}else if(qentry.length == 0){
									ITelexCom.SqlQuery(pool,"INSERT INTO queue (server,message,timestamp) VALUES ("+server.uid+","+message.uid+","+Math.floor(new Date().getTime()/1000)+")",function(){
										//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
											if(cv(2)) ll(colors.FgGreen,"enqueued:",colors.FgCyan,message.rufnummer,colors.Reset);
											cb2();
										//});
									});
								}else{
									lle("duplicate queue entry!");
									ITelexCom.SqlQuery(pool,"DELETE FROM queue WHERE server = "+server.uid+" AND message = "+message.uid,function(){
										ITelexCom.SqlQuery(pool,"INSERT INTO queue (server,message,timestamp) VALUES ("+server.uid+","+message.uid+","+Math.floor(new Date().getTime()/1000)+")",function(){
											//ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
												if(cv(2)) ll(colors.FgGreen,"enqueued:",colors.FgCyan,message.rufnummer,colors.Reset);
												cb2();
											//});
										});
									});
								}
							});
						},cb1);
					},function(){
						if(cv(1)) ll(colors.FgGreen+"finished enqueueing"+colors.Reset);
						if(cv(2)) ll(colors.FgGreen+"reseting changed flags..."+colors.Reset);
						ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+changed.map(function(entry){return(entry.uid)}).join(" or uid=")+";", function(err, res){
							if(cv(2)) ll(colors.FgGreen+"reset "+colors.FgCyan+changed.length+colors.FgGreen+" changed flags."+colors.Reset);
							if(typeof callback === "function") callback();
						});
					});
				}else{
					ll(colors.FgYellow+"No configured servers -> aborting "+colors.FgCyan+"updateQueue"+colors.Reset)
					if(typeof callback === "function") callback();
				}
			});
		}else{
			if(cv(2)) ll(colors.FgYellow+"no numbers to enqueue"+colors.Reset);
			/*if(qwdec == null){
				qwdec = "unknown";
				//TODO qwd.stdin.write("sendQueue",callback);
        if(typeof callback === "function") callback();
			}else{
        if(typeof callback === "function") callback();
			}*/
      if(typeof callback === "function") callback();
			//setTimeout(updateQueue,config.get("updateQueueInterval"));
		}
	});
}
function getFullQuery(callback){
	if(cv(2)) ll(colors.FgMagenta+"geting "+colors.FgCyan+"FullQuery"+colors.FgMagenta+"!"+colors.Reset);
	/*if(readonly){
    ITelexCom.connect(pool,transporter,function(e){
      if(typeof callback === "function") callback();
    },{host:config.get("readonlyHost"),port:config.get("readonlyPort")},handles,function(client,cnum){
      client.write(ITelexCom.encPackage({packagetype:10,datalength:41,data:{pattern:'',version:1}}),function(){
        ITelexCom.connections[cnum].state = ITelexCom.states.FULLQUERY;
      });
    });
  }else{*/
  ITelexCom.SqlQuery(pool,"SELECT * FROM servers",function(servers){
		if(servers.length>0){
			for(let i in servers){
				if(servers[i].addserversse == config.get("fullQueryServer").split(":")[0] && servers[i].port== config.get("fullQueryServer").split(":")[1]){
					servers = [servers[i]];
				}
			}
			async.eachSeries(servers,function(r,cb){
				ITelexCom.connect(pool,transporter,function(e){
					try{cb();}catch(e){}
				},{host:r.addresse,port:r.port},handles,function(client,cnum){
					try{
						let request = readonly?
							{packagetype:10,datalength:41,data:{pattern:'',version:1}}:
							{packagetype:6,datalength:5,data:{serverpin:config.get("serverPin"),version:1}};
						client.write(ITelexCom.encPackage(request),function(){
							ITelexCom.connections[cnum].state = ITelexCom.states.FULLQUERY;
							ITelexCom.connections[cnum].cb = cb;
						});
					}catch(e){
						try{cb();}catch(e){}
					}
				});
			},function(){
				if(typeof callback === "function") callback();
			});
		}else{
			ll(colors.FgYellow+"No configured servers -> aborting "+colors.FgCyan+"FullQuery"+colors.Reset)
			if(typeof callback === "function") callback();
		}
	});
  //}
}
function sendQueue(callback){
	if(cv(2)) ll(colors.FgMagenta+"sending "+colors.FgCyan+"Queue"+colors.FgMagenta+"!"+colors.Reset);
	if(readonly){
		if(cv(2)) ll(colors.FgYellow+"Read-only mode -> aborting "+colors.FgCyan+"sendQueue"+colors.Reset);
    if(typeof callback === "function") callback();
  }else{
  	ITelexCom.SqlQuery(pool,"SELECT * FROM teilnehmer;",function(teilnehmer){
  		ITelexCom.SqlQuery(pool,"SELECT * FROM queue;",function(queue){
  			if(queue.length>0){
  				var servers = {};
  				for(let q of queue){
  					if(!servers[q.server]) servers[q.server] = [];
  					servers[q.server].push(q);
  				}
  				async.eachSeries(servers,function(server,cb){
  					ITelexCom.SqlQuery(pool,"SELECT * FROM servers WHERE uid="+server[0].server+";",function(result2){
  						if(result2.length==1){
  							var serverinf = result2[0];
  							if(cv(2)) ll(colors.FgCyan,serverinf,colors.Reset);
  							try{
  								var isConnected = false;
  								for(let key in ITelexCom.connections){
                    if(ITelexCom.connections.hasOwnProperty(key)){
                      var c = ITelexCom.connections[key];
                    }
  									if(c.servernum == server[0].server){
  										var isConnected = true;
  									}
  								}
  								if(!isConnected){
  									ITelexCom.connect(pool,transporter,cb,{host:serverinf.addresse,port: serverinf.port},handles,function(client,cnum){
  										ITelexCom.connections[cnum].servernum = server[0].server;
  										if(cv(1)) ll(colors.FgGreen+'connected to server '+server[0].server+': '+serverinf.addresse+" on port "+serverinf.port+colors.Reset);
  										ITelexCom.connections[cnum].writebuffer = [];
  										async.each(server,function(serverdata,scb){
  											if(cv(2)) ll(colors.FgCyan,serverdata,colors.Reset);
  											var existing = false;
  											for(let t of teilnehmer){
  												if(t.uid == serverdata.message){
  													existing = t;
  												}
  											}
  											if(existing){
  												ITelexCom.SqlQuery(pool,"DELETE FROM queue WHERE uid="+serverdata.uid+";",function(res){
  													if(res.affectedRows > 0){
                              ITelexCom.connections[cnum].writebuffer.push(existing);//TODO
                              if(cv(1)) ll(colors.FgGreen+"deleted queue entry "+colors.FgCyan+existing.name+colors.FgGreen+" from queue"+colors.Reset);
  														scb();
  													}else{
                              if(cv(1)) ll(colors.FgRed+"could not delete queue entry "+colors.FgCyan+existing.name+colors.FgRed+" from queue"+colors.Reset);
                              scb();
                            }
  												});
  											}else{
                          if(cv(2)) ll(colors.FgRed+"entry does not exist"+colors.FgCyan+colors.Reset);
  												scb();
  											}
  										},function(){
  											client.write(ITelexCom.encPackage({packagetype:7,datalength:5,data:{serverpin:config.get("serverPin"),version:1}}),function(){
  												ITelexCom.connections[cnum].state = ITelexCom.states.RESPONDING;
  												cb();
  											});
  										});
  									});
  								}else{
  									if(cv(1)) ll(colors.FgYellow+"already connected to server "+server[0].server+colors.Reset);
                    cb();
  								}
  							}catch(e){
  								if(cv(2)) lle(e);
  								cb();
  							}
  						}else{
  							ITelexCom.SqlQuery(pool,"DELETE FROM queue WHERE server="+server[0].server+";",cb);
  						}
  					});
  				},function(){
  					if(typeof callback === "function") callback();
  				});
  			}else{
  				if(cv(2)) ll(colors.FgYellow+"No queue!",colors.Reset);
  				if(typeof callback === "function") callback();
  			}
  		});
  	});
  }
}


var pool = mysql.createPool(mySqlConnectionOptions); //TODO: pool(to many open connections)
pool.getConnection(function(err, connection){
	if(err){
		lle(colors.FgRed,"Could not connect to database!",colors.Reset);
		throw err;
	}else{
		connection.release();
		if(cv(0)) ll(colors.FgMagenta+"Successfully connected to database!"+colors.Reset);
		if(module.parent === null){
      if(config.get("eMail").useTestAccount){
        nodemailer.createTestAccount(function(err, account){
					if(err){
						lle(err);
						transporter = {
							sendMail:function sendMail(){lle("can't send mail after Mail error")},
							options:{host:"Failed to get test Account"}
						};
					}else{
						if(cv(0)) ll(colors.FgMagenta+"Got email test account:\n"+colors.FgCyan+util.inspect(account)+colors.Reset);
	          transporter = nodemailer.createTransport({
	            host: 'smtp.ethereal.email',
	            port: 587,
	            secure: false, // true for 465, false for other ports
	            auth: {
	              user: account.user, // generated ethereal user
	              pass: account.pass  // generated ethereal password
	            }
	          });
					}
          init();
        });
      }else{
        transporter = nodemailer.createTransport(config.get("eMail").account);
        init();
      }
		}else{
			if(cv(0)) ll(colors.FgMagenta+"Was required by another file -> Initialising exports"+colors.Reset);
			module.exports = {
				init:init,
				startQWD:startQWD,
				updateQueue:updateQueue,
				getFullQuery:getFullQuery,
				ITelexCom:ITelexCom
			};
		}
	}
});

if(cv(3)){
	function exitHandler(options, err) {
		if (options.cleanup) ll(`serverErrors:\n${util.inspect(ITelexCom.serverErrors,{depth:null})}`);
		if (options.exit) process.exit();
	}
	process.on('exit', exitHandler.bind(null,{cleanup:true}));
	process.on('SIGINT', exitHandler.bind(null, {exit:true}));
	process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
	process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
	process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
}
