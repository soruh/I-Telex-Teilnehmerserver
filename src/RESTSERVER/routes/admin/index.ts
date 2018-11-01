"use strict";

import * as express from "express";
import { getEntries, putEntries } from "./entries";

// !!!!! DO THIS BEFORE USAGE !!!!!
const PASSWORD = "admin"; // TODO change to config.serverpin
// !!!!! DO THIS BEFORE USAGE !!!!!

const adminRouter = express.Router();


// Test Authorization header of all requests to /private/*
adminRouter.all('/', function(req, res, next) {
	if(!(req.header('Authorization')&&/Basic (.*)/.test(req.header('Authorization')))){
		res.status(401);
		res.header("WWW-Authenticate", "Basic");
		res.json({success:false, error:'authentication error'});
		return;
	}
	let [user, pass] = Buffer.from(/Basic (.*)/.exec(req.header('Authorization'))[1], 'base64').toString().split(':');
	if(!(user === "admin"&&pass === PASSWORD)){
		res.status(403);
		res.json({success:false, error:'authentication error'});
		return;
	}
	next();
});

adminRouter.get('/', function(req, res, next) {
	res.json({success:true, error:'authenticated'});
});

adminRouter.get('/entries', getEntries);
adminRouter.put('/entries', putEntries);

export default adminRouter;