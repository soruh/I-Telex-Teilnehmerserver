"use strict";

import * as express from "express";
import * as bodyParser from "body-parser";
import publicRouter from "./routes/public/index";
import privateRouter from "./routes/private/index";
const logger = global.logger;
import { inspect } from "../SHARED/misc.js";
import httpLogger from "../SHARED/httpLogger";

let app = express();

app.use(httpLogger.bind(null, (message:string, req:Request, res:Response)=>{
	if(/^\/private/.test(req.url)){
		logger.log('private', message);
	}else if(/^\/public/.test(req.url)){
		logger.log('public', message);
	}else{
		logger.log('others', message);
	}
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


app.get('/', function(req, res, next) {
	res.end('<!DOCTYPE html>This is a rest API.<br/>For Documentation please visit<br/><a href="https://github.com/soruh/I-Telex-Teilnehmerserver/">https://github.com/soruh/I-Telex-Teilnehmerserver/</a>');
	// TODO write documentation
});
app.use('/public', publicRouter);
app.use('/private', privateRouter);

// catch 404 and forward to error handler
app.use(function notFound(req, res, next) {
	let err = new Error('Not Found');
	err["status"] = 404;
	next(err);
});

// error handler
app.use(function errorHandler(err, req, res, next) {
	if(err.status!==404){
		logger.log('error', inspect`${err}`);
	}
	
	if(!err.status){
		err.status = 500;
		err.message = "Internal Server Error";
	}
	res.status(err.status);
	res.end(`${err.status} (${err.message})`);
});

// console.log(app._router.stack);

export default app;
