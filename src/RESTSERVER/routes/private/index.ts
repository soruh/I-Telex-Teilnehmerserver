"use strict";

import * as express from "express";
import { SqlGet, teilnehmerRow, SqlRun } from "../../../SHARED/SQL";
import clientUpdate from "./clientUpdate";
import { inspect, timestamp } from "../../../SHARED/misc";

const privateRouter = express.Router();


// Test Authorization header of all requests to /private/*
privateRouter.all('*', async function(req, res, next) {
	if(!(req.header('Authorization')&&/Basic (.*)/.test(req.header('Authorization')))){
		res.header("WWW-Authenticate", "Basic");
		res.status(401);
		res.json({success:false, error:'authentication error'});
		return;
	}
	const [number, pin] = Buffer.from(/Basic (.*)/.exec(req.header('Authorization'))[1], 'base64').toString().split(':');
	const user = await SqlGet<teilnehmerRow>("SELECT * FROM teilnehmer WHERE number=?;", [number]);
	if(!user){
		res.status(403);
		res.json({success:false, error:'authentication error'});
		return;
	}

	if (user.pin === 0) {
		if(pin !== '0'){
			logger.log('warning', inspect`reset pin for ${user.name} (${user.number})`);
			await SqlRun(`UPDATE teilnehmer SET pin = ?, changed=1, timestamp=? WHERE uid=?;`, [pin, timestamp(), user.uid]);
		}
	}else if(user.pin+'' !== pin){
		res.status(403);
		res.json({success:false, error:'authentication error'});
		return;
	}

	req['user'] = user;
	next();
});

privateRouter.get('/', function(req, res, next) {
	res.json({success:true, error:'authenticated'});
});

privateRouter.patch('/edit', clientUpdate);


export default privateRouter;
