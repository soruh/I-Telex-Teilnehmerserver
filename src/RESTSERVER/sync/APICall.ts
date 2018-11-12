import * as https from "https";
import config from "../../SHARED/config";
import { inspect } from "../../SHARED/misc";


function APIcall(method:string, host:string, port:number, path:string, data?:any):Promise<any>{
	return new Promise((resolve, reject)=>{
		logger.log('debug', `making ${method} request to ${host}:${port}${path[0]==='/'?'':'/'}${path}`);

		let headers = {};
		let stringifiedData;
		if(data){
			try{
				stringifiedData = JSON.stringify({data});
			}catch(err){
				reject(err);
				return;
			}
			headers = {
				'content-type': 'application/json; charset=utf-8',
				'content-length': Buffer.byteLength(stringifiedData),
			};
		}

		const req = https.request({
			method,
			host,
			port,
			path,
			auth: 'admin:'+config.serverPin,
			headers,

			key: config.RESTKey,
			cert: config.RESTCert,

			rejectUnauthorized: true,
			ca: [config.RESTCert],
			checkServerIdentity: ()=>undefined, // don't check server identity
		} as https.RequestOptions, res=>{
			logger.log('debug', 'made API request');
			let buffer = "";
			res.on('data', data=>{
				buffer+=data.toString();
			});
			res.once('end', ()=>{
				logger.log('debug', 'API request ended');
				logger.log('silly', buffer);

				if(res.statusCode !== 200){
					logger.log('debug', `API call failed with code ${res.statusCode} (${res.statusMessage})`);
					reject(`${res.statusCode} (${res.statusMessage})`);
					return;
				}

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