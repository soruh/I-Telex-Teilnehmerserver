import config from "./config";
import colors from "./colors";
import * as sqlite from "sqlite3";
import * as sqlstring from "sqlstring";
import * as path from "path";
import { inspect, sleep } from "./misc";


let db:sqlite.Database;


interface queueRow {
	uid: number;
	server: number;
	message: number;
	timestamp: number;
}

interface serversRow {
	 uid: number;
	 address: string;
	 port: number;
	 version: number;
}

interface teilnehmerRow {
	uid: number;
	number: number;
	name: string;
	type: number;
	hostname: string;
	ipaddress: string;
	port: number;
	extension: number;
	pin: number;
	disabled: number;
	timestamp: number;
	changed: number;
}



function connectToDb(){
	return new Promise((resolve, reject)=>{
		db = new sqlite.Database(path.isAbsolute(config.DBPath)?config.DBPath:path.join(__dirname, '../..', config.DBPath), err=>{
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

function SqlEach<T>(query: string, values: any[], callback:(err:Error, row:T)=>void):Promise<number>{
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

function SqlAll<T>(query: string, values: any[]):Promise<T[]>{
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

function SqlGet<T>(query: string, values: any[]):Promise<T>{
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

function SqlRun(query: string, values: any[]):Promise<sqlite.RunResult>{
	return new Promise((resolve, reject) => {
		db.run(prepareQuery(query, values), function(err:Error){
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
	SqlRun,
	serversRow,
	queueRow,
	teilnehmerRow
};
