import { inspect } from "../../SHARED/misc";
import { SqlQuery } from "../../SHARED/misc";
import config from "../../SHARED/config";

function edit(req, res) {
		// ll(req.body);
		res.header("Content-Type", "application/json; charset=utf-8");
		logger.log('debug', inspect`request body: ${req.body}`);
		logger.log('debug', inspect`typekey: ${req.body.typekey}`);
		if (req.body.password !== config.webInterfacePassword){
			if(req.body.password !== "") logger.log('warning', inspect`${req.connection.remoteAddress} tried to login with a wrong password: '${req.body.password}'`);
			return void res.json({
				successful: false,
				message: {
					code: -1,
					text: "wrong password!",
				},
			});
		}
		switch (req.body.typekey) {
			case "edit": 
				SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid])
				.then(entries=>{
					if (entries===void 0) return void 0;
					let [entry] = entries;
					if (entry===void 0) return void 0;
					logger.log('debug', inspect`exising entry: ${entry}`);
					
	
					if(entry.number === req.body.number){
						logger.log('debug', inspect`number wasn't changed updating`);
						logger.log('debug', inspect`${entry.number} == ${req.body.number}`);
						SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;",
						[req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, Math.floor(Date.now() / 1000), entry.pin, req.body.uid,
						])
						.then(result=>{
							if (result===void 0) return void 0;
	
							res.json({
								successful: true,
								message: result,
							});
						})
						.catch(err=>{
							logger.log('error', inspect`${err}`);
							res.json({
								successful: false,
								message: err,
							});
						});
					}else{
						logger.log('debug', inspect`number was changed inserting`);
						logger.log('debug', inspect`${entry.number} != ${req.body.number}`);
						SqlQuery("DELETE FROM teilnehmer WHERE uid=?;", [req.body.uid])
						.then(()=>{
	
							SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
							[req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)])
							.then(result=>{
								if (result===void 0) return void 0;
	
								res.json({
									successful: true,
									message: result,
								});
							})
							.catch(err=>{
								logger.log('error', inspect`${err}`);
								res.json({
									successful: false,
									message: err,
								});
							});
						})
						.catch(err=>{
							logger.log('error', inspect`${err}`);
							res.json({
								successful: false,
								message: err,
							});
						});
					}
				})
				.catch(err=>{
					logger.log('error', inspect`${err}`);
					res.json({
						successful: false,
						message: err,
					});
				});
				break;
			case "new":
				SqlQuery("SELECT * FROM teilnehmer WHERE number=?;", [req.body.number])
				.then(existing=>{
					logger.log('debug', inspect`${existing}`);
					if (existing===void 0) return void 0;
	
					if(existing&&existing.length===1&&existing[0].type !== 0) return res.json({
						successful: false,
						message: new Error("entry already exists"),
					});
				
					SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [req.body.number])
					.then(()=>{
						
						SqlQuery(
							"INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);",
							[req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, Math.floor(Date.now() / 1000)])
							.then(result=>{
								if (result===void 0) return void 0;
	
								res.json({
									successful: true,
									message: result,
								});
							})
							.catch(err=>{
								logger.log('error', inspect`${err}`);
								res.json({
									successful: false,
									message: err,
								});
							});
					})
					.catch(err=>{
						logger.log('error', inspect`${err}`);
						res.json({
							successful: false,
							message: err,
						});
					});
				})
				.catch(err=>{
					logger.log('error', inspect`${err}`);
					res.json({
						successful: false,
						message: err,
					});
				});
				break;
			case "delete":
				SqlQuery("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;",
				[Math.floor(Date.now() / 1000), req.body.uid])
				.then(result=>{
					if (result===void 0) return void 0;
					
					res.json({
						successful: true,
						message: result,
					});
				})
				.catch(err=>{
					logger.log('error', inspect`${err}`);
					res.json({
						successful: false,
						message: err,
					});
				});
				break;
			case "confirm password":
				res.json({
					successful: true,
					message: {
						code: 1,
						text: "password is correct",
					},
				});
				break;
			default:
				res.json({
					successful: false,
					message: {
						code: -2,
						text: "unknown typekey",
					},
				});
				break;
		}
}
export default edit;
