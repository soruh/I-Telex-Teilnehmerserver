"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const util = require("util");
const net = require("net");
const async = require("async");
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
//#endregion
const ITelexCom_js_1 = require("../BINARYSERVER/ITelexCom.js");
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
        if (ITelexCom_js_1.cv(1))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgGreen + " connected with ipaddress: " + colors_js_1.default.FgCyan + connection.remoteAddress + colors_js_1.default.Reset); //.replace(/^.*:/,'')
        connection.setTimeout(config_js_1.default.connectionTimeout);
        connection.on('timeout', function () {
            if (ITelexCom_js_1.cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgYellow + " timed out" + colors_js_1.default.Reset);
            connection.end();
        });
        connection.on('end', function () {
            if (client) {
                if (ITelexCom_js_1.cv(1))
                    if (client.newEntries != null)
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${client.newEntries}${colors_js_1.default.FgGreen} new entries${colors_js_1.default.Reset}`);
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgYellow + " disconnected" + colors_js_1.default.Reset);
                try {
                    clearTimeout(client.timeout);
                }
                catch (e) {
                    if (ITelexCom_js_1.cv(2))
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
                if (ITelexCom_js_1.cv(1))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "client " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgRed + " had an error:\n", err, colors_js_1.default.Reset);
                try {
                    clearTimeout(client.timeout);
                }
                catch (e) {
                    if (ITelexCom_js_1.cv(2))
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
            if (ITelexCom_js_1.cv(2)) {
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved data:" + colors_js_1.default.FgCyan + "<Buffer " + Array.from(data).map(x => (x < 16 ? "0" : "") + x.toString(16)).join(" ") + ">" + colors_js_1.default.Reset);
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + data.toString().replace(/[^ -~]/g, "·") + colors_js_1.default.Reset);
            }
            if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving ascii request" + colors_js_1.default.Reset);
                ITelexCom.ascii(data, client, pool); //TODO: check for fragmentation //probably not needed
            }
            else if (data[0] == 'c'.charCodeAt(0)) {
                ITelexCom.checkIp(data, client, pool);
            }
            else {
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving binary request" + colors_js_1.default.Reset);
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll("Buffer for client " + client.cnum + ":" + colors_js_1.default.FgCyan, client.readbuffer, colors_js_1.default.Reset);
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll("New Data for client " + client.cnum + ":" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
                var res = ITelexCom.checkFullPackage(data, client.readbuffer);
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll("New Buffer:" + colors_js_1.default.FgCyan, res[1], colors_js_1.default.Reset);
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll("Complete Package:" + colors_js_1.default.FgCyan, res[0], colors_js_1.default.Reset);
                if (res[1].length > 0) {
                    client.readbuffer = res[1];
                }
                if (res[0]) {
                    if (typeof client.packages != "object")
                        client.packages = [];
                    client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
                    let timeout = function () {
                        if (ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling: " + colors_js_1.default.FgCyan + client.handling + colors_js_1.default.Reset);
                        if (client.handling === false) {
                            client.handling = true;
                            if (client.timeout != null) {
                                clearTimeout(client.timeout);
                                client.timeout = null;
                            }
                            async.eachOfSeries((client.packages != undefined ? client.packages : []), function (pkg, key, cb) {
                                if ((ITelexCom_js_1.cv(1) && (Object.keys(client.packages).length > 1)) || ITelexCom_js_1.cv(2))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling package " + colors_js_1.default.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors_js_1.default.Reset);
                                ITelexCom.handlePackage(pkg, client, pool, function () {
                                    client.packages.splice(+key, 1);
                                    cb();
                                });
                            }, function () {
                                client.handling = false;
                            });
                        }
                        else {
                            if (client.timeout == null) {
                                client.timeout = setTimeout(timeout, 10);
                            }
                        }
                    };
                    timeout();
                }
            }
        });
    }
    catch (e) {
        if (ITelexCom_js_1.cv(0))
            logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
    }
});
server.on("error", err => logWithLineNumbers_js_1.lle("server error:", err));
function init() {
    if (ITelexCom_js_1.cv(0))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "Initialising!" + colors_js_1.default.Reset);
    server.listen(config_js_1.default.binaryPort, function () {
        if (ITelexCom_js_1.cv(0))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "server is listening on port " + colors_js_1.default.FgCyan + config_js_1.default.binaryPort, colors_js_1.default.Reset);
        timers.TimeoutWrapper(getFullQuery, config_js_1.default.fullQueryInterval);
        timers.TimeoutWrapper(updateQueue, config_js_1.default.updateQueueInterval);
        timers.TimeoutWrapper(sendQueue, config_js_1.default.queueSendInterval);
        getFullQuery();
        //updateQueue();
    });
}
function updateQueue() {
    return new Promise((resolve, reject) => {
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "updating " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.Reset);
        ITelexCom.SqlQuery(pool, "SELECT  * FROM teilnehmer WHERE changed = ?;", [1], function (changed) {
            if (changed.length > 0) {
                if (ITelexCom_js_1.cv(2)) {
                    var changed_numbers = [];
                    for (let o of changed) {
                        changed_numbers.push(o.number);
                    }
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "numbers to enqueue:" + colors_js_1.default.FgCyan, changed_numbers, colors_js_1.default.Reset);
                }
                if (ITelexCom_js_1.cv(1) && !ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + changed.length + colors_js_1.default.FgGreen + " numbers to enqueue" + colors_js_1.default.Reset);
                ITelexCom.SqlQuery(pool, "SELECT * FROM servers;", [], function (servers) {
                    if (servers.length > 0) {
                        async.each(servers, function (server, cb1) {
                            async.each(changed, function (message, cb2) {
                                ITelexCom.SqlQuery(pool, "SELECT * FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid], function (qentry) {
                                    if (qentry.length == 1) {
                                        ITelexCom.SqlQuery(pool, "UPDATE queue SET timestamp = ? WHERE server = ? AND message = ?;", [Math.floor(Date.now() / 1000), server.uid, message.uid], function () {
                                            //ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
                                            if (ITelexCom_js_1.cv(2))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.number, colors_js_1.default.Reset);
                                            cb2();
                                            //});
                                        });
                                    }
                                    else if (qentry.length == 0) {
                                        ITelexCom.SqlQuery(pool, "INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)], function () {
                                            //ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
                                            if (ITelexCom_js_1.cv(2))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.number, colors_js_1.default.Reset);
                                            cb2();
                                            //});
                                        });
                                    }
                                    else {
                                        logWithLineNumbers_js_1.lle("duplicate queue entry!");
                                        ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE server = ? AND message = ?;", [server.uid, message.uid], function () {
                                            ITelexCom.SqlQuery(pool, "INSERT INTO queue (server,message,timestamp) VALUES (?,?,?)", [server.uid, message.uid, Math.floor(Date.now() / 1000)], function () {
                                                //ITelexCom.SqlQuery(pool,"UPDATE teilnehmer SET changed = 0 WHERE uid="+message.uid+";", function(){
                                                if (ITelexCom_js_1.cv(2))
                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen, "enqueued:", colors_js_1.default.FgCyan, message.number, colors_js_1.default.Reset);
                                                cb2();
                                                //});
                                            });
                                        });
                                    }
                                });
                            }, cb1);
                        }, function () {
                            if (ITelexCom_js_1.cv(1))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "finished enqueueing" + colors_js_1.default.Reset);
                            if (ITelexCom_js_1.cv(2))
                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "reseting changed flags..." + colors_js_1.default.Reset);
                            ITelexCom.SqlQuery(pool, "UPDATE teilnehmer SET changed = ? WHERE uid=" + changed.map(entry => entry.uid).join(" or uid=") + ";", [0], function (res) {
                                if (ITelexCom_js_1.cv(2))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "reset " + colors_js_1.default.FgCyan + changed.length + colors_js_1.default.FgGreen + " changed flags." + colors_js_1.default.Reset);
                                //sendQueue();
                                resolve();
                            });
                        });
                    }
                    else {
                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No configured servers -> aborting " + colors_js_1.default.FgCyan + "updateQueue" + colors_js_1.default.Reset);
                        resolve();
                    }
                });
            }
            else {
                if (ITelexCom_js_1.cv(2))
                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "no numbers to enqueue" + colors_js_1.default.Reset);
                /*if(qwdec == null){
                    qwdec = "unknown";
                    //TODO qwd.stdin.write("sendQueue",callback);
            if(typeof callback === "function") callback();
                }else{
            if(typeof callback === "function") callback();
                }*/
                resolve();
                //setTimeout(updateQueue,config.updateQueueInterval);
            }
        });
    });
}
function getFullQuery() {
    return new Promise((resolve, reject) => {
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "geting " + colors_js_1.default.FgCyan + "FullQuery" + colors_js_1.default.Reset);
        /*if(readonly){
        ITelexCom.connect(pool,function(e){
        if(typeof callback === "function") callback();
        },{host:config.readonlyHost,port:config.readonlyPort},handles,function(client,client.cnum){
        client.write(ITelexCom.encPackage({packagetype:10,datalength:41,data:{pattern:'',version:1}}),function(){
            client.state = constants.states.FULLQUERY;
        });
        });
    }else{*/
        ITelexCom.SqlQuery(pool, "SELECT  * FROM servers;", [], function (servers) {
            if (servers.length > 0) {
                for (let i in servers) {
                    if (config_js_1.default.fullQueryServer && servers[i].addresse == config_js_1.default.fullQueryServer.split(":")[0] && servers[i].port == config_js_1.default.fullQueryServer.split(":")[1]) {
                        servers = [servers[i]];
                    }
                }
                async.eachSeries(servers, function (r, cb) {
                    connect_js_1.default(pool, function (e) {
                        try {
                            cb();
                        }
                        catch (e) {
                            if (ITelexCom_js_1.cv(2))
                                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                        }
                    }, {
                        host: r.addresse,
                        port: r.port
                    }, function (client) {
                        try {
                            let request = readonly ? {
                                packagetype: 10,
                                datalength: 41,
                                data: {
                                    pattern: '',
                                    version: 1
                                }
                            } : {
                                packagetype: 6,
                                datalength: 5,
                                data: {
                                    serverpin: config_js_1.default.serverPin,
                                    version: 1
                                }
                            };
                            client.connection.write(ITelexCom.encPackage(request), function () {
                                client.state = constants.states.FULLQUERY;
                                client.cb = cb;
                            });
                        }
                        catch (e) {
                            if (ITelexCom_js_1.cv(2))
                                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                            try {
                                cb();
                            }
                            catch (e) {
                                if (ITelexCom_js_1.cv(2))
                                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
                            }
                        }
                    });
                }, function () {
                    resolve();
                });
            }
            else {
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No configured servers -> aborting " + colors_js_1.default.FgCyan + "FullQuery" + colors_js_1.default.Reset);
                resolve();
            }
        });
        //}
    });
}
function sendQueue() {
    return new Promise((resolve, reject) => {
        if (ITelexCom_js_1.cv(2))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgMagenta + "sending " + colors_js_1.default.FgCyan + "Queue" + colors_js_1.default.Reset);
        if (readonly) {
            if (ITelexCom_js_1.cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "Read-only mode -> aborting " + colors_js_1.default.FgCyan + "sendQueue" + colors_js_1.default.Reset);
            resolve();
        }
        else {
            ITelexCom.SqlQuery(pool, "SELECT * FROM teilnehmer;", [], function (teilnehmer) {
                ITelexCom.SqlQuery(pool, "SELECT * FROM queue;", [], function (queue) {
                    if (queue.length > 0) {
                        var servers = {};
                        for (let q of queue) {
                            if (!servers[q.server])
                                servers[q.server] = [];
                            servers[q.server].push(q);
                        }
                        async.eachSeries(servers, function (server, cb) {
                            ITelexCom.SqlQuery(pool, "SELECT  * FROM servers WHERE uid=?;", [server[0].server], function (result2) {
                                if (result2.length == 1) {
                                    var serverinf = result2[0];
                                    if (ITelexCom_js_1.cv(2))
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
                                        let isConnected = connections.get(connection => connection.servernum == server[0].server);
                                        if (ITelexCom_js_1.cv(3))
                                            logWithLineNumbers_js_1.ll(isConnected);
                                        if (!isConnected) {
                                            connect_js_1.default(pool, cb, {
                                                host: serverinf.addresse,
                                                port: serverinf.port
                                            }, function (client) {
                                                client.servernum = server[0].server;
                                                if (ITelexCom_js_1.cv(1))
                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + 'connected to server ' + server[0].server + ': ' + serverinf.addresse + " on port " + serverinf.port + colors_js_1.default.Reset);
                                                client.writebuffer = [];
                                                async.each(server, function (serverdata, scb) {
                                                    if (ITelexCom_js_1.cv(2))
                                                        logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan, serverdata, colors_js_1.default.Reset);
                                                    var existing = null;
                                                    for (let t of teilnehmer) {
                                                        if (t.uid == serverdata.message) {
                                                            existing = t;
                                                        }
                                                    }
                                                    if (existing) {
                                                        ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE uid=?;", [serverdata.uid], function (res) {
                                                            if (res.affectedRows > 0) {
                                                                client.writebuffer.push(existing); //TODO
                                                                if (ITelexCom_js_1.cv(1))
                                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "deleted queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgGreen + " from queue" + colors_js_1.default.Reset);
                                                                scb();
                                                            }
                                                            else {
                                                                if (ITelexCom_js_1.cv(1))
                                                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "could not delete queue entry " + colors_js_1.default.FgCyan + existing.name + colors_js_1.default.FgRed + " from queue" + colors_js_1.default.Reset);
                                                                scb();
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        if (ITelexCom_js_1.cv(2))
                                                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgRed + "entry does not exist" + colors_js_1.default.FgCyan + colors_js_1.default.Reset);
                                                        scb();
                                                    }
                                                }, function () {
                                                    client.connection.write(ITelexCom.encPackage({
                                                        packagetype: 7,
                                                        datalength: 5,
                                                        data: {
                                                            serverpin: config_js_1.default.serverPin,
                                                            version: 1
                                                        }
                                                    }), function () {
                                                        client.state = constants.states.RESPONDING;
                                                        cb();
                                                    });
                                                });
                                            });
                                        }
                                        else {
                                            if (ITelexCom_js_1.cv(1))
                                                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "already connected to server " + server[0].server + colors_js_1.default.Reset);
                                            cb();
                                        }
                                    }
                                    catch (e) {
                                        if (ITelexCom_js_1.cv(2))
                                            logWithLineNumbers_js_1.lle(e);
                                        cb();
                                    }
                                }
                                else {
                                    ITelexCom.SqlQuery(pool, "DELETE FROM queue WHERE server=?;", [server[0].server], cb);
                                }
                            });
                        }, function () {
                            resolve();
                        });
                    }
                    else {
                        if (ITelexCom_js_1.cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "No queue!", colors_js_1.default.Reset);
                        resolve();
                    }
                });
            });
        }
    });
}
var pool = mysql.createPool(mySqlConnectionOptions); //TODO: pool(to many open connections)
pool.getConnection(function (err, connection) {
    if (err) {
        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, "Could not connect to database!", colors_js_1.default.Reset);
        throw err;
    }
    else {
        connection.release();
        if (ITelexCom_js_1.cv(0))
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
                        if (ITelexCom_js_1.cv(0))
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
            if (ITelexCom_js_1.cv(0))
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
if (ITelexCom_js_1.cv(3)) {
    let exitHandler = function exitHandler(options, err) {
        if (options.cleanup) {
            console.error("exited with code: " + err);
            console.error(`serverErrors:\n${util.inspect(ITelexCom.serverErrors, { depth: null })}`);
        }
        else {
            console.error(err);
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
