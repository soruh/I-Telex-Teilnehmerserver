"use strict";

import * as express from "express";
import * as favicon from "serve-favicon";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as mysql from "mysql";
import * as path from "path";
import colors from "../SHARED/colors.js";
import config from '../SHARED/config.js';
import { inspect } from "../SHARED/misc.js";
import router from "./routes/index.js";

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




let app = express();

// view engine setup
app.set('views', path.join(__dirname,'../WEBSERVER/views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// app.use(morgan('dev'));
// app.use(morgan('tiny'));
// app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))
/*
app.use(morgan(function (tokens, req, res) {
	if (config.cv(2) || tokens.url(req, res) == "/") {
		let status = tokens.status(req, res)||"500";
		let color;
		switch (+status[0]) {
			case 1:
				color = colors.FgYellow;
				break;
			case 2:
				color = colors.FgGreen;
				break;
			case 3:
				color = colors.FgCyan;
				break;
			case 4:
			case 5:
			default:
				color = colors.FgRed;
		}
		let method = tokens.method(req, res);
		return [
			req["_remoteAddress"].padEnd(16),
			(
				method == "GET" ?
				colors.FgGreen:
				colors.FgCyan
			)+
			(<any>method).padEnd(4)+
			colors.Reset,

			color + (<any>status).padEnd(3) + colors.Reset,
			tokens.url(req, res).replace(/\//g, colors.FgLightBlack + "/" + colors.Reset)
		].join(' ');
	}
}));
*/
app.use((req, res, next)=>{
	let status:string = res.statusCode.toString()||"500";
	let color;
	switch (+status[0]) {
		case 1:
			color = colors.FgYellow;
			break;
		case 2:
			color = colors.FgGreen;
			break;
		case 3:
			color = colors.FgCyan;
			break;
		case 4:
		case 5:
		default:
			color = colors.FgRed;
	}
	let message = [
		(req.connection.remoteAddress.replace("::ffff:","")||"UNKNOWN").padEnd(16),
		(
			req.method === "GET" ?
			colors.FgGreen:
			colors.FgCyan
		)+
		req.method.padEnd(4)+
		colors.Reset,

		color + status.padEnd(3) + colors.Reset,
		req.url.replace(/\//g, colors.FgLightBlack + "/" + colors.Reset),
	].join(' ');
	
	if (req.url === "/") {
		logger.log('http', inspect`${message}`);
	}else{
		logger.log('verbose http', inspect`${message}`);
	}
	next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../WEBSERVER/public')));

app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	let err = new Error('Not Found');
	err["status"] = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development

	res.locals.message = err.message;
	res.locals.error = err;
	logger.log('error', inspect`${err}`);

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

export default app;
