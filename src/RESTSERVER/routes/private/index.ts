"use strict";

import * as express from "express";
import { SqlGet, teilnehmerRow } from "../../../SHARED/SQL";
import peerUpdate from "./peerUpdate";

const privateRouter = express.Router();


// Test Authorization header of all requests to /private/*
privateRouter.all('*', async function(req, res, next) {
	if(!(req.header('Authorization')&&/Basic (.*)/.test(req.header('Authorization')))){
		res.header("WWW-Authenticate", "Basic");
		res.status(401);
		res.json({success:false, error:'authentication error'});
		return;
	}
	const [number, pass] = Buffer.from(/Basic (.*)/.exec(req.header('Authorization'))[1], 'base64').toString().split(':');
	const user = await SqlGet<teilnehmerRow>("SELECT * FROM teilnehmer WHERE number=?;", [number]);
	if(!user){
		res.status(403);
		res.json({success:false, error:'authentication error'});
		return;
	}

	if(user.pin+'' !== pass){
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

privateRouter.patch('/edit', peerUpdate);


export default privateRouter;
