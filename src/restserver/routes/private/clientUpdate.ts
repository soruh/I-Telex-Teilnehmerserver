import { NextFunction, Response, Request } from "express";
import { SqlRun, teilnehmerRow } from "../../../shared/SQL";
import { normalizeIp, inspect } from "../../../shared/misc";

async function clientUpdate(req:Request, res:Response, next:NextFunction){

	const addr = normalizeIp(req.ip);
	if(addr.family === 6){
		res.status(400);
		res.json({success:false, error: "ipv6 is not supported"});
		return;
	}
	const ipaddress = addr.address;


	let port = null;
	try{
		let data = JSON.parse(req.body.data);
		port = data.port;
	}catch(err){/*fail silently*/}



	const query = `UPDATE teilnehmer SET ipaddress=?${port!==null?', port=?':''} WHERE number=?`;

	let args = [];
	args.push(ipaddress);
	if(port !== null) args.push(ipaddress);
	args.push((req['user'] as teilnehmerRow).number);


	try{
		let {changes} = await SqlRun(query, args);
		if(changes !== 1) {
			res.status(404);
			res.json({success:false});
			return;
		}
	}catch(err){
		next(err);
	}

	res.status(200);
	res.json({ success:true, data: { ipaddress } });
}

export default clientUpdate;
