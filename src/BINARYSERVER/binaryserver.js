"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const util = require("util");
const net = require("net");
const mysql = require("mysql");
const timers = require("../BINARYSERVER/timers.js");
const config_js_1 = require("../COMMONMODULES/config.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const nodemailer = require("nodemailer");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const connections = require("../BINARYSERVER/connections.js");
const constants = require("../BINARYSERVER/constants.js");
const connect_js_1 = require("../BINARYSERVER/connect.js");
const transporter_js_1 = require("../BINARYSERVER/transporter.js");
const sqlPool_1 = require("../BINARYSERVER/sqlPool");
const misc = require("../BINARYSERVER/misc.js");
const serialEachPromise_js_1 = require("../COMMONMODULES/serialEachPromise.js");
//#endregion
const cv = config_js_1.default.cv;
const readonly = (config_js_1.default.serverPin == null);
if (readonly)
    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgMagenta}Starting in read-only mode!${colors_js_1.default.Reset}`);
if (config_js_1.default.disableColors)
    colors_js_1.default.disable();
const mySqlConnectionOptions = config_js_1.default['mySqlConnectionOptions'];
var server = net.createServer(function (connection) {
    try {
        var client = connections.get(connections.add("C", {
            connection: connection,
            state: constants.states.STANDBY,
            handling: false,
            readbuffer: null,
            writebuffer: null,
            packages: []
        }));
        //TODO: only get cnum from client.cnum!!!
        if (cv(1))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgGreen + " connected with ipaddress: " + colors_js_1.default.FgCyan + connection.remoteAddress + colors_js_1.default.Reset); //.replace(/^.*:/,'')
        connection.setTimeout(config_js_1.default.connectionTimeout);
        connection.on('timeout', function () {
            if (cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgYellow + " timed out" + colors_js_1.default.Reset);
            connection.end();
        });
        connection.on('end', function () {
            if (client) {
                if (cv(1))
                    if (client.newEntries != null)
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${client.newEntries}${colors_js_1.default.FgGreen} new entries${colors_js_1.default.Reset}`);
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgYellow + " disconnected" + colors_js_1.default.Reset);
                try {
                    clearTimeout(client.timeout);
                }
                catch (e) {
                    if (cv(2))
                        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                }
                if (client && connections.has(client.cnum) && connections.get(client.cnum) == client) {
                    if (connections.remove(client.cnum)) {
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgGreen}${colors_js_1.default.Reset}`);
                        client = null;
                    }
                }
            }
        });
        connection.on('error', function (err) {
            if (client) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgRed + " had an error:\n", err, colors_js_1.default.Reset);
                try {
                    clearTimeout(client.timeout);
                }
                catch (e) {
                    if (cv(2))
                        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                }
                if (client && connections.has(client.cnum) && connections.get(client.cnum) == client) {
                    if (connections.remove(client.cnum)) {
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.Reset}`);
                        client = null;
                    }
                }
            }
        });
        connection.on('data', function (data) {
            if (cv(2)) {
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved data:" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + data.toString().replace(/[^ -~]/g, "·") + colors_js_1.default.Reset);
            }
            if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
                if (cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving ascii request" + colors_js_1.default.Reset);
                ITelexCom.ascii(data, client); //TODO: check for fragmentation //probably not needed
            }
            else if (data[0] == 'c'.charCodeAt(0)) {
                misc.checkIp(data, client);
            }
            else {
                if (cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving binary request" + colors_js_1.default.Reset);
                if (cv(2))
                    logWithLineNumbers_js_1.ll("Buffer for client " + client.cnum + ":" + colors_js_1.default.FgCyan, client.readbuffer, colors_js_1.default.Reset);
                if (cv(2))
                    logWithLineNumbers_js_1.ll("New Data for client " + client.cnum + ":" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
                var res = ITelexCom.getCompletePackages(data, client.readbuffer);
                if (cv(2))
                    logWithLineNumbers_js_1.ll("New Buffer:" + colors_js_1.default.FgCyan, res[1], colors_js_1.default.Reset);
                if (cv(2))
                    logWithLineNumbers_js_1.ll("complete Package(s):" + colors_js_1.default.FgCyan, res[0], colors_js_1.default.Reset);
                client.readbuffer = res[1];
                if (res[0]) {
                    client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
                    let timeout = function () {
                        if (client.handling === false) {
                            client.handling = true;
                            if (client.timeout != null) {
                                clearTimeout(client.timeout);
                                client.timeout = null;
                            }
                            let nPackages = Object.keys(client.packages).length;
                            // let handled = 0;
                            serialEachPromise_js_1.default(client.packages, function (pkg, key) {
                                return __awaiter(this, void 0, void 0, function* () {
                                    if ((cv(1) && (nPackages > 1)) || cv(2))
                                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}handling package ${colors_js_1.default.FgCyan}${+key + 1}/${nPackages}${colors_js_1.default.Reset}`);
                                    return yield ITelexCom.handlePackage(pkg, client);
                                });
                            }
                            // (pkg, key)=>new Promise((resolve, reject)=>{
                            // 	if ((cv(1) && (nPackages > 1)) || cv(2)) ll(`${colors.FgGreen}handling package ${colors.FgCyan}${+key + 1}/${nPackages}${colors.Reset}`);
                            // 	ITelexCom.handlePackage(pkg, client)
                            // 	.then(()=>{
                            // 		// handled++;
                            // 		resolve();
                            // 	})
                            // 	.catch(lle);
                            // })
                            )
                                .then((res) => {
                                client.packages.splice(0, res.length); //handled);
                                client.handling = false;
                            })
                                .catch(logWithLineNumbers_js_1.lle);
                        }
                        else {
                            client.timeout = setTimeout(timeout, 10);
                        }
                    };
                    timeout();
                }
            }
        });
    }
    catch (e) {
        if (cv(0))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
    }
});
server.on("error", err => logWithLineNumbers_js_1.lle("server error:", err));
function init() {
    if (cv(0))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Initialising!" + colors_js_1.default.Reset);
    server.listen(config_js_1.default.binaryPort, function () {
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "server is listening on port " + colors_js_1.default.FgCyan + config_js_1.default.binaryPort, colors_js_1.default.Reset);
        timers.TimeoutWrapper(getFullQuery, config_js_1.default.fullQueryInterval);
        timers.TimeoutWrapper(updateQueue, config_js_1.default.updateQueueInterval);
        timers.TimeoutWrapper(sendQueue, config_js_1.default.queueSendInterval);
        getFullQuery();
        //updateQueue();
    });
}
function updateQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            if (cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "updating " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.Reset);
            misc.SqlQuery("SELECT  * FROM teilnehmer WHERE changed = ?;", [1])
                .then(function (changed) {
                if (changed.length > 0) {
                    if (cv(2)) {
                        var changed_numbers = [];
                        for (let o of changed) {
                            changed_numbers.push(o.number);
                        }
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "numbers to enqueue:" + colors_js_1.default.FgCyan, changed_numbers, colors_js_1.default.Reset);
                    }
                    if (cv(1) && !cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + changed.length + colors_js_1.default.FgGreen + " numbers to enqueue" + colors_js_1.default.Reset);
                    misc.SqlQuery("SELECT * FROM servers;")
                        .then(function (servers) {
                        if (servers.length > 0) {
                            serialEachPromise_js_1.default(servers, server => serialEachPromise_js_1.default(changed, (message) => misc.SqlQuery("SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
                                .then(function (qentry) {
                                if (qentry.length == 1) {
                                    misc.SqlQuery("UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [Math.floor(Date.now() / 1000), server.uid, message.uid])
                                        .then(function () {
                                        //misc.SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        if (cv(2))
                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.number, colors_js_1.default.Reset);
                                        //})
                                        //.catch(lle);
                                    })
                                        .catch(logWithLineNumbers_js_1.lle);
                                }
                                else if (qentry.length == 0) {
                                    misc.SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
                                        .then(function () {
                                        //misc.SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                        //.then(function(){
                                        if (cv(2))
                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.number, colors_js_1.default.Reset);
                                        //})
                                        //.catch(lle);
                                    })
                                        .catch(logWithLineNumbers_js_1.lle);
                                }
                                else {
                                    logWithLineNumbers_js_1.lle("duplicate queue entry!");
                                    misc.SqlQuery("DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid])
                                        .then(function () {
                                        misc.SqlQuery("INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)])
                                            .then(function () {
                                            //misc.SqlQuery("UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";")
                                            //.then(function(){
                                            if (cv(2))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.number, colors_js_1.default.Reset);
                                            //})
                                            //.catch(lle);
                                        })
                                            .catch(logWithLineNumbers_js_1.lle);
                                    })
                                        .catch(logWithLineNumbers_js_1.lle);
                                }
                            })
                                .catch(logWithLineNumbers_js_1.lle)))
                                .then(() => {
                                if (cv(1))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "finished enqueueing" + colors_js_1.default.Reset);
                                if (cv(2))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "reseting changed flags..." + colors_js_1.default.Reset);
                                misc.SqlQuery("UPDATE teilnehmer SET changed = ? WHERE uid=" + changed.map(entry => entry.uid).join(" or uid=") + ";", [0])
                                    .then(function (res) {
                                    if (cv(2))
                                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "reset " + colors_js_1.default.FgCyan + changed.length + colors_js_1.default.FgGreen + " changed flags." + colors_js_1.default.Reset);
                                    //sendQueue();
                                    resolve();
                                })
                                    .catch(logWithLineNumbers_js_1.lle);
                            })
                                .catch(logWithLineNumbers_js_1.lle);
                        }
                        else {
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No configured servers -> aborting " + colors_js_1.default.FgCyan + "updateQueue" + colors_js_1.default.Reset);
                            resolve();
                        }
                    })
                        .catch(logWithLineNumbers_js_1.lle);
                }
                else {
                    if (cv(2))
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "no numbers to enqueue" + colors_js_1.default.Reset);
                    resolve();
                }
            })
                .catch(logWithLineNumbers_js_1.lle);
        });
    });
}
function getFullQuery() {
    return new Promise((resolve, reject) => {
        if (cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "geting " + colors_js_1.default.FgCyan + "FullQuery" + colors_js_1.default.Reset);
        misc.SqlQuery("SELECT  * FROM servers;")
            .then(function (servers) {
            if (servers.length > 0) {
                for (let i in servers) {
                    if (config_js_1.default.fullQueryServer && servers[i].addresse == config_js_1.default.fullQueryServer.split(":")[0] && servers[i].port == config_js_1.default.fullQueryServer.split(":")[1]) {
                        servers = [servers[i]];
                    }
                }
                serialEachPromise_js_1.default(servers, server => new Promise((resolve, reject) => {
                    connect_js_1.default(resolve, {
                        host: server.addresse,
                        port: +server.port
                    })
                        .then(client => {
                        let request;
                        if (readonly) {
                            request = {
                                packagetype: 10,
                                data: {
                                    pattern: '',
                                    version: 1
                                }
                            };
                        }
                        else {
                            request = {
                                packagetype: 6,
                                data: {
                                    serverpin: config_js_1.default.serverPin,
                                    version: 1
                                }
                            };
                        }
                        client.connection.write(ITelexCom.encPackage(request), function () {
                            client.state = constants.states.FULLQUERY;
                            client.cb = resolve;
                        });
                    })
                        .catch(logWithLineNumbers_js_1.lle);
                }))
                    .then(resolve)
                    .catch(logWithLineNumbers_js_1.lle);
            }
            else {
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No configured servers -> aborting " + colors_js_1.default.FgCyan + "FullQuery" + colors_js_1.default.Reset);
                resolve();
            }
        })
            .catch(logWithLineNumbers_js_1.lle);
        //}
    });
}
function sendQueue() {
    return new Promise((resolve, reject) => {
        if (cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "sending " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.Reset);
        if (readonly) {
            if (cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "Read-only mode -> aborting " + colors_js_1.default.FgCyan + "sendQueue" + colors_js_1.default.Reset);
            resolve();
        }
        else {
            misc.SqlQuery("SELECT * FROM teilnehmer;")
                .then(function (teilnehmer) {
                misc.SqlQuery("SELECT * FROM queue;")
                    .then(function (queue) {
                    if (queue.length > 0) {
                        var servers = {};
                        for (let q of queue) {
                            if (!servers[q.server])
                                servers[q.server] = [];
                            servers[q.server].push(q);
                        }
                        serialEachPromise_js_1.default(Object.values(servers), (server) => new Promise((resolve, reject) => {
                            misc.SqlQuery("SELECT  * FROM servers WHERE uid=?;", [server[0].server])
                                .then(function (result2) {
                                if (result2.length == 1) {
                                    var serverinf = result2[0];
                                    if (cv(2))
                                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, serverinf, colors_js_1.default.Reset);
                                    try {
                                        // var isConnected = false;
                                        // for (let key in connections) {
                                        // 	if (connections.has(key)) {
                                        // 		var c = connections[key];
                                        // 	}
                                        // 	if (c.servernum == server[0].server) {
                                        // 		var isConnected = true;
                                        // 	}
                                        // }
                                        let isConnected = connections.has(connection => connection.servernum == server[0].server);
                                        if (!isConnected) {
                                            connect_js_1.default(resolve, {
                                                host: serverinf.addresse,
                                                port: +serverinf.port
                                            })
                                                .then(client => {
                                                client.servernum = server[0].server;
                                                if (cv(1))
                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + 'connected to server ' + server[0].server + ': ' + serverinf.addresse + " on port " + serverinf.port + colors_js_1.default.Reset);
                                                client.writebuffer = [];
                                                serialEachPromise_js_1.default(server, serverdata => new Promise((resolve, reject) => {
                                                    if (cv(2))
                                                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, serverdata, colors_js_1.default.Reset);
                                                    var existing = null;
                                                    for (let t of teilnehmer) {
                                                        if (t.uid == serverdata.message) {
                                                            existing = t;
                                                        }
                                                    }
                                                    if (existing) {
                                                        misc.SqlQuery("DELETE FROM queue WHERE uid=?;", [serverdata.uid])
                                                            .then(function (res) {
                                                            if (res.affectedRows > 0) {
                                                                client.writebuffer.push(existing); //TODO
                                                                if (cv(1))
                                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "deleted queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgGreen + " from queue" + colors_js_1.default.Reset);
                                                                resolve();
                                                            }
                                                            else {
                                                                if (cv(1))
                                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "could not delete queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgRed + " from queue" + colors_js_1.default.Reset);
                                                                resolve();
                                                            }
                                                        })
                                                            .catch(logWithLineNumbers_js_1.lle);
                                                    }
                                                    else {
                                                        if (cv(2))
                                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "entry does not exist" + colors_js_1.default.FgCyan + colors_js_1.default.Reset);
                                                        resolve();
                                                    }
                                                }))
                                                    .then(() => {
                                                    client.connection.write(ITelexCom.encPackage({
                                                        packagetype: 7,
                                                        data: {
                                                            serverpin: config_js_1.default.serverPin,
                                                            version: 1
                                                        }
                                                    }), () => {
                                                        client.state = constants.states.RESPONDING;
                                                        resolve();
                                                    });
                                                })
                                                    .catch(logWithLineNumbers_js_1.lle);
                                            })
                                                .catch(logWithLineNumbers_js_1.lle);
                                        }
                                        else {
                                            if (cv(1))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "already connected to server " + server[0].server + colors_js_1.default.Reset);
                                            resolve();
                                        }
                                    }
                                    catch (e) {
                                        if (cv(2))
                                            logWithLineNumbers_js_1.lle(e);
                                        resolve();
                                    }
                                }
                                else {
                                    misc.SqlQuery("DELETE FROM queue WHERE server=?;", [server[0].server])
                                        .then(resolve)
                                        .catch(logWithLineNumbers_js_1.lle);
                                }
                            })
                                .catch(logWithLineNumbers_js_1.lle);
                        }))
                            .then(() => {
                            resolve();
                        })
                            .catch(logWithLineNumbers_js_1.lle);
                    }
                    else {
                        if (cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No queue!", colors_js_1.default.Reset);
                        resolve();
                    }
                })
                    .catch(logWithLineNumbers_js_1.lle);
            })
                .catch(logWithLineNumbers_js_1.lle);
        }
    });
}
sqlPool_1.setPool(mysql.createPool(mySqlConnectionOptions));
sqlPool_1.getPool().getConnection(function (err, connection) {
    if (err) {
        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, "Could not connect to database!", colors_js_1.default.Reset);
        throw err;
    }
    else {
        connection.release();
        if (cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Successfully connected to database!" + colors_js_1.default.Reset);
        if (module.parent === null) {
            if (config_js_1.default.eMail.useTestAccount) {
                nodemailer.createTestAccount(function (err, account) {
                    if (err) {
                        logWithLineNumbers_js_1.lle(err);
                        transporter_js_1.setTransporter({
                            sendMail: function sendMail() {
                                logWithLineNumbers_js_1.lle("can't send mail after Mail error");
                            },
                            options: {
                                host: "Failed to get test Account"
                            }
                        });
                    }
                    else {
                        if (cv(0))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Got email test account:\n" + colors_js_1.default.FgCyan + util.inspect(account) + colors_js_1.default.Reset);
                        transporter_js_1.setTransporter(nodemailer.createTransport({
                            host: 'smtp.ethereal.email',
                            port: 587,
                            secure: false,
                            auth: {
                                user: account.user,
                                pass: account.pass // generated ethereal password
                            }
                        }));
                    }
                    init();
                });
            }
            else {
                transporter_js_1.setTransporter(nodemailer.createTransport(config_js_1.default.eMail.account));
                init();
            }
        }
        else {
            if (cv(0))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Was required by another file -> Initialising exports" + colors_js_1.default.Reset);
            module.exports = {
                init: init,
                updateQueue: updateQueue,
                getFullQuery: getFullQuery,
                ITelexCom: ITelexCom
            };
        }
    }
});
if (cv(3)) {
    let exitHandler = function exitHandler(options, err) {
        if (options.cleanup) {
            logWithLineNumbers_js_1.lle("exited with code: " + err);
            logWithLineNumbers_js_1.lle(`serverErrors:\n${util.inspect(misc.serverErrors, { depth: null })}`);
        }
        else {
            logWithLineNumbers_js_1.lle(err);
        }
        if (options.exit)
            process.exit(options.code);
    };
    process.on('exit', exitHandler.bind(null, {
        cleanup: true
    }));
    process.on('SIGINT', exitHandler.bind(null, {
        exit: true,
        code: -1
    }));
    process.on('uncaughtException', exitHandler.bind(null, {
        exit: true,
        code: -2
    }));
    process.on('SIGUSR1', exitHandler.bind(null, {
        exit: true,
        code: -3
    }));
    process.on('SIGUSR2', exitHandler.bind(null, {
        exit: true,
        code: -4
    }));
}
