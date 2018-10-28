"use strict";

import * as express from "express";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as path from "path";
import { inspect } from "../SHARED/misc.js";
import router from "./routes/index.js";
import httpLogger from "../SHARED/httpLogger.js";

const logger = global.logger;


let app = express();

// view engine setup
app.set('views', path.join(__dirname,'../WEBSERVER/views'));
app.set('view engine', 'pug');

app.use(httpLogger.bind(null, (message:string, req:Request, res:Response)=>{
	if(req.url === '/'){
		logger.log('http', message);
	}else{
		logger.log('verbose http', message);
	}
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
app.use(express.static(path.join(__dirname, '../WEBSERVER/public')));
app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	let err = new Error('Not Found');
	err["status"] = 404;
	next(err);
});

app.use(function errorHandler(err, req, res, next) {
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
