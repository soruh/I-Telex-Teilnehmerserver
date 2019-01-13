import {queueRow, serversRow, teilnehmerRow} from "./sql/sql";
import { inspect } from "./misc";
import sql_types from "./sql/sql_types";

let {
	connectToDb,
	SqlAll,
	SqlEach,
	SqlGet,
	SqlRun,
} = {
	connectToDb: _connectToDb,
} as sql_types;

function _connectToDb(){
	try{
		// tslint:disable-next-line:no-var-keyword no-var-requires
		var sqlite3 = require('./sql/sqlite3');
	}catch(err){/**/}

	try{
		// tslint:disable-next-line:no-var-keyword no-var-requires
		var mysql = require('./sql/mysql');
	}catch(err){/**/}


	let useMysqlEnv:string|number = parseInt(process.env.USE_MYSQL);
	if(isNaN(useMysqlEnv)) useMysqlEnv = process.env.USE_MYSQL;
	let useMysql = Boolean(useMysqlEnv);

	let sql:sql_types;
	if (useMysql){
		sql = mysql;
	}else{
		sql = sqlite3;
	}

	logger.log("warning", inspect`using ${useMysql?'mysql':'sqlite3'} database client`);

	if(!sql){
		logger.log("error", inspect`database client is not installed. please run "npm install ${useMysql?'mysql':'sqlite3'}"`);
		throw new Error('database client missing');
	}

	SqlAll  = sql.SqlAll;
	SqlEach = sql.SqlEach;
	SqlGet  = sql.SqlGet;
	SqlRun  = sql.SqlRun;

	connectToDb = sql.connectToDb; 
	return connectToDb();
}

export {
	connectToDb,
	SqlAll,
	SqlEach,
	SqlGet,
	SqlRun,
	queueRow,
	serversRow,
	teilnehmerRow,
};
