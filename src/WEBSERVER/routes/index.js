"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql = require("mysql");
const express = require("express");
const config_js_1 = require("../../SHARED/config.js");
const misc_js_1 = require("../../SHARED/misc.js");
const edit_1 = require("./edit");
const list_1 = require("./list");
const download_1 = require("./download");
const logger = global.logger;
global.sqlPool = mysql.createPool(config_js_1.default.mySqlConnectionOptions);
const sqlPool = global.sqlPool;
sqlPool.getConnection(function (err, connection) {
    if (err) {
        logger.log('error', misc_js_1.inspect `could not connect to database!`);
        throw err;
    }
    else {
        logger.log('warning', misc_js_1.inspect `connected to database!`);
        connection.release();
    }
});
const router = express.Router();
router.get('/', function (req, res, next) {
    res.render('index');
});
router.post('/list', list_1.default);
router.post('/edit', edit_1.default);
router.get('/download', download_1.default);
exports.default = router;
