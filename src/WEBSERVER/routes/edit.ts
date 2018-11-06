import { inspect, timestamp } from "../../SHARED/misc";
import { SqlAll, SqlEach, SqlGet, SqlRun, teilnehmerRow } from "../../SHARED/SQL";
import { isValidToken } from "./tokens";


async function resetPinEntry(req, res, data){
	let result = await SqlRun("UPDATE teilnehmer SET pin=0, changed=1, timestamp=? WHERE uid=?;", [timestamp(), data.uid]);
	if (!result) return;
	
	res.json({
		successful: true,
		message: result,
	});
}

async function editEntry(req, res, data){
	let existing = await SqlGet<teilnehmerRow>("SELECT * FROM teilnehmer WHERE uid=?;", [data.uid]);
	if (!existing) return;

	logger.log('debug', inspect`exising entry: ${existing}`);
	
	// tslint:disable-next-line:triple-equals
	if(existing.number == data.number){
		logger.log('debug', inspect`number wasn't changed updating`);
		logger.log('debug', inspect`${existing.number} == ${data.number}`);
		let result = await SqlRun("UPDATE teilnehmer SET number=?, name=?, type=?, hostname=?, ipaddress=?, port=?, extension=?, disabled=?, timestamp=?, changed=1, pin=? WHERE uid=?;", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.disabled, timestamp(), existing.pin, data.uid]);
		if (!result) return;

		res.json({
			successful: true,
			message: result,
		});
	}else{
		logger.log('debug', inspect`number was changed inserting`);
		logger.log('debug', inspect`${existing.number} != ${+data.number}`);
		await SqlRun("UPDATE teilnehmer set type=0, changed=1, timestamp=? WHERE uid=?;", [data.uid, timestamp()]);

		let result = await SqlRun("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
		[data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, existing.pin, data.disabled, timestamp()]);
		if (!result) return;

		res.json({
			successful: true,
			message: result,
		});
	}
}

async function copyEntry(req, res, data){
	let exising = await SqlGet<teilnehmerRow>("SELECT * FROM teilnehmer WHERE uid=?;", [data.uid]);
	if (!exising) {
		res.json({
			successful: false,
			message: "can't copy nonexisting entry",
		});
		return;
	}

	await SqlRun("DELETE FROM teilnehmer WHERE number=?;", [data.number]);

	let result = await SqlRun("INSERT INTO teilnehmer (number, name, type, hostname, ipaddress, port, extension, pin, disabled, timestamp, changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, exising.pin, data.disabled, timestamp()]);
	if (!result) return;

	res.json({
		successful: true,
		message: result,
	});
}

async function newEntry(req, res, data){
	let existing = await SqlGet<teilnehmerRow>("SELECT * FROM teilnehmer WHERE number=?;", [data.number]);
	logger.log('debug', inspect`${existing}`);

	if(existing){
		res.json({
			successful: false,
			message: new Error("entry already exists"),
		});
		return;
	}

	let result = await SqlRun("INSERT INTO teilnehmer (number,name,type,hostname,ipaddress,port,extension,pin,disabled,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?);", [data.number, data.name, data.type, data.hostname, data.ipaddress, data.port, data.extension, data.pin, data.disabled, timestamp()]);

	res.json({
		successful: Boolean(result),
		message: result,
	});
}

async function deleteEntry(req, res, data){
	let result = await SqlRun("UPDATE teilnehmer SET type=0, changed=1, timestamp=? WHERE type!=0 AND uid=?;", [timestamp(), data.uid]);
	
	res.json({
		successful: Boolean(result),
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
