interface configFile {
	mySqlConnectionOptions: {
		host: string,
		user: string,
		password: string,
		database: string,
		insecureAuth ? : boolean,

		connectTimeout ? : number,
		aquireTimeout ? : number,
		timeout ? : number
	};
	DynIpUpdateNameDifference: number;

	setChangedOnNewerEntry: boolean;
	allowInvalidPackageSizes: boolean;

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
	// updateQueueInterval: number,
	cleanUpInterval:number;
	queueSendInterval: number;
	fullQueryInterval: number;
	fullQueryServer: string;
	connectionTimeout: number;

	binaryserverLog: string;
	binaryserverErrorLog: string;
	logBinaryserverToConsole: boolean;

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
	
	warnAtErrorCounts: number[];
	scientistNames:boolean;

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

let collection: any = {};

let eMail: any = {};
// tslint:disable:no-var-requires
Object.assign(eMail, require("../../config/mailAccount.json"));
Object.assign(eMail, require("../../config/mailMessages.json"));

Object.assign(collection, {
	eMail,
});

Object.assign(collection, require("../../config/mysql.json"));
Object.assign(collection, require("../../config/logging.json"));
Object.assign(collection, require("../../config/misc.json"));
Object.assign(collection, require("../../config/timings.json"));
Object.assign(collection, require("../../config/serverpin.json"));
// tslint:enable:no-var-requires
const config: configFile = collection;

export default config;
