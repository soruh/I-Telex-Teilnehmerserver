"use strict";

import * as express from "express";
import * as bodyParser from "body-parser";
import adminRouter from "./routes/admin/index";
import publicRouter from "./routes/public/index";
import privateRouter from "./routes/private/index";

const logger = global.logger;
import { inspect } from "../SHARED/misc.js";
import httpLogger from "../SHARED/httpLogger";

let app = express();

app.use(httpLogger.bind(null, (message:string, req:express.Request, res:express.Response)=>{
	if(/^\/private/.test(req.originalUrl)){
		logger.log('private', message);
	}else if(/^\/public/.test(req.originalUrl)){
		logger.log('public', message);
	}else if(/^\/admin/.test(req.originalUrl)){
		logger.log('admin', message);
	}else{
		logger.log('others', message);
	}
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/admin', adminRouter);
app.use('/public', publicRouter);
app.use('/private', privateRouter);

app.get('/', function(req, res, next) {
	res.header('text/html');
	res.end('<!DOCTYPE html><h1>This is a rest API.</h1><br/><H2>For Documentation please visit</h2><br/><a href="https://github.com/soruh/I-Telex-Teilnehmerserver/">https://github.com/soruh/I-Telex-Teilnehmerserver/</a>');
	// TODO write documentation
});

// catch 404 and forward to error handler
app.use(function notFound(req, res, next) {
	let err = new Error('Not Found');
	err["status"] = 404;
	next(err);
});

// error handler
app.use(function errorHandler(err, req, res, next) {
	if(!(err instanceof Error)) err = new Error(err);
	if(err.status!==404){
		logger.log('error', inspect`${err}`);
	}
	
	if(!err.status){
		err.status = 500;
		err.message = "Internal Server Error";
	}
	res.status(err.status);
	res.header('Content-Type', 'text/html');
	res.end(`<!DOCTYPE html>\n<h1>${err.status}</h1><br/><h2>${err.message}</h2>`);
});

// console.log(app._router.stack);


export default app;
