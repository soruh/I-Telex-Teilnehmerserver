import config from "../../shared/config";
import * as crypto from "crypto";
import { inspect } from "../../shared/misc";

let salts = {};

function removeOldSalts(){
	for(let i in salts){
		if(Date.now()-new Date(salts[i]).getTime()>config.webServerTokenLifeTime){
			delete salts[i];
		}
	}
}

function createSalt(req, res) {
	try{
		removeOldSalts();
		
		const salt = crypto.randomBytes(32).toString('base64').slice(0,-1);
		salts[salt] = new Date().toJSON();
		
		logger.log('debug', inspect`created new salt: ${salt}`);

		res.json({
			successful: true,
			salt,
		});
	}catch(error){
		res.json({
			successful: false,
			error,
		});
	}
}

function isValidToken(suppliedToken:string, data:string, salt:string){
	logger.log('debug', inspect`checking if token ${suppliedToken} is valid for data: ${data}`);
	removeOldSalts();

	if(!salts.hasOwnProperty(salt)){
		logger.log('debug', inspect`salt is invalid`);
		return false;
	}

	const hash = crypto.createHash('sha256').update(salt+config.webInterfacePassword+data).digest();
	const correctToken = hash.toString('hex');

	if(suppliedToken === correctToken){
		logger.log('debug', inspect`token is valid`);
		delete salts[salt];
		return true;
	}else{
		logger.log('debug', inspect`${correctToken} !=\n${suppliedToken}`);
		logger.log('debug', inspect`token is invalid`);
		return false;
	}
}

export {
	createSalt,
	isValidToken
};
