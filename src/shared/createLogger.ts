import * as winston from "winston";
import * as path from "path";
import config from '../shared/config';
import colors from '../shared/colors';


declare global {
	namespace NodeJS {
		interface Global {
			logger: winston.Logger<winston.config.NpmConfigSetLevels>;
		}
	}
}

function createLogger(loggingLevel:string|number, standartLog:string, errorLog:string, logToConsole:boolean, customLevels){
	colors.disable(config.disableColors);
	let levels = winston.config.npm.levels;
	let colours = winston.config.npm.colors;
	if(customLevels){
		winston.addColors(customLevels.colors);
		levels = customLevels.levels;
		colours = customLevels.colors;
	}
	let getLoggingLevel = ():string => {
		if (typeof loggingLevel === "number") {
			let level = Object.entries(levels).find(([, value]) => value === loggingLevel);
			if (level) return level[0];
		}
		if (typeof loggingLevel === "string") {
			if (levels.hasOwnProperty(loggingLevel))
				return loggingLevel;
		}
		// tslint:disable:no-console
		console.log("valid logging levels are:");
		console.log(
			Object .entries(levels)
			.map(([key, value])=>`${value}/${key}`)
			.join("\n")
		);
		// tslint:enable:no-console

		throw new Error("invalid logging level");
	};
	let resolvePath = (pathToResolve: string): string => {
		if (path.isAbsolute(pathToResolve)) return pathToResolve;
		return path.join(path.join(__dirname, "../.."), pathToResolve);
	};
	let transports = [];
	if (standartLog) transports.push(
		new winston.transports.File({
			filename: resolvePath(standartLog),
		})
	);
	if (errorLog) transports.push(
		new winston.transports.File({
			filename: resolvePath(errorLog),
			level: 'error',
		})
	);
	if (logToConsole) transports.push(
		new winston.transports.Console()
	);

	// let getLine = winston.format((info) => {
	// 	let line = new Error().stack.split("\n")[10];
	// 	if(line){
	// 		let file = line.split("(")[1];
	// 		if(file){
	// 			info.line = file.split("/").slice(-1)[0].slice(0, -1);
	// 		}
	// 	}
	// 	info.line = info.line||""
	// 	return info;
	// })();

	let formats = [];
	if(config.logDate) formats.push(winston.format.timestamp());
	if(!config.disableColors) formats.push(winston.format.colorize());
	// formats.push(getLine),
	const levelPadding = Math.max(...Object.keys(colours).map(x=>x.length));
	formats.push(winston.format.printf(info=>
		`${
			config.logDate?(info.timestamp.replace(/[TZ]/g," ")):""
		}${
			" ".repeat(levelPadding-info.level.replace(/\u001b\[\d{1,3}m/g,"").length)
		}${
			info.level
		}: ${
			info.message
		}`)
	);
	// formats.push(winston.format.printf(info => `${info.timestamp} ${(<any>info.level).padStart(17)} ${info.line}: ${info.message}`));

	global.logger = winston.createLogger({
		level: getLoggingLevel(),
		levels,
		format: winston.format.combine(...formats),
		exitOnError: false,
		transports, // : transports
	});

	logger.log('warning', "created logger");
}

export default createLogger;
