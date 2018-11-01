"use strict";

import { inspect, timestamp } from "../SHARED/misc";
import { SqlQuery, SqlAll, SqlEach, SqlGet } from '../SHARED/SQL';

import config from "../SHARED/config";



function cleanUp(){
return new Promise((resolve, reject)=>{
	if(config.keepDeletedFor!=null){
		logger.log('debug', inspect`cleaning up`);
		let expiredAfter = timestamp() - config.keepDeletedFor*86400;
		SqlQuery("DELETE FROM teilnehmer WHERE type=0 AND timestamp<=?",[expiredAfter])
		.then(res=>{
			if(res&&res.affectedRows>0) logger.log('debug', inspect`removed ${res.affectedRows} expired entries`);
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
