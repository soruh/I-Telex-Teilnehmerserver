"use strict";

import { inspect, timestamp } from "../SHARED/misc";
import { SqlQuery, SqlAll, SqlEach, SqlGet, SqlExec } from '../SHARED/SQL';

import config from "../SHARED/config";



function cleanUp(){
return new Promise((resolve, reject)=>{
	if(config.keepDeletedFor!=null){
		logger.log('debug', inspect`cleaning up`);
		let expiredAfter = timestamp() - config.keepDeletedFor*86400;
		SqlExec("DELETE FROM teilnehmer WHERE type=0 AND timestamp<=?",[expiredAfter])
		.then(res=>{
			if(res&&res.changes>0) logger.log('debug', inspect`removed ${res.changes} expired entries`);
			resolve();
		})
		.catch(err=>{logger.log('error', inspect`${err}`);});
	}else{
		logger.log('warning', inspect`config.keepDeletedFor not set, not cleaning up`);
		reject();
	}
});
}
export default cleanUp;
