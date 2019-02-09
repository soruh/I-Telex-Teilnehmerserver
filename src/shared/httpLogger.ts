import { sleep, normalizeIp } from "../shared/misc.js";
import { Request, Response, NextFunction } from "express";
import colors from "../shared/colors.js";

async function httpLogger(callback:(message:string, req:Request, res:Response)=>void, req:Request, res:Response, next:NextFunction){
	let ip = normalizeIp(req.socket.remoteAddress);
	next();
	await sleep(0);
	let status = (res.statusCode||500).toString();
	
	let statusColors = ['Reset', 'FgYellow', 'FgGreen', 'FgCyan', 'FgMagenta', 'FgRed'];
	let statusColor = colors[statusColors[status.toString().length===3?status[0]:0]||'Reset'];

	let methodColors = {
		GET: 'FgGreen',
		POST: 'FgCyan',
		PUT: 'FgYellow',
		PATCH: 'FgMagenta',
		DELETE: 'FgRed',
	};
	let methodColor = colors[methodColors[req.method]||'Reset'];

	let message = '';
	message += (ip?ip.address:'UNKNOWN').padEnd(15);
	message += ' ';
	message += methodColor+req.method.padEnd(6)+colors.Reset;
	message += ' ';
	message += statusColor + status.padStart(3) + colors.Reset;
	message += ' ';
	message += decodeURI(req.originalUrl).replace(/(\/|\?|&)/g,`${colors.FgLightBlack}$1${colors.Reset}`);
	
	callback(message, req, res);
}
export default httpLogger;
