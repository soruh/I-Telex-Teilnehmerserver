import { NextFunction, Response, Request } from "express";
import { SqlAll, SqlEach, SqlGet, SqlRun, teilnehmerRow } from "../../../shared/SQL";
import { peerPropertiesPublic } from "../../../shared/constants";

async function entries(req:Request, res:Response, next:NextFunction){
	try{
		let entries = await SqlAll<teilnehmerRow>(`SELECT ${peerPropertiesPublic.join(',')} from teilnehmer where type!=0 AND disabled!=1;`, []);
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
export default entries;
