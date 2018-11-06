import * as http from "http";
import config from "../SHARED/config";
import { inspect } from "../SHARED/misc";


function APIcall(method:string, host:string, port:number, path:string, data?:any):Promise<any>{
	return new Promise((resolve, reject)=>{
		logger.log('debug', `making ${method} request to ${host}:${port}${path[0]==='/'?'':'/'}${path}`);

		let headers = {};
		let stringifiedData;
		if(data){
			try{
				stringifiedData = JSON.stringify(data);
			}catch(err){
				reject(err);
				return;
			}
			headers = {
				'content-lype': 'application/json; charset=utf-8',
				'content-length': Buffer.byteLength(stringifiedData),
			};
		}


		const req = http.request({
			method,
			host,
			port,
			path,
			auth: 'admin:'+config.serverPin,
			headers,
		}, res=>{
			logger.log('debug', 'made API request');
			let buffer = "";
			res.on('data', data=>{
				buffer+=data.toString();
			});
			res.once('end', ()=>{
				logger.log('debug', 'API request ended');
				try{
					const parsed = JSON.parse(buffer);
					if(parsed.success){
						resolve(parsed.data);
					}else{
						reject(parsed.error);
					}
				}catch(err){
					reject(err);
				}
			});
			res.once('error', err=>{
				reject(err);
				res.destroy();
			});
		});

		req.on('error', err=>{
			logger.log('error', inspect`${err}`);
			reject(err);
		});

		if(stringifiedData) req.write(stringifiedData);

		req.end();
	});
}
export default APIcall;
