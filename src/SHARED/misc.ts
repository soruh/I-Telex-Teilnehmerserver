//#region imports
import * as util from "util";
import * as mysql from "mysql";
import * as ip from "ip";
import * as net from "net";
import * as nodemailer from "nodemailer";
import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";


import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import { states } from "../BINARYSERVER/constants.js";
// import * as winston from "winston";
//#endregion


const textColor = colors.Reset;
const stringColor = colors.FgGreen;
const errorColor = colors.FgRed;
const sqlColor = colors.Reverse;


function timestamp() {
	return Math.floor(Date.now() / 1000);
}

function printDate(date:Date):string{
	return date.toISOString().replace('Z', ' ').replace('T', ' ');
}

function getTimestamp():string {
	let gmtDate = new Date();
	let gmtTime = gmtDate.getTime();
	let timezoneOffsetMillis = gmtDate.getTimezoneOffset()*-60*1000;
	
	let adjustedDate = new Date(gmtTime+timezoneOffsetMillis);

	return printDate(adjustedDate);
}

function isAnyError(error){
	if(error instanceof Error) return true;
	
	return false;
}

function inspect(substrings:TemplateStringsArray, ...values:any[]):string{
	let substringArray = Array.from(substrings).map(substring=>textColor+substring+colors.Reset);
	values = values.map(value=>{
		if(typeof value === "string") return stringColor+value+colors.Reset;
		if(isAnyError(value)) return errorColor+util.inspect(value)+colors.Reset;
		let inspected = util.inspect(value,{ colors: !config.disableColors });
		if(!config.disableColors) inspected = inspected.replace(/\u0001b\[39m/g,colors.Reset);
		return inspected;
	});
	let combined = [];
	while(values.length+substringArray.length>0){
		if(substringArray.length>0) combined.push(substringArray.shift());
		if(values.length>0) combined.push(values.shift());
	}
	return combined.join('');
}

function getTimezone(date: Date) {
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ((Math.floor(offset / 60)).toString() as any).padStart(2, "0") + ":" + ( (offset % 60).toString() as any).padStart(2, "0");
	return `UTC${(offset < 0 ? "" : "+")}${offsetStr}`;
}

let serverErrorCounters:    {[index: string]:number} = {};
let clientWrongPinCounters: {[index: string]:number} = {};

function increaseErrorCounter(type:"client", identifier:{
	name:string;
	clientName:string;
	number:string;
	ip:string;
}): void;
function increaseErrorCounter(type:"server", identifier:string, code:string): void;
function increaseErrorCounter(type, identifier, code?): void {
	if(type === "server"){
		if (serverErrorCounters.hasOwnProperty(identifier)) {
			serverErrorCounters[identifier]++;
		} else {
			serverErrorCounters[identifier] = 1;
		}
		const warn: boolean = config.warnAtErrorCounts.indexOf(serverErrorCounters[identifier]) > -1;
		const counterColor = warn?colors.FgRed:colors.FgCyan;
		logger.log('warning', inspect`increased errorCounter for server ${identifier} to ${counterColor+serverErrorCounters[identifier]+colors.Reset}`);
		if (warn){
			sendEmail("ServerError", {
				host: identifier.split(":")[0],
				port: identifier.split(":")[1],
				errorCounter: serverErrorCounters[identifier].toString(),
				lastError: code,
				date: getTimestamp(),
				timeZone: getTimezone(new Date()),
			});
		}
	}else if(type === "client"){
		if (clientWrongPinCounters.hasOwnProperty(identifier.number)) {
			clientWrongPinCounters[identifier.number]++;
		} else {
			clientWrongPinCounters[identifier.number] = 1;
		}

		const warn: boolean = config.warnAtWrongDynIpPinCounts.indexOf(clientWrongPinCounters[identifier.number]) > -1;
		const counterColor = warn?colors.FgRed:colors.FgCyan;
		logger.log('warning', inspect`increased wrongPinCounter for client ${identifier.clientName} to ${counterColor+clientWrongPinCounters[identifier.number]+colors.Reset}`);
		if (warn){
			sendEmail("wrongDynIpPin", {
				Ip: identifier.ip,
				number: identifier.number,
				name: identifier.name,
				counter: clientWrongPinCounters[identifier.number],
				date: getTimestamp(),
				timeZone: getTimezone(new Date()),
			});
		}
	}
}

function resetErrorCounter(type:"client", identifier:{
	name:string;
	clientName:string;
	number:string;
	ip:string;
}): void;
function resetErrorCounter(type:"server", identifier:string,): void;
function resetErrorCounter(type, identifier):void {
	if(type === "server"){
		if(serverErrorCounters.hasOwnProperty(identifier)){
			sendEmail("ServerErrorOver", {
				host: identifier.split(":")[0],
				port: identifier.split(":")[1],
				errorCounter: serverErrorCounters[identifier].toString(),
				date: getTimestamp(),
				timeZone: getTimezone(new Date()),
			});
			logger.log('debug', inspect`reset error counter for: ${identifier}. Counter was at: ${serverErrorCounters[identifier]}`);
			delete serverErrorCounters[identifier];
		}
	}else if(type === "client"){
		if(serverErrorCounters.hasOwnProperty(identifier.number)){
			logger.log('debug', inspect`reset error counter for: ${identifier.clientName}. Counter was at: ${serverErrorCounters[identifier.number]}`);
			delete serverErrorCounters[identifier.number];
		}
	}
}

function SqlQuery(query: string, options ? : any[], verbose?:boolean): Promise < any > {
	return new Promise((resolve, reject) => {
		query = query.replace(/\n/g, "").replace(/\s+/g, " ");

		logger.log('debug', inspect`${query} ${options||[]}`);
		
		{
			let formatted = mysql.format(query, options || []).replace(/\S*\s*/g, x => x.trim() + " ").trim();
			if(verbose === undefined){
				if (query.indexOf("teilnehmer") > -1) {
					logger.log('sql', inspect`${(config.highlightSqlQueries?sqlColor:"")+formatted+colors.Reset}`);
				} else {
					logger.log('verbose sql', inspect`${(config.highlightSqlQueries?sqlColor:"")+formatted+colors.Reset}`);
				}
			}else if(verbose === true){
				logger.log('verbose sql', inspect`${(config.highlightSqlQueries?sqlColor:"")+formatted+colors.Reset}`);
			}else if(verbose === false){
				logger.log('sql', inspect`${(config.highlightSqlQueries?sqlColor:"")+formatted+colors.Reset}`);
			}
		}

		if (global.sqlPool) {
			global.sqlPool.query(query, options, function(err, res) {
				if (global.sqlPool["_allConnections"] && global.sqlPool["_allConnections"].length)
					logger.log('silly', inspect`number of open connections: ${global.sqlPool["_allConnections"].length}`);

				if (err) {
					logger.log('error', inspect`${err}`);
					reject(err);
				} else {
					// logger.log('debug', inspect`result:\n${res}`);
					resolve(res);
				}
			});
		} else {
			logger.log('error', inspect`sql pool is not set!`);
		}
	});
}
function normalizeIp(ipAddr:string){
	if(ip.isV4Format(ipAddr)){
		return {family: 4, address: ipAddr};
	}else if(ip.isV6Format(ipAddr)){
		let buffer = ip.toBuffer(ipAddr);
		for(let i=0;i<10;i++) if(buffer[i] !== 0) return {family: 6, address: ipAddr};
		for(let i=10;i<12;i++) if(buffer[i] !== 255) return {family: 6, address: ipAddr};
		let ipv4 = ip.toString(buffer, 12, 4);
		if(ip.isV4Format(ipv4)){
			return {family: 4, address: ipv4};
		}else{
			return {family: 6, address: ipAddr};
		}
	}else{
		return null;
	}
}

interface mail_ipV6DynIpUpdate_options {
	Ip: string;
	number: string;
	date: string;
	timeZone: string;
}
interface mail_invalidNumber_options {
	Ip: string;
	number: string;
	date: string;
	timeZone: string;
}
interface mail_wrongDynIpType_options {
	type: string;
	Ip: string;
	number: string;
	name: string;
	date: string;
	timeZone: string;
}
interface mail_wrongDynIpPin_options {
	Ip: string;
	number: string;
	name: string;
	date: string;
	timeZone: string;
	counter: number;
}
interface mail_new_options {
	Ip: string;
	number: string;
	date: string;
	timeZone: string;
}
interface mail_wrongServerPin_options {
	Ip: string;
	date: string;
	timeZone: string;
}
interface mail_ServerError_options {
	host: string;
	port: string;
	errorCounter: string;
	lastError: string;
	date: string;
	timeZone: string;
}
interface mail_ServerErrorOver_options {
	host: string;
	port: string;
	errorCounter: string;
	date: string;
	timeZone: string;
}

function sendEmail(messageName:'invalidNumber',   values:mail_invalidNumber_options);
function sendEmail(messageName:'wrongDynIpType',  values:mail_wrongDynIpType_options);
function sendEmail(messageName:'wrongDynIpPin',   values:mail_wrongDynIpPin_options);
function sendEmail(messageName:'new',             values:mail_new_options);
function sendEmail(messageName:'wrongServerPin',  values:mail_wrongServerPin_options);
function sendEmail(messageName:'ServerError',     values:mail_ServerError_options);
function sendEmail(messageName:'ServerErrorOver', values:mail_ServerErrorOver_options);
function sendEmail(messageName:'ipV6DynIpUpdate', values:mail_ipV6DynIpUpdate_options);
function sendEmail(messageName, values) {
	return new Promise((resolve, reject) => {
		let message: {
			"subject": string,
			"html" ? : string,
			"text" ? : string
		} = config.eMail.messages[messageName];
		if (!message) {
			resolve();
		} else {
			let mailOptions = {
				from: config.eMail.from,
				to: config.eMail.to,
				subject: message.subject,
				text: "",
				html: "",
			};

			let type = message.html ? "html" : message.text ? "text" : null;
			// if(type){
			//     mailOptions[type] = message[type];
			//     for (let k in values) mailOptions[type] = mailOptions[type].replace(new RegExp(k.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g"), values[k]);
			// }
			if (type) {
				mailOptions[type] = (message[type] as string).replace(/\[([^\]]*)\]/g, (match, key) => {
					if(values[key] == null){
						return "NULL";
					}else{
						return values[key];
					}
				});
			} else {
				mailOptions.text = "configuration error in config/mailMessages.json";
			}
			logger.log('network', inspect`sending email of type ${messageName||"config error"}`);
			logger.log('debug', inspect`mail values: ${values}`);
			logger.log('debug', inspect`sending mail:\n${mailOptions}\nto server ${global.transporter.options["host"]}`);

			( global.transporter as nodemailer.Transporter).sendMail(mailOptions, function(error, info) {
				if (error) {
					reject(error);
				} else {
					logger.log('debug', inspect`Message sent: ${info.messageId}`);
					if (config.eMail.useTestAccount)
						logger.log('warning', inspect`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
					resolve();
				}
			});
		}
	});
}

function sendPackage(pkg:ITelexCom.Package_decoded) {
	return new Promise((resolve, reject)=>{
		let client = (this as Client);

		logger.log('network', inspect`sending package of type ${pkg.type} to ${client.name}`);
		logger.log('debug', inspect`sending package ${pkg} to ${client.name}`);
		let encodeded = ITelexCom.encPackage(pkg);
		client.connection.write(encodeded, resolve);
	});
}

// interface connection extends net.Socket {

// }
type connection = net.Socket;


interface Client {
	name: string;
	connection: connection;
	state: symbol;
	ipAddress:string;
	ipFamily:number;
	writebuffer: ITelexCom.Peer[];
	handleTimeout ? : NodeJS.Timer;
	cb ? : () => void;
	servernum ? : number;
	newEntries ? : number;
	sendPackage: typeof sendPackage;
}

let clientName;

if(config.scientistNames){
	const names = [
		// mathematicians
		"Isaac Newton",
		"Archimedes",
		"Carl F. Gauss",
		"Leonhard Euler",
		"Bernhard Riemann",
		"Henri Poincaré",
		"Joseph-Louis Lagrange",
		"Euclid",
		"David Hilbert",
		"Gottfried W. Leibniz",
		"Alexandre Grothendieck",
		"Pierre de Fermat",
		"Évariste Galois",
		"John von Neumann",
		"René Descartes",
		"Karl W. T. Weierstrass",
		"Srinivasa Ramanujan",
		"Hermann K. H. Weyl",
		"Peter G. L. Dirichlet",
		"Niels Abel",
		"Georg Cantor",
		"Carl G. J. Jacobi",
		"Brahmagupta",
		"Augustin Cauchy",
		"Arthur Cayley",
		"Emmy Noether",
		"Pythagoras",
		"Aryabhata",
		"Leonardo \"Fibonacci\"",
		"William R. Hamilton",
		"Apollonius",
		"Charles Hermite",
		"Pierre-Simon Laplace",
		"Carl Ludwig Siegel",
		"Diophantus",
		"Richard Dedekind",
		"Kurt Gödel",
		"Bháscara (II) Áchárya",
		"Felix Christian Klein",
		"Blaise Pascal",
		"Élie Cartan",
		"Archytas",
		"Godfrey H. Hardy",
		"Alhazen ibn al-Haytham",
		"Jean le Rond d'Alembert",
		"F.E.J. Émile Borel",
		"Julius Plücker",
		"Hipparchus",
		"Andrey N. Kolmogorov",
		"Joseph Liouville",
		"Eudoxus",
		"F. Gotthold Eisenstein",
		"Jacob Bernoulli",
		"Johannes Kepler",
		"Stefan Banach",
		"Jacques Hadamard",
		"Giuseppe Peano",
		"Panini",
		"André Weil",
		"Jakob Steiner",
		"Liu Hui",
		"Gaspard Monge",
		"Hermann G. Grassmann",
		"François Viète",
		"M. E. Camille Jordan",
		"Joseph Fourier",
		"Bonaventura Cavalieri",
		"Jean-Pierre Serre",
		"Marius Sophus Lie",
		"Albert Einstein",
		"Galileo Galilei",
		"James C. Maxwell",
		"Aristotle",
		"Girolamo Cardano",
		"Michael F. Atiyah",
		"Atle Selberg",
		"L.E.J. Brouwer",
		"Christiaan Huygens",
		"Alan M. Turing",
		"Jean-Victor Poncelet",
		"Pafnuti Chebyshev",
		"Henri Léon Lebesgue",
		"John E. Littlewood",
		"F. L. Gottlob Frege",
		"Alfred Tarski",
		"Shiing-Shen Chern",
		"James J. Sylvester",
		"Johann Bernoulli",
		"Ernst E. Kummer",
		"Johann H. Lambert",
		"George Pólya",
		"Felix Hausdorff",
		"Siméon-Denis Poisson",
		"Hermann Minkowski",
		"George D. Birkhoff",
		"Omar al-Khayyám",
		"Adrien M. Legendre",
		"Pappus",
		"Thales",
	
		// pyhsicists
		"Stephen Hawking",
		"Albert Einstein",
		"Nikola Tesla",
		"Isaac Newton",
		"Galileo Galilei",
		"Marie Curie",
		"Richard Feynman",
		"Archimedes",
		"Carl Sagan",
		"J. Robert Oppenheimer",
		"Michael Faraday",
		"Blaise Pascal",
		"Sally Ride",
		"Leonhard Euler",
		"Werner Heisenberg",
		"Vikram Sarabhai",
		"Niels Bohr",
		"Avicenna",
		"Ernest Rutherford",
		"Robert Hooke",
		"Erwin Schrödinger",
		"Jagadish Chandra Bose",
		"Max Planck",
		"Satyendra Nath Bose",
		"Enrico Fermi",
		"J J Thompson",
		"Paul Dirac",
		"Subrahmanyan Chandrasekhar",
		"C.V. Raman",
		"Pierre Curie",
		"Robert Boyle",
		"Kip Thorne",
		"Edward Teller",
		"Max Born",
		"Georges Lemaître",
		"William Thomson, 1st Baron Kelvin",
		"Abdus Salam",
		"Klaus Fuchs",
		"Thomas Kuhn",
		"Joseph Fourier",
		"Andrei Sakharov",
		"Heinrich Hertz",
		"William Shockley",
		"Lise Meitner",
		"Daniel Bernoulli",
		"Ludwig Boltzmann",
		"James Chadwick",
		"James Prescott Joule",
		"Wolfgang Pauli",
		"Amedeo Avogadro",
		"Henry Cavendish",
		"Louis de Broglie",
		"John Bardeen",
		"Georg Ohm",
		"Steven Chu",
		"Hermann von Helmholtz",
		"John Archibald Wheeler",
		"David Bohm",
		"Hendrik Lorentz",
		"Henry Moseley",
		"Steven Weinberg",
		"Meghnad Saha",
		"Lev Landau",
		"Henri Becquerel",
		"Hans Bethe",
		"Philipp Lenard",
		"Murray Gell-Mann",
		"Luis Walter Alvarez",
		"Gustav Kirchhoff",
		"Arthur Eddington",
		"Eugene Paul",
		"Evangelista Torricelli",
		"Anders Celsius",
		"Ernst Mach",
		"Julian Schwinger",
		"Robert Andrews Millikan",
		"Joseph Louis Gay-Lussac",
		"George Gamow",
		"Annie Jump Cannon",
		"Homi Bhabha",
		"Arnold Sommerfeld",
		"John Tyndall",
		"Albert Abraham Michelson",
		"Ernest Lawrence",
		"Lord Kelvin",
		"John Stewart Bell",
		"Frédéric Joliot-Curie",
		"Augustin-Jean Fresnel",
		"Isidor Isaac Rabi",
		"Maria Goeppert Mayer",
		"Arthur Compton",
		"Sir George Stokes, 1st Baronet",
		"Dennis Gabor",
		"Heike Kamerlingh Onnes",
		"Philip Warren Anderson",
		"Tsung-Dao Lee",
		"Max von Laue or Max b",
		"Franklin Diaz",
		"Hideki Yukawa",
	];
	
	let randomName = function() {
		return names[Math.floor(Math.random() * names.length)];
	};
	
	let lastnames = [];
	
	clientName = function() {
		let name = randomName();
		while (lastnames.indexOf(name) > -1) name = randomName();
		lastnames.unshift(name);
		lastnames = lastnames.slice(0, 8);
	
		return name;
	};
}else{
	clientName = function(){
		return new Date().toISOString();
	};
}


export {
	SqlQuery,
	sendEmail,
	increaseErrorCounter,
	resetErrorCounter,
	serverErrorCounters,
	Client,
	clientName,
	getTimezone,
	inspect,
	normalizeIp,
	sendPackage,
	getTimestamp,
	timestamp
};
