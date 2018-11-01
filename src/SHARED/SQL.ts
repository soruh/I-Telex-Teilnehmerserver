import config from "./config";
import colors from "./colors";
import * as sqlite from "sqlite3";
import * as sqlstring from "sqlstring";
import * as path from "path";
import { inspect, sleep } from "./misc";


let db:sqlite.Database;

// function connectToDb(){
// 	return new Promise((resolve, reject)=>{
// 		db = new sqlite.Database(path.join(__dirname, '../../db/telefonbuch.db'), err=>{
// 			if (err){
// 				reject(err);
// 				return;
// 			}
// 			resolve(db);
// 		});
// 	});
// }

function connectToDb(){
	return new Promise((resolve, reject)=>{
		db = new sqlite.Database(path.join(__dirname, '../../db/telefonbuch.db'), err=>{
			if (err){
				reject(err);
				return;
			}
			resolve(db);
		});
	});
}

function prepareQuery(query: string, values?: any[], verbose?:boolean){
	query = query.replace(/\n/g, "").replace(/\s+/g, " ");
	logger.log('debug', inspect`${query} ${values||[]}`);

	let formatted = sqlstring.format(query, values || []).replace(/\S*\s*/g, x => x.trim() + " ").trim();
	if(verbose === undefined){
		if (query.indexOf("teilnehmer") > -1) {
			logger.log('sql', inspect`${(config.highlightSqlQueries?colors.Reverse:"")+formatted+colors.Reset}`);
		} else {
			logger.log('verbose sql', inspect`${(config.highlightSqlQueries?colors.Reverse:"")+formatted+colors.Reset}`);
		}
	}else if(verbose === true){
		logger.log('verbose sql', inspect`${(config.highlightSqlQueries?colors.Reverse:"")+formatted+colors.Reset}`);
	}else if(verbose === false){
		logger.log('sql', inspect`${(config.highlightSqlQueries?colors.Reverse:"")+formatted+colors.Reset}`);
	}

	return formatted;
}


function SqlEach(query: string, values: any[], callback:(err:Error, rows)=>void):Promise<any>{
	return new Promise((resolve, reject) => {
		db.each(prepareQuery(query, values), callback, (err:Error, count:number)=>{
			if(err){
				reject(err);
				return;
			}
			resolve(count);
		});
	});
}

function SqlAll(query: string, values: any[]):Promise<any>{
	return new Promise((resolve, reject) => {
		db.all(prepareQuery(query, values), (err:Error, rows)=>{
			if(err){
				reject(err);
				return;
			}
			resolve(rows);
		});
	});
}

function SqlGet(query: string, values: any[]):Promise<any>{
	return new Promise((resolve, reject) => {
		db.get(prepareQuery(query, values), (err:Error, row)=>{
			if(err){
				reject(err);
				return;
			}
			resolve(row);
		});
	});
}


const SqlQuery = SqlAll;

export {
	connectToDb,
	SqlAll,
	SqlEach,
	SqlGet,
	SqlQuery,
};
