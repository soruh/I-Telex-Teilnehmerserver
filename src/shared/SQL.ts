import * as sqlite3 from './sql/sqlite3';
import * as mysql from './sql/mysql';
import {queueRow, serversRow, teilnehmerRow} from "./sql/sql";
/*


import config from './config';
let isSqlite3 = false;


// tslint:disable:no-var-requires
if(require('mysql')){
	isSqlite3 = false;
}else if(require('sqlite3')&&config.DBPath){
	isSqlite3 = true;
}else{
	throw new Error("database type is inconclusive");
}
// tslint:enable:no-var-requires


let sql:typeof mysql|typeof sqlite3;
if (isSqlite3){
	sql = sqlite3;
}else{
	sql = mysql;
}
*/

const sql = mysql;

const {
	connectToDb,
	SqlAll,
	SqlEach,
	SqlGet,
	SqlRun,
} = sql;

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
