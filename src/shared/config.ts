// tslint:disable:no-var-requires
import { readFileSync } from "fs";
import { isAbsolute, join } from "path";

//#region type
interface configFile {
	DynIpUpdateNameDifference: number;

	setChangedOnNewerEntry: boolean;

	logLineNumbers: boolean;
	logDate: boolean;
	highlightSqlQueries:boolean;
	bufferLogWithWhitespace: boolean;
	repairPm2Colors: boolean;
	logFullBuffer: boolean;
	explainBuffers: number;

	logConnectionChanges: boolean;
	serverPin: number;
	allowFullQueryInReadonly: boolean;
	allowLoginInReadonly: boolean;
	doDnsLookups: boolean;
	exitOnUncaughtException: boolean;

	cleanUpInterval:number;
	queueSendInterval: number;
	fullQueryInterval: number;
	fullQueryServer: string;
	connectionTimeout: number;

	binaryserverLog: string;
	binaryserverErrorLog: string;
	logBinaryserverToConsole: boolean;

	DBPath:string;

	keepDeletedFor:number;
	webserverLog: string;
	webserverErrorLog: string;
	logWebserverToConsole: boolean;

	binaryPort: number;
	binaryserverLoggingLevel: number | string;
	webserverLoggingLevel: number | string;
	disableColors: boolean;

	webServerTokenLifeTime: number;
	webServerPort: number;
	webInterfacePassword: string;

	RESTserverLoggingLevel: number | string;
	RESTserverLog:string;
	RESTserverErrorLog:string;
	logRESTserverToConsole:boolean;
	RESTServerPort:number;
	
	warnAtErrorCounts: number[];
	warnAtWrongDynIpPinCounts: number[];
	scientistNames:boolean;

	RESTKey:Buffer;
	RESTCert:Buffer;
	useClientCertificate:boolean;

	eMail: {
		useTestAccount: boolean,
		account: {
			host: string,
			port: number,
			secure: boolean,
			auth: {
				user: string,
				pass: string
			},
			tls: {
				rejectUnauthorized: boolean
			}
		},
		to: string,
		from: string,
		messages: {
			new: {
				subject: string,
				html: string
			},
			invalidNumber: {
				subject: string,
				html: string
			},
			wrongDynIpPin: {
				subject: string,
				html: string
			},
			wrongDynIpType: {
				subject: string,
				html: string
			},
			wrongServerPin: {
				subject: string,
				html: string
			},
			ServerError: {
				subject: string,
				html: string
			}
		}
	};
}
//#endregion

//#region email
let eMail: any = {};

Object.assign(eMail, require("../../config/mailAccount.json"));
Object.assign(eMail, require("../../config/mailMessages.json"));
//#endregion

//#region tls
const {RESTCertPath, RESTKeyPath} = require("../../config/tls.json");

function readCertFile(path):Buffer {
	function normalizePath(path){
		if(isAbsolute(path)){
			return path;
		}else{
			return join(__dirname, '../..', path);
		}
	}

	try{
		return readFileSync(normalizePath(path));
	}catch(err){
		(console as any).error(err);
		throw(new Error("couldn't load https certificates"));
	}
}

let RESTCert;
let RESTKey;

const tls = {
	get RESTCert(){
		if(!RESTCert) RESTCert = readCertFile(RESTCertPath);
		return RESTCert;
	},
	get RESTKey(){
		if(!RESTKey) RESTKey  = readCertFile(RESTKeyPath);
		return RESTKey;
	},
};
//#endregion

let collection: any = {};

Object.assign(collection, tls);
Object.assign(collection, { eMail });
Object.assign(collection, require("../../config/logging.json"));
Object.assign(collection, require("../../config/misc.json"));
Object.assign(collection, require("../../config/timings.json"));
Object.assign(collection, require("../../config/serverpin.json"));

const config: configFile = collection;

export default config;
