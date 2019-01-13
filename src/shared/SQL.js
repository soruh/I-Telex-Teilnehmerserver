"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("./misc");
let { connectToDb, SqlAll, SqlEach, SqlGet, SqlRun, } = {
    connectToDb: _connectToDb,
};
exports.connectToDb = connectToDb;
exports.SqlAll = SqlAll;
exports.SqlEach = SqlEach;
exports.SqlGet = SqlGet;
exports.SqlRun = SqlRun;
function _connectToDb() {
    try {
        // tslint:disable-next-line:no-var-keyword no-var-requires
        var sqlite3 = require('./sql/sqlite3');
    }
    catch (err) { /**/ }
    try {
        // tslint:disable-next-line:no-var-keyword no-var-requires
        var mysql = require('./sql/mysql');
    }
    catch (err) { /**/ }
    let useMysqlEnv = parseInt(process.env.USE_MYSQL);
    if (isNaN(useMysqlEnv))
        useMysqlEnv = process.env.USE_MYSQL;
    let useMysql = Boolean(useMysqlEnv);
    let sql;
    if (useMysql) {
        sql = mysql;
    }
    else {
        sql = sqlite3;
    }
    logger.log("warning", misc_1.inspect `using ${useMysql ? 'mysql' : 'sqlite3'} database client`);
    if (!sql) {
        logger.log("error", misc_1.inspect `database client is not installed. please run "npm install ${useMysql ? 'mysql' : 'sqlite3'}"`);
        throw new Error('database client missing');
    }
    exports.SqlAll = SqlAll = sql.SqlAll;
    exports.SqlEach = SqlEach = sql.SqlEach;
    exports.SqlGet = SqlGet = sql.SqlGet;
    exports.SqlRun = SqlRun = sql.SqlRun;
    exports.connectToDb = connectToDb = sql.connectToDb;
    return connectToDb();
}
