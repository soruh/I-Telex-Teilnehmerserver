"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const config_1 = require("../config");
const colors_1 = require("../colors");
const sqlstring = require("sqlstring");
const misc_1 = require("../misc");
let db;
function testConnection() {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            reject("timed out");
        }, 10000);
        db.query("SELECT * FROM teilnehmer;", (err, res) => {
            clearTimeout(timeout);
            if (err) {
                reject(err);
                return;
            }
            else {
                resolve(true);
            }
        });
    });
}
async function connectToDb() {
    db = mysql.createPool(config_1.default.mysql);
    await testConnection();
    return db;
}
exports.connectToDb = connectToDb;
function prepareQuery(query, values, verbose) {
    query = query.replace(/\n/g, "").replace(/\s+/g, " ");
    logger.log('debug', misc_1.inspect `${query} ${values || []}`);
    const formatted = sqlstring.format(query, values || []).replace(/\S*\s*/g, x => x.trim() + " ").trim();
    if (verbose === undefined) {
        if (query.indexOf("teilnehmer") > -1) {
            logger.log('sql', misc_1.inspect `${(config_1.default.highlightSqlQueries ? colors_1.default.Reverse : "") + formatted + colors_1.default.Reset}`);
        }
        else {
            logger.log('verbose sql', misc_1.inspect `${(config_1.default.highlightSqlQueries ? colors_1.default.Reverse : "") + formatted + colors_1.default.Reset}`);
        }
    }
    else if (verbose === true) {
        logger.log('verbose sql', misc_1.inspect `${(config_1.default.highlightSqlQueries ? colors_1.default.Reverse : "") + formatted + colors_1.default.Reset}`);
    }
    else if (verbose === false) {
        logger.log('sql', misc_1.inspect `${(config_1.default.highlightSqlQueries ? colors_1.default.Reverse : "") + formatted + colors_1.default.Reset}`);
    }
    return formatted;
}
async function SqlEach(query, values, callback, verbose) {
    const res = await SqlAll(query, values, verbose);
    if (res instanceof Array) {
        for (let row of res) {
            callback(null, row);
        }
        return res.length;
    }
    else {
        return 0;
    }
}
exports.SqlEach = SqlEach;
function SqlAll(query, values, verbose) {
    return new Promise((resolve, reject) => {
        db.query(prepareQuery(query, values, verbose), (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}
exports.SqlAll = SqlAll;
async function SqlGet(query, values, verbose) {
    const res = await SqlAll(query, values, verbose);
    if (res instanceof Array) {
        return res[0];
    }
    else {
        return null;
    }
}
exports.SqlGet = SqlGet;
function SqlRun(query, values, verbose) {
    return new Promise((resolve, reject) => {
        db.query(prepareQuery(query, values, verbose), function (err, res) {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                changes: res.affectedRows,
            });
        });
    });
}
exports.SqlRun = SqlRun;
