import { inspect, timestamp } from "../../SHARED/misc";
import { SqlQuery } from "../../SHARED/misc";
import { isValidToken } from "./tokens";
import { peerList } from "../../BINARYSERVER/ITelexCom";


async function resetPinEntry(req, res, data){
	let result = await SqlQuery("UPDATE teilnehmer SET pin=0, changed=1, timestamp=? WHERE uid=?;", [timestamp(), data.uid]);
	if (!result) return;
	
	res.json({
		successful: true,
		message: result,
	});
}

async function editEntry(req, res, data){
	let entries = await SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [data.uid]);
	if (!entries) return;

	let [toEdit] = entries;
	if (!toEdit) {
		res.json({
			successful: false,
			message: "can't edit nonexisting entry",
		});
		return;
	}

	logger.log('debug', inspect`entry to edit: ${toEdit}`);
	

	// tslint:disable-next-line:triple-equals
	if(toEdit.number == data.number){
		logger.log('debug', inspect`number wasn't changed updating`);
		logger.log('debug', inspect`${toEdit.number} == ${data.number}`);
		let result = await SqlQuery("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.disabled, timestamp(), toEdit.pin, data.uid]);
		if (!result) return;

		res.json({
			successful: true,
			message: result,
		});
	}else{
		logger.log('debug', inspect`number was changed inserting`);
		logger.log('debug', inspect`${toEdit.number} != ${data.number}`);

		const [exising] = await SqlQuery("SELECT * from teilnehmer WHERE number=?;", [data.number]);
		if(exising){
			if(exising.type === 0){
				await SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [data.number]);
			}else{
				res.json({
					successful: false,
					message: "number already exists",
				});
				return;
			}
		}
		
		await SqlQuery("UPDATE teilnehmer SET type=0 WHERE uid=?;", [data.uid]);

		const result = await SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
		[data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, toEdit.pin, data.disabled, timestamp()]);
		if (!result) {
			res.json({
				successful: false,
				message: "internal error",
			});
			return;
		}

		res.json({
			successful: true,
			message: result,
		});
	}
}

async function copyEntry(req, res, data){
	let results:peerList = await SqlQuery("SELECT * FROM teilnehmer WHERE uid=?;", [data.uid]);
	if (results.length === 0) {
		res.json({
			successful: false,
			message: "can't copy nonexisting entry",
		});
		return;
	}

	let [exising] = results;

	await SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [data.number]);

	let result = await SqlQuery("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, exising.pin, data.disabled, timestamp()]);
	if (!result) return;

	res.json({
		successful: true,
		message: result,
	});
}

async function newEntry(req, res, data){
	let existing = await SqlQuery("SELECT * FROM teilnehmer WHERE number=?;", [data.number]);
	logger.log('debug', inspect`${existing}`);
	if (!existing) return;

	if(existing&&existing.length===1&&existing[0].type !== 0) return res.json({
		successful: false,
		message: new Error("entry already exists"),
	});

	await SqlQuery("DELETE FROM teilnehmer WHERE number=?;", [data.number]);

	let result = await SqlQuery("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.pin, data.disabled, timestamp()]);
	if (!result) return;

	res.json({
		successful: true,
		message: result,
	});
}

async function deleteEntry(req, res, data){
	let result = await SqlQuery("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [timestamp(), data.uid]);
	if (!result) return;
	
	res.json({
		successful: true,
		message: result,
	});
}

function editEndpoint(req, res) {
		// logger.log('debug', "editEndpoint");
		// logger.log('debug', inspect`request body: ${req.body}`);
	
		let data;
		try {
			data = JSON.parse(req.body.data);
		}catch(err){
			logger.log('error', err);
			return;
		}
		
		

		res.header("Content-Type", "application/json; charset=utf-8");
		logger.log('debug', inspect`job: ${data.job}`);
		if (!isValidToken(req.body.token, req.body.data, req.body.salt)){
			return void res.json({
				successful: false,
				message: {
					code: -1,
					text: "wrong password!",
				},
			});
		}
		try{
			switch (data.job) {
				case "edit": 
					editEntry(req, res, data);
					break;
				case "copy": 
					copyEntry(req, res, data);
					break;
				case "new":
					newEntry(req, res, data);
					break;
				case "delete":
					deleteEntry(req, res, data);
					break;
				case "resetPin":
					resetPinEntry(req, res, data);
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
							text: "unknown job",
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
