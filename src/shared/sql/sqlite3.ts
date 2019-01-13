import config from "../config";
import colors from "../colors";
import * as sqlite3 from "sqlite3";
import * as sqlstring from "sqlstring";
import * as path from "path";
import { inspect } from "../misc";


let db:sqlite3.Database;




function connectToDb():Promise<sqlite3.Database>{
	return new Promise<sqlite3.Database>((resolve, reject)=>{
		const dbPath = path.isAbsolute(config.DBPath)?config.DBPath:path.join(__dirname, '../../..', config.DBPath);
		db = new sqlite3.Database(dbPath, err=>{
			if (err){
				reject(err);
				return;
			}
			resolve(db);
		});
	});
}

function prepareQuery(query: string, values?: any[], verbose?:boolean):string{
	query = query.replace(/\n/g, "").replace(/\s+/g, " ");
	logger.log('debug', inspect`${query} ${values||[]}`);

	const formatted = sqlstring.format(query, values || []).replace(/\S*\s*/g, x => x.trim() + " ").trim();
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

function SqlEach<T>(query: string, values: any[], callback:(err:Error, row:T)=>void, verbose?:boolean):Promise<number>{
	return new Promise((resolve, reject) => {
		db.each(prepareQuery(query, values, verbose), callback, (err:Error, count:number)=>{
			if(err){
				reject(err);
				return;
			}
			resolve(count);
		});
	});
}

function SqlAll<T>(query: string, values: any[], verbose?:boolean):Promise<T[]>{
	return new Promise((resolve, reject) => {
		db.all(prepareQuery(query, values, verbose), (err:Error, rows:T[])=>{
			if(err){
				reject(err);
				return;
			}
			resolve(rows);
		});
	});
}

function SqlGet<T>(query: string, values: any[], verbose?:boolean):Promise<T>{
	return new Promise((resolve, reject) => {
		db.get(prepareQuery(query, values, verbose), (err:Error, row:T)=>{
			if(err){
				reject(err);
				return;
			}
			resolve(row);
		});
	});
}

function SqlRun(query: string, values: any[], verbose?:boolean):Promise<sqlite3.RunResult>{
	return new Promise((resolve, reject) => {
		db.run(prepareQuery(query, values, verbose), function(err:Error){
			if(err){
				reject(err);
				return;
			}
			resolve(this);
		});
	});
}


export {
	connectToDb,
	SqlAll,
	SqlEach,
	SqlGet,
	SqlRun
};
