"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const colors_1 = require("../colors");
const sqlite3 = require("sqlite3");
const sqlstring = require("sqlstring");
const path = require("path");
const misc_1 = require("../misc");
let db;
function connectToDb() {
    return new Promise((resolve, reject) => {
        const dbPath = path.isAbsolute(config_1.default.DBPath) ? config_1.default.DBPath : path.join(__dirname, '../../..', config_1.default.DBPath);
        db = new sqlite3.Database(dbPath, err => {
            if (err) {
                reject(err);
                return;
            }
            resolve(db);
        });
    });
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
function SqlEach(query, values, callback, verbose) {
    return new Promise((resolve, reject) => {
        db.each(prepareQuery(query, values, verbose), callback, (err, count) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(count);
        });
    });
}
exports.SqlEach = SqlEach;
function SqlAll(query, values, verbose) {
    return new Promise((resolve, reject) => {
        db.all(prepareQuery(query, values, verbose), (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}
exports.SqlAll = SqlAll;
function SqlGet(query, values, verbose) {
    return new Promise((resolve, reject) => {
        db.get(prepareQuery(query, values, verbose), (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}
exports.SqlGet = SqlGet;
function SqlRun(query, values, verbose) {
    return new Promise((resolve, reject) => {
        db.run(prepareQuery(query, values, verbose), function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this);
        });
    });
}
exports.SqlRun = SqlRun;
