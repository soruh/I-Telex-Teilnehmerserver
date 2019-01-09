import * as mysql from "mysql";
import config from "../config";
import colors from "../colors";
import * as sqlstring from "sqlstring";
import * as path from "path";
import { inspect, sleep } from "../misc";



let db:mysql.Pool;

function testConnection(){
	return new Promise((resolve, reject) => {
		db.query("SELECT * FROM teilnehmer;" , (err, res)=>{
			if (err){
				reject(err);
				return;
			}else{
				resolve(true);
			}
		});
	});
}

async function connectToDb(){
	const retryInt = 10*1000;
	let maxTries = (60*1000)/retryInt;
	let tries = -1;

	while(++tries < maxTries){
		try{
			db = mysql.createPool(config.mysql);
			await testConnection();
			return db;
		}catch(err){
			logger.log('debug', inspect`err: ${err}`);
			logger.log('warning', `couldn't create pool; Retrying in ${retryInt}ms (try ${tries+1}/${maxTries})`);
			await sleep(retryInt);
		}
	}

	throw new Error("timeout in db connection");
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

async function SqlEach<T>(query: string, values: any[], callback:(err:Error, row:T)=>void, verbose?:boolean):Promise<number> {
	const res = await SqlAll<T>(query, values, verbose);
	if(res instanceof Array){
		for(let row of res){
			callback(null, row);
		}
		return res.length;
	}else{
		return 0;
	}
}

function SqlAll<T>(query: string, values: any[], verbose?:boolean):Promise<T[]>{
	return new Promise((resolve, reject) => {
		db.query(prepareQuery(query, values, verbose), (err:Error, rows:T[])=>{
			if(err){
				reject(err);
				return;
			}
			resolve(rows);
		});
	});
}

async function SqlGet<T>(query: string, values: any[], verbose?:boolean):Promise<T> {
	const res = await SqlAll<T>(query, values, verbose);
	if(res instanceof Array){
		return res[0];
	}else{
		return null;
	}
}

interface RunResult {
	changes: number;
}

function SqlRun(query: string, values: any[], verbose?:boolean):Promise<RunResult>{
	return new Promise((resolve, reject) => {
		db.query(prepareQuery(query, values, verbose), function(err:Error, res){
			if(err){
				reject(err);
				return;
			}
			resolve({
				changes: res.affectedRows,
			});
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
