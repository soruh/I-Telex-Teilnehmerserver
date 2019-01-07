import { NextFunction, Response, Request } from "express";
import { inspect } from "../../../shared/misc";
import { SqlAll, SqlEach, SqlGet, SqlRun, teilnehmerRow } from '../../../shared/SQL';

import { peerProperties } from "../../../shared/constants";
import config from "../../../shared/config";

async function getEntries(req:Request, res:Response, next:NextFunction){
	try{
		let entries = await SqlAll<teilnehmerRow>(`SELECT ${peerProperties.join(',')} from teilnehmer;`, []);
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

async function putEntries(req:Request, res:Response, next:NextFunction){
	try{
		if(!(req.body&&req.body.data)){
			res.status(400);
			res.json({success:false, error:"please supply 'data' field"});
			return;
		}

		let entries = req.body.data;
		try{
			if(typeof entries === "string") entries = JSON.parse(entries);
		}catch(err){
			res.status(400);
			res.json({success:false, error:"the 'data' field must contain valid JSON"});
			return;
		}

		if(!(entries instanceof Array)){
			res.status(400);
			res.json({success:false, error:"the 'data' field must contain an Array"});
			return;
		}

		logger.log('admin', `recieved ${inspect`${entries.length}`} dataset${entries.length===1?'':'s'}`);

		for(let entry of entries){

			const names = peerProperties.filter(name => entry.hasOwnProperty(name));
			const values = names.map(name => entry[name]);

			// tslint:disable-next-line:triple-equals
			if(entry.number == undefined||isNaN(parseInt(entry.number))||parseInt(entry.number).toString()!=entry.number){
				res.status(400);
				res.json({success:false, error:"the 'number' property must be a valid integer"});
				return;
			}

			// logger.log('admin', inspect`got dataset for: ${entry.name} (${entry.number})`);
			const existing = await SqlGet<teilnehmerRow>(`SELECT * from teilnehmer WHERE number = ?;`, [entry.number]);

			if (existing) {
				if (entry.timestamp <= existing.timestamp) {
					logger.log('debug', inspect`recieved entry is ${+existing.timestamp - entry.timestamp} seconds older and was ignored`);
					continue;
				}

				logger.log('admin', inspect`changed dataset for: ${entry.name}`);
				logger.log('debug', inspect`recieved entry is ${+entry.timestamp - existing.timestamp} seconds newer  > ${existing.timestamp}`);


				await SqlRun(`UPDATE teilnehmer SET ${names.map(name=>name+" = ?,").join("")} changed = ? WHERE number = ?;`, values.concat([config.setChangedOnNewerEntry ? 1 : 0, entry.number]));
			}else{
				if(entry.type === 0) {
					logger.log('debug', inspect`not inserting deleted entry: ${entry}`);
				}else{
					logger.log('admin', inspect`new dataset for: ${entry.name}`);
					await SqlRun(`INSERT INTO teilnehmer (${names.join(",")+(names.length>0?",":"")} changed) VALUES (${"?,".repeat(names.length+1).slice(0,-1)});`, values.concat([config.setChangedOnNewerEntry ? 1 : 0,]));
				}
			}
		}
		
		res.json({success:true});
	}catch(err){
		next(err);
	}
}

export {
	getEntries,
	putEntries,
};
