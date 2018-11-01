import config from "../../SHARED/config";
import * as crypto from "crypto";
import { inspect } from "../../SHARED/misc";

let salts = [];

function removeOldSalts(){
	for(let i in salts){
		if(Date.now()-new Date(salts[i]).getTime()>config.webServerTokenLifeTime){
			salts.splice(+i, 1);
		}
	}
}

function createSalt(req, res) {
	try{
		removeOldSalts();

		const salt = new Date().toJSON();
		salts.push(salt);
		
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

	const saltIndex = salts.indexOf(salt);

	if(saltIndex === -1){
		logger.log('debug', inspect`salt is invalid`);
		return false;
	}

	const hash = crypto.createHash('sha256').update(salt+config.webInterfacePassword+data).digest();
	const correctToken = Array.from(hash).map(x=>x.toString(16).padStart(2, '0')).join('');

	if(suppliedToken === correctToken){
		logger.log('debug', inspect`token is valid`);
		salts.splice(saltIndex, 1);
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
