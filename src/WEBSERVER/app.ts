"use strict";

import * as express from "express";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as path from "path";
import * as fs from "fs";
import { inspect } from "../SHARED/misc.js";
import router from "./routes/index.js";
import httpLogger from "../SHARED/httpLogger.js";

const logger = global.logger;


let app = express();

// view engine setup
app.set('views', path.join(__dirname,'../WEBSERVER/views'));
app.set('view engine', 'pug');

app.use(httpLogger.bind(null, (message:string, req:express.Request, res:express.Response)=>{
	if(req.originalUrl === '/'){
		logger.log('http', message);
	}else{
		logger.log('verbose http', message);
	}
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// hide impressum_template.html
app.get("/html/impressum_template.html", function(req, res, next) {
	let err = new Error('Not Found') as Error&{status:number};
	err.status = 404;
	next(err);
});


// print message if no impressum was configured
app.get("/html/impressum.html", function(req, res, next) {
	if(fs.existsSync(path.join(__dirname, '../WEBSERVER/public', 'html/impressum.html'))){
		next();
	}else{
		res.status(200);
		res.write('<!DOCTYPE html><meta charset="utf-8">');
		res.end("Der Websitebetreiber stellt kein Impressum zur Verfügung.");
	}
});

app.use(express.static(path.join(__dirname, '../WEBSERVER/public')));
app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	let err = new Error('Not Found');
	err["status"] = 404;
	next(err);
});

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

	res.locals.error = err;
	res.locals.message = err.message;

	res.render('error');
});

export default app;
