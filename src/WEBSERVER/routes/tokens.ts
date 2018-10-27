import config from "../../SHARED/config";
import * as crypto from "crypto";
import { inspect } from "../../SHARED/misc";

let tokens = {};

function removeOldTokens(){
	for(let salt in tokens){
		if(Date.now()-new Date(salt).getTime()>config.webServerTokenLifeTime){
			delete tokens[salt];
		}
	}
}

function createSalt(){
	// let salt = Array.from(new Date(Date.now()+Math.random()*60000).toISOString());
	return crypto.randomBytes(32).toString('base64').slice(0,-1)
}

function createToken(req, res) {
	try{
		const salt = createSalt();

		const hash = crypto.createHash('sha256').update(salt+config.webInterfacePassword).digest();

		const token = Array.from(hash).map(x=>x.toString(16).padStart(2, '0')).join('');
		
		removeOldTokens();
		tokens[salt] = token;

		res.header("Content-Type", "application/json; charset=utf-8");

		logger.log('debug', inspect`created new token: ${token}`);
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

function isValidToken(token){
	logger.log('debug', inspect`checking if token ${token} is valid`);
	removeOldTokens();
	for(let salt in tokens){
		if(tokens[salt] === token){
			logger.log('debug', inspect`token is valid`);
			delete tokens[salt];
			return true;
		}
	}
	logger.log('debug', inspect`token is invalid`);
	return false;
}

export {
	createToken,
	isValidToken
};
