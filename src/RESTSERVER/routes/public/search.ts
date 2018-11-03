import { NextFunction, Response, Request } from "express";
import { SqlQuery, SqlAll, SqlEach, SqlGet, SqlRun } from "../../../SHARED/SQL";
import { peerPropertiesPublic } from "../../../SHARED/constants";

async function search(req:Request, res:Response, next:NextFunction){
	try{
		const pattern = req.query.q;
		if(!pattern){
			res.status(400);
			res.json({success:false, error: 'No query'});
			return;
		}

		const searchWords = pattern.split(" ").map(q => `%${q}%`);
		const entries = await SqlAll(`SELECT ${peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1${" AND name LIKE ?".repeat(searchWords.length)};`, searchWords);
		if(entries.length === 0){
			res.status(404);
			res.json({success:false, error: 'Not found'});
			return;
		}
		res.json({success:true, data:entries});
	}catch(err){
		next(err);
	}
}
export default search;
