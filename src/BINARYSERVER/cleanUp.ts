"use strict";

import { inspect, SqlQuery } from "../SHARED/misc";
import config from "../SHARED/config";

const logger = global.logger;

function cleanUp (){
return new Promise((resolve, reject)=>{
    if(config.keepDeletedFor!=null){
        logger.info(inspect`cleaning up`);
        let expiredAfter = Math.floor(Date.now() / 1000) - config.keepDeletedFor*86400;
        SqlQuery("DELETE FROM teilnehmer WHERE type=0 AND timestamp<=?",[expiredAfter])
        .then(res=>{
            if(res&&res.affectedRows>0) console.log(inspect`removed ${res.affectedRows} expired entries`);
            resolve();
        })
        .catch(err=>{logger.error(inspect`${err}`)});
    }
});
}
export default cleanUp;