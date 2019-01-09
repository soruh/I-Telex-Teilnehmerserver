"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("./sql/mysql");
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
const { connectToDb, SqlAll, SqlEach, SqlGet, SqlRun, } = sql;
exports.connectToDb = connectToDb;
exports.SqlAll = SqlAll;
exports.SqlEach = SqlEach;
exports.SqlGet = SqlGet;
exports.SqlRun = SqlRun;
