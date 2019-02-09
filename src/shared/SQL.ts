import {queueRow, serversRow, teilnehmerRow} from "./sql/sql";
import { inspect } from "./misc";
import sql_types from "./sql/sql_types";
import config from "./config";

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



	let sql:sql_types;
	if (config.useMysql){
		sql = mysql;
	}else{
		sql = sqlite3;
	}

	logger.log("warning", inspect`using ${config.useMysql?'mysql':'sqlite3'} database client`);

	if(!sql){
		logger.log("error", inspect`database client is not installed. please run "npm install ${config.useMysql?'mysql':'sqlite3'}"`);
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
