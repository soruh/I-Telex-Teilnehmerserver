"use strict";

import * as mysql from "mysql";
import * as express from "express";

import config from '../../SHARED/config.js';
import { inspect } from "../../SHARED/misc.js";
import edit from "./edit";
import list from "./list";
import download from "./download";


const logger = global.logger;
global.sqlPool = mysql.createPool(config.mySqlConnectionOptions);
const sqlPool = global.sqlPool;

sqlPool.getConnection(function(err, connection) {
	if (err) {
		logger.log('error', inspect`could not connect to database!`);
		throw err;
	} else {
		logger.log('warning', inspect`connected to database!`);
		connection.release();
	}
});

const index = express.Router();
index.get('/', function(req, res, next) {
	res.render('index');
});

index.post('/list', list);

index.post('/edit', edit);

index.get('/download', download);

export default index;
