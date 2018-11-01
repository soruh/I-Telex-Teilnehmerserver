"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const util = require("util");
const mysql = require("mysql");
const ip = require("ip");
const nodemailer = require("nodemailer");
const config_js_1 = require("../SHARED/config.js");
const colors_js_1 = require("../SHARED/colors.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
// import * as winston from "winston";
//#endregion
const textColor = colors_js_1.default.Reset;
const stringColor = colors_js_1.default.FgGreen;
const errorColor = colors_js_1.default.FgRed;
const sqlColor = colors_js_1.default.Reverse;
function timestamp() {
    return Math.floor(Date.now() / 1000);
}
exports.timestamp = timestamp;
function printDateAsISO(date) {
    return date.toISOString().replace('Z', ' ').replace('T', ' ');
}
function printDate() {
    const gmtDate = new Date();
    const gmtTime = gmtDate.getTime();
    const timezoneOffsetMillis = gmtDate.getTimezoneOffset() * -60 * 1000;
    const adjustedDate = new Date(gmtTime + timezoneOffsetMillis);
    return printDateAsISO(adjustedDate);
}
exports.printDate = printDate;
function isAnyError(error) {
    if (error instanceof Error)
        return true;
    return false;
}
function inspect(substrings, ...values) {
    let substringArray = Array.from(substrings).map(substring => textColor + substring + colors_js_1.default.Reset);
    values = values.map(value => {
        if (typeof value === "string")
            return stringColor + value + colors_js_1.default.Reset;
        if (isAnyError(value))
            return errorColor + util.inspect(value) + colors_js_1.default.Reset;
        let inspected = util.inspect(value, { colors: !config_js_1.default.disableColors });
        if (!config_js_1.default.disableColors)
            inspected = inspected.replace(/\u0001b\[39m/g, colors_js_1.default.Reset);
        return inspected;
    });
    let combined = [];
    while (values.length + substringArray.length > 0) {
        if (substringArray.length > 0)
            combined.push(substringArray.shift());
        if (values.length > 0)
            combined.push(values.shift());
    }
    return combined.join('');
}
exports.inspect = inspect;
function getTimezone(date) {
    let offset = -1 * date.getTimezoneOffset();
    let offsetStr = (Math.floor(offset / 60)).toString().padStart(2, "0") + ":" + (offset % 60).toString().padStart(2, "0");
    return `UTC${(offset < 0 ? "" : "+")}${offsetStr}`;
}
exports.getTimezone = getTimezone;
let serverErrorCounters = {};
exports.serverErrorCounters = serverErrorCounters;
let clientWrongPinCounters = {};
function increaseErrorCounter(type, identifier, code) {
    if (type === "server") {
        if (serverErrorCounters.hasOwnProperty(identifier)) {
            serverErrorCounters[identifier]++;
        }
        else {
            serverErrorCounters[identifier] = 1;
        }
        const warn = config_js_1.default.warnAtErrorCounts.indexOf(serverErrorCounters[identifier]) > -1;
        const counterColor = warn ? colors_js_1.default.FgRed : colors_js_1.default.FgCyan;
        logger.log('warning', inspect `increased errorCounter for server ${identifier} to ${counterColor + serverErrorCounters[identifier] + colors_js_1.default.Reset}`);
        if (warn) {
            sendEmail("ServerError", {
                host: identifier.split(":")[0],
                port: identifier.split(":")[1],
                errorCounter: serverErrorCounters[identifier].toString(),
                lastError: code,
                date: printDate(),
                timeZone: getTimezone(new Date()),
            });
        }
    }
    else if (type === "client") {
        if (clientWrongPinCounters.hasOwnProperty(identifier.number)) {
            clientWrongPinCounters[identifier.number]++;
        }
        else {
            clientWrongPinCounters[identifier.number] = 1;
        }
        const warn = config_js_1.default.warnAtWrongDynIpPinCounts.indexOf(clientWrongPinCounters[identifier.number]) > -1;
        const counterColor = warn ? colors_js_1.default.FgRed : colors_js_1.default.FgCyan;
        logger.log('warning', inspect `increased wrongPinCounter for client ${identifier.clientName} to ${counterColor + clientWrongPinCounters[identifier.number] + colors_js_1.default.Reset}`);
        if (warn) {
            sendEmail("wrongDynIpPin", {
                Ip: identifier.ip,
                number: identifier.number,
                name: identifier.name,
                counter: clientWrongPinCounters[identifier.number],
                date: printDate(),
                timeZone: getTimezone(new Date()),
            });
        }
    }
}
exports.increaseErrorCounter = increaseErrorCounter;
function resetErrorCounter(type, identifier) {
    if (type === "server") {
        if (serverErrorCounters.hasOwnProperty(identifier)) {
            sendEmail("ServerErrorOver", {
                host: identifier.split(":")[0],
                port: identifier.split(":")[1],
                errorCounter: serverErrorCounters[identifier].toString(),
                date: printDate(),
                timeZone: getTimezone(new Date()),
            });
            logger.log('debug', inspect `reset error counter for: ${identifier}. Counter was at: ${serverErrorCounters[identifier]}`);
            delete serverErrorCounters[identifier];
        }
    }
    else if (type === "client") {
        if (serverErrorCounters.hasOwnProperty(identifier.number)) {
            logger.log('debug', inspect `reset error counter for: ${identifier.clientName}. Counter was at: ${serverErrorCounters[identifier.number]}`);
            delete serverErrorCounters[identifier.number];
        }
    }
}
exports.resetErrorCounter = resetErrorCounter;
function SqlQuery(query, options, verbose) {
    return new Promise((resolve, reject) => {
        query = query.replace(/\n/g, "").replace(/\s+/g, " ");
        logger.log('debug', inspect `${query} ${options || []}`);
        {
            let formatted = mysql.format(query, options || []).replace(/\S*\s*/g, x => x.trim() + " ").trim();
            if (verbose === undefined) {
                if (query.indexOf("teilnehmer") > -1) {
                    logger.log('sql', inspect `${(config_js_1.default.highlightSqlQueries ? sqlColor : "") + formatted + colors_js_1.default.Reset}`);
                }
                else {
                    logger.log('verbose sql', inspect `${(config_js_1.default.highlightSqlQueries ? sqlColor : "") + formatted + colors_js_1.default.Reset}`);
                }
            }
            else if (verbose === true) {
                logger.log('verbose sql', inspect `${(config_js_1.default.highlightSqlQueries ? sqlColor : "") + formatted + colors_js_1.default.Reset}`);
            }
            else if (verbose === false) {
                logger.log('sql', inspect `${(config_js_1.default.highlightSqlQueries ? sqlColor : "") + formatted + colors_js_1.default.Reset}`);
            }
        }
        if (global.sqlPool) {
            global.sqlPool.query(query, options, function (err, res) {
                if (global.sqlPool["_allConnections"] && global.sqlPool["_allConnections"].length)
                    logger.log('silly', inspect `number of open connections: ${global.sqlPool["_allConnections"].length}`);
                if (err) {
                    logger.log('error', inspect `${err}`);
                    reject(err);
                }
                else {
                    // logger.log('debug', inspect`result:\n${res}`);
                    resolve(res);
                }
            });
        }
        else {
            logger.log('error', inspect `sql pool is not set!`);
        }
    });
}
exports.SqlQuery = SqlQuery;
function normalizeIp(ipAddr) {
    if (ip.isV4Format(ipAddr)) {
        return { family: 4, address: ipAddr };
    }
    else if (ip.isV6Format(ipAddr)) {
        let buffer = ip.toBuffer(ipAddr);
        for (let i = 0; i < 10; i++)
            if (buffer[i] !== 0)
                return { family: 6, address: ipAddr };
        for (let i = 10; i < 12; i++)
            if (buffer[i] !== 255)
                return { family: 6, address: ipAddr };
        let ipv4 = ip.toString(buffer, 12, 4);
        if (ip.isV4Format(ipv4)) {
            return { family: 4, address: ipv4 };
        }
        else {
            return { family: 6, address: ipAddr };
        }
    }
    else {
        return null;
    }
}
exports.normalizeIp = normalizeIp;
function sendEmail(messageName, values) {
    return new Promise((resolve, reject) => {
        let message = config_js_1.default.eMail.messages[messageName];
        if (!message) {
            resolve();
        }
        else {
            let mailOptions = {
                from: config_js_1.default.eMail.from,
                to: config_js_1.default.eMail.to,
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
                mailOptions[type] = message[type].replace(/\[([^\]]*)\]/g, (match, key) => {
                    if (values[key] == null) {
                        return "NULL";
                    }
                    else {
                        return values[key];
                    }
                });
            }
            else {
                mailOptions.text = "configuration error in config/mailMessages.json";
            }
            logger.log('network', inspect `sending email of type ${messageName || "config error"}`);
            logger.log('debug', inspect `mail values: ${values}`);
            logger.log('debug', inspect `sending mail:\n${mailOptions}\nto server ${global.transporter.options["host"]}`);
            global.transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    reject(error);
                }
                else {
                    logger.log('debug', inspect `Message sent: ${info.messageId}`);
                    if (config_js_1.default.eMail.useTestAccount)
                        logger.log('warning', inspect `Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
                    resolve();
                }
            });
        }
    });
}
exports.sendEmail = sendEmail;
function sendPackage(pkg) {
    return new Promise((resolve, reject) => {
        let client = this;
        logger.log('network', inspect `sending package of type ${pkg.type} to ${client.name}`);
        logger.log('debug', inspect `sending package ${pkg} to ${client.name}`);
        let encodeded = ITelexCom.encPackage(pkg);
        client.connection.write(encodeded, resolve);
    });
}
exports.sendPackage = sendPackage;
let clientName;
exports.clientName = clientName;
if (config_js_1.default.scientistNames) {
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
    let randomName = function () {
        return names[Math.floor(Math.random() * names.length)];
    };
    let lastnames = [];
    exports.clientName = clientName = function () {
        let name = randomName();
        while (lastnames.indexOf(name) > -1)
            name = randomName();
        lastnames.unshift(name);
        lastnames = lastnames.slice(0, 8);
        return name;
    };
}
else {
    exports.clientName = clientName = function () {
        return new Date().toISOString();
    };
}
