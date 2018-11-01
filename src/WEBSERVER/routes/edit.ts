import { inspect, timestamp } from "../../SHARED/misc";
import { SqlQuery, SqlAll, SqlEach, SqlGet } from "../../SHARED/SQL";
import { isValidToken } from "./tokens";
import { peerList } from "../../BINARYSERVER/ITelexCom";


async function resetPinEntry(req, res){
	let result = await SqlQuery("UPDATE teilnehmer SET pin=0, changed=1, timestamp=? WHERE uid=?;", [timestamp(), req.body.uid]);
	if (!result) return;
	
	res.json({
		successful: true,
		message: result,
	});
}

async function editEntry(req, res){
	let entries = await SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid]);
	if (!entries) return;

	let [entry] = entries;
	if (!entry) return;

	logger.log('debug', inspect`exising entry: ${entry}`);
	

	if(entry.number === req.body.number){
		logger.log('debug', inspect`number wasn't changed updating`);
		logger.log('debug', inspect`${entry.number} == ${req.body.number}`);
		let result = await SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.disabled, timestamp(), entry.pin, req.body.uid]);
		if (!result) return;

		res.json({
			successful: true,
			message: result,
		});
	}else{
		logger.log('debug', inspect`number was changed inserting`);
		logger.log('debug', inspect`${entry.number} != ${req.body.number}`);
		await SqlQuery("DELETE FROM teilnehmer WHERE uid=?;", [req.body.uid]);

		let result = await SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
		[req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, timestamp()]);
		if (!result) return;

		res.json({
			successful: true,
			message: result,
		});
	}
}

async function copyEntry(req, res){
	let results:peerList = await SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [req.body.uid]);
	if (results.length === 0) {
		res.json({
			successful: false,
			message: "can't copy nonexisting entry",
		});
		return;
	}

	let [exising] = results;

	await SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [req.body.number]);

	let result = await SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, exising.pin, req.body.disabled, timestamp()]);
	if (!result) return;

	res.json({
		successful: true,
		message: result,
	});
}

async function newEntry(req, res){
	let existing = await SqlQuery("SELECT * FROM teilnehmer WHERE number=?;", [req.body.number]);
	logger.log('debug', inspect`${existing}`);
	if (!existing) return;

	if(existing&&existing.length===1&&existing[0].type !== 0) return res.json({
		successful: false,
		message: new Error("entry already exists"),
	});

	await SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [req.body.number]);

	let result = await SqlQuery("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [req.body.number, req.body.name, req.body.type, req.body.hostname, req.body.ipaddress, req.body.port, req.body.extension, req.body.pin, req.body.disabled, timestamp()]);
	if (!result) return;

	res.json({
		successful: true,
		message: result,
	});
}

async function deleteEntry(req, res){
	let result = await SqlQuery("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [timestamp(), req.body.uid]);
	if (!result) return;
	
	res.json({
		successful: true,
		message: result,
	});
}

function editEndpoint(req, res) {
		// ll(req.body);
		res.header("Content-Type", "application/json; charset=utf-8");
		logger.log('debug', inspect`request body: ${req.body}`);
		logger.log('debug', inspect`typekey: ${req.body.typekey}`);
		if (!isValidToken(req.body.token)){
			return void res.json({
				successful: false,
				message: {
					code: -1,
					text: "wrong password!",
				},
			});
		}
		try{
			switch (req.body.typekey) {
				case "edit": 
					editEntry(req, res);
					break;
				case "copy": 
					copyEntry(req, res);
					break;
				case "new":
					newEntry(req, res);
					break;
				case "delete":
					deleteEntry(req, res);
					break;
				case "resetPin":
					resetPinEntry(req, res);
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
		}catch(err){
			res.json({
				successful: false,
				message: err,
			});
		}
}
export default editEndpoint;
