//#region imports
import * as util from "util";
import * as mysql from "mysql";
import * as ip from "ip";
import * as net from "net";
import * as nodemailer from "nodemailer";
import config from '../SHARED/config.js';
import colors from "../SHARED/colors.js";


import * as ITelexCom from "../BINARYSERVER/ITelexCom.js";
import {lookup} from "dns";
import serialEachPromise from "../SHARED/serialEachPromise.js";
// import * as winston from "winston";
//#endregion
const logger = global.logger;

function isAnyError(error){
	if(error instanceof Error) return true;
	
	return false;
}
function inspect(substrings:TemplateStringsArray, ...values:any[]):string{
	var substringArray = Array.from(substrings);
	substringArray = substringArray.map(substring=>colors.FgGreen+substring+colors.Reset);
	values = values.map(value=>{
		if(typeof value === "string") return colors.FgCyan+value+colors.Reset;
		if(isAnyError(value)) return colors.FgRed+util.inspect(value)+colors.Reset;
		let inspected = util.inspect(value,{
			colors: !config.disableColors,
			depth:2,
		})
		if(!config.disableColors)
			inspected = inspected.replace(/\u0001b\[39m/g,colors.Reset);
		return inspected;
	});
	var combined = [];
	while(values.length+substringArray.length>0){
		if(substringArray.length>0) combined.push(substringArray.shift());
		if(values.length>0) combined.push(values.shift());
	}
	return combined.join('');
}

function getTimezone(date: Date) {
	let offset = -1 * date.getTimezoneOffset();
	let offsetStr = ( < any > (Math.floor(offset / 60)).toString()).padStart(2, "0") + ":" + ( < any > (offset % 60).toString()).padStart(2, "0");
	return "UTC" + (offset < 0 ? "" : "+") + offsetStr;
}

var errorCounters: {
	[index: string]:number;
} = {};

function increaseErrorCounter(serverkey: string, error: Error, code: string): void {
	if (errorCounters.hasOwnProperty(serverkey)) {
		errorCounters[serverkey]++;
	} else {
		errorCounters[serverkey] = 1;
	}
	let warn: boolean = config.warnAtErrorCounts.indexOf(errorCounters[serverkey]) > -1;
	logger.warn(inspect`increased errorCounter for server ${serverkey} to ${(warn?colors.FgRed:colors.FgCyan)+errorCounters[serverkey]+colors.Reset}`);
	if (warn)
		sendEmail("ServerError", {
			"host": serverkey.split(":")[0],
			"port": serverkey.split(":")[1],
			"errorCounter": errorCounters[serverkey].toString(),
			"lastError": code,
			"date": new Date().toLocaleString(),
			"timeZone": getTimezone(new Date())
		});
}

function resetErrorCounter(serverkey: string) {
	delete errorCounters[serverkey];
	logger.verbose(inspect`reset error counter for: ${serverkey}`);
}

function SqlQuery(query: string, options ? : any[]): Promise < any > {
	return new Promise((resolve, reject) => {
		query = query.replace(/\n/g, "").replace(/\s+/g, " ");

		logger.debug(inspect`${query} ${options || ""}`);
		
		{
			let formatted = mysql.format(query, options || []).replace(/\S*\s*/g, x => x.trim() + " ").trim();
			if (/(update)|(insert)/gi.test(query)) {
				logger.info(inspect`${formatted}`);
			} else {
				logger.verbose(inspect`${formatted}`);
			}
		}

		if (global.sqlPool) {
			global.sqlPool.query(query, options, function (err, res) {
				if (global.sqlPool["_allConnections"] && global.sqlPool["_allConnections"].length)
					logger.debug(inspect`number of open connections: ${global.sqlPool["_allConnections"].length}`);

				if (err) {
					logger.error(inspect`${err}`);
					reject(err);
				} else {
					// logger.debug(inspect`result:\n${res}`);
					resolve(res);
				}
			});
		} else {
			logger.error(inspect`sql pool is not set!`);
		}
	});
}

async function checkIp(data: number[] | Buffer, client: client) {
	if (config.doDnsLookups) {
		var arg: string = data.slice(1).toString().split("\n")[0].split("\r")[0];
		logger.info(inspect`checking if  belongs to any participant`);

		let ipAddr = "";
		if (ip.isV4Format(arg) || ip.isV6Format(arg)) {
			ipAddr = arg;
		} else {
			try {
				let {
					address,
					family
				} = await util.promisify(lookup)(arg);
				ipAddr = address;
				logger.verbose(inspect` resolved to `);
			} catch (e) {
				client.connection.end("ERROR\r\nnot a valid host or ip\r\n");
				logger.error(inspect`${e}`);
				return;
			}
		}

		if (ip.isV4Format(ipAddr) || ip.isV6Format(ipAddr)) {
			SqlQuery("SELECT  * FROM teilnehmer WHERE disabled != 1 AND type != 0;", [])
				.then((peers: ITelexCom.peerList) => {
					var ipPeers: {
						peer: ITelexCom.peer,
						ipaddress: string
					}[] = [];
					serialEachPromise(peers, peer =>
							new Promise((resolve, reject) => {
								if ((!peer.ipaddress) && peer.hostname) {
									// logger.debug(inspect`hostname: ${peer.hostname}`)
									lookup(peer.hostname, {}, function (err, address, family) {
										// if (err) logger.debug(inspect`${err}`);
										if (address) {
											ipPeers.push({
												peer,
												ipaddress: address
											});
											// logger.debug(inspect`${peer.hostname} resolved to ${address}`);
										}
										resolve();
									});
								} else if (peer.ipaddress && (ip.isV4Format(peer.ipaddress) || ip.isV6Format(peer.ipaddress))) {
									// logger.debug(inspect`ip: ${peer.ipaddress}`);
									ipPeers.push({
										peer,
										ipaddress: peer.ipaddress
									});
									resolve();
								} else {
									resolve();
								}
							})
						)
						.then(() => {
							let matches = ipPeers.filter(peer => ip.isEqual(peer.ipaddress, ipAddr)).map(x => x.peer.name);
							logger.debug(inspect`matching peers:${matches}`);
							if (matches.length > 0) {
								client.connection.end(`ok\r\n${matches.join("\r\n")}\r\n+++\r\n`);
							} else {
								client.connection.end("fail\r\n+++\r\n");
							}
						})
						.catch(err=>{logger.error(inspect`${err}`)});
				});
		} else {
			client.connection.end("error\r\nnot a valid host or ip\r\n");
		}
	} else {
		client.connection.end("error\r\nthis server does not support this function\r\n");
	}
}

function sendEmail(messageName: string, values: {
	[index: string]: string;
}): Promise < any > {
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
				html: ""
			};

			let type = message.html ? "html" : message.text ? "text" : null;
			// if(type){
			//	 mailOptions[type] = message[type];
			//	 for (let k in values) mailOptions[type] = mailOptions[type].replace(new RegExp(k.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g"), values[k]);
			// }
			if (type) {
				mailOptions[type] = (<string>message[type]).replace(/\[([^\]]*)\]/g, (match, key) =>values[key] || "NULL");
			} else {
				mailOptions.text = "configuration error in config/mailMessages.json";
			}
			logger.info(inspect`sending email of type ${messageName||"config error"}`);
			logger.debug(inspect`mail values: ${values}`);
			logger.verbose(inspect`sending mail:\n${mailOptions}\nto server ${global.transporter.options["host"]}`);

			( < nodemailer.Transporter > global.transporter).sendMail(mailOptions, function (error, info) {
				if (error) {
					//logger.debug(inspect`${error}`);
					reject(error);
				} else {
					logger.info(inspect`Message sent: ${info.messageId}`);
					if (config.eMail.useTestAccount)
						logger.warn(inspect`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
					resolve();
				}
			});
		}
	});
}

const symbolName = (s: symbol): string => (s && typeof s.toString === "function") ? /Symbol\((.*)\)/.exec(s.toString())[1] : "NULL";

// interface connection extends net.Socket {

// }
type connection = net.Socket;

interface client {
	name: string;
	connection: connection;
	state: symbol,
	ipAddress:string,
	writebuffer: ITelexCom.peer[];
	handleTimeout ? : NodeJS.Timer;
	cb ? : () => void;
	servernum ? : number;
	newEntries ? : number;
}

let clientName;

if(config.scientistNames){
	const names = [
		//mathematicians
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
	
		//pyhsicists
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
		"Lev Landau ",
		"Henri Becquerel",
		"Hans Bethe",
		"Philipp Lenard",
		"Murray Gell-Mann",
		"Luis Walter Alvarez",
		"Gustav Kirchhoff",
		"Arthur Eddington",
		"Eugene Paul ",
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
		"Isidor Isaac Rabi ",
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
	
	let randomName = function randomName() {
		return names[Math.floor(Math.random() * names.length)];
	}
	
	let lastnames = [];
	
	clientName = function clientName() {
		let name = randomName();
		while (lastnames.indexOf(name) > -1) name = randomName();
		lastnames.unshift(name);
		lastnames = lastnames.slice(0, 8);
	
		return name;
	}
}else{
	clientName = function clientName(){
	  let date = new Date()
	  let d = date.getTime()+date.getTimezoneOffset()*-60000;
	  return `${(<any>((Math.floor(d/3600000)%24).toString())).padStart(2,"0")}:${(<any>((Math.floor(d/60000)%60).toString())).padStart(2,"0")}:${(<any>((Math.floor(d/1000)%60)+"")).padStart(2,"0")},${(<any>((d%1000)+"")).padStart(3,"0")}`;
	}
}


export {
	SqlQuery,
	checkIp,
	sendEmail,
	increaseErrorCounter,
	resetErrorCounter,
	errorCounters,
	symbolName,
	client,
	clientName,
	getTimezone,
	inspect
}