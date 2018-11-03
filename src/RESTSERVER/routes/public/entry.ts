"use strict";

import * as express from "express";
import { SqlQuery, SqlAll, SqlEach, SqlGet, SqlRun } from "../../../SHARED/SQL";
import { peerPropertiesPublic } from "../../../SHARED/constants";

const entryRouter = express.Router();

function parseIntStrict(string:string):number{
	let int = parseInt(string);
	if(isNaN(int)||int.toString() !== string){
		return NaN;
	}else{
		return int;
	}
}

entryRouter.get('*', async function(req, res, next) {
	try{
		let number = parseIntStrict(req.url.replace('/', ''));
		if(isNaN(number)){
			res.status(400);
			res.json({success:false, error:'Not an integer'});
			return;
		}
		let entry = await SqlGet(`SELECT ${peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1 AND number=?;`, [number]);
		if(!entry){
			res.status(404);
			res.json({success:false, error:'Not found'});
			return;
		}
		res.json({success:true, data:entry});
	}catch(err){
		next(err);
	}
});

export default entryRouter;
