"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const util = require("util");
const net = require("net");
const async = require("async");
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const connections = require("../BINARYSERVER/connections.js");
const constants = require("../BINARYSERVER/constants.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const misc = require("../BINARYSERVER/misc.js");
const verbosity = config_js_1.default.loggingVerbosity;
var cv = level => level <= verbosity; //check verbosity
function connect(after, options, callback) {
    let onEnd = function () {
        //if (cv(2)) ll(`${colors.FgYellow}calling onEnd handler for server ${util.inspect(options)}${colors.Reset}`);
        try {
            after(client);
        }
        catch (e) {
            if (cv(0))
                logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
        }
    };
    try {
        let serverkey = options.host + ":" + options.port;
        if (cv(1))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "trying to connect to:" + colors_js_1.default.FgCyan + serverkey + colors_js_1.default.Reset);
        var socket = new net.Socket();
        var client = connections.get(connections.add("S", {
            connection: socket,
            readbuffer: new Buffer(0),
            state: constants.states.STANDBY,
            packages: [],
            handling: false,
            writebuffer: [],
        }));
        socket.setTimeout(config_js_1.default.connectionTimeout);
        socket.on('timeout', function () {
            try {
                if (cv(1))
                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "server: " + colors_js_1.default.FgCyan + serverkey + colors_js_1.default.FgRed + " timed out" + colors_js_1.default.Reset);
                // socket.emit("end");
                // socket.emit("error",new Error("timeout"));
                misc.increaseErrorCounter(serverkey, new Error("timed out"), "TIMEOUT");
                socket.end();
            }
            catch (e) {
                if (cv(0))
                    logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed, e, colors_js_1.default.Reset);
            }
            finally {
                if (typeof onEnd === "function")
                    onEnd();
            }
        });
        socket.on('data', function (data) {
            if (cv(2)) {
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved data:" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + data.toString().replace(/[^ -~]/g, "·") + colors_js_1.default.Reset);
            }
            try {
                //if(cv(2)) ll(colors.FgCyan,data,"\n"+colors.FgYellow,data.toString(),colors.Reset);
                // if(cv(2)) ll("Buffer for client "+client.cnum+":"+colors.FgCyan,client.readbuffer,colors.Reset);
                // if(cv(2)) ll("New Data for client "+client.cnum+":"+colors.FgCyan,data,colors.Reset);
                var res = ITelexCom.getCompletePackages(data, client.readbuffer);
                // if(cv(2)) ll("New Buffer "+client.cnum+":"+colors.FgCyan,res[1],colors.Reset);
                // if(cv(2)) ll("Package "+client.cnum+":"+colors.FgCyan,res[0],colors.Reset);
                client.readbuffer = res[1];
                if (res[0]) { //TODO: check if this is needed
                    client.packages = client.packages.concat(ITelexCom.decPackages(res[0]));
                    let timeout = function () {
                        if (cv(2))
                            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling: " + colors_js_1.default.FgCyan + client.handling + colors_js_1.default.Reset);
                        if (client.handling === false) {
                            client.handling = true;
                            if (client.timeout != null) {
                                clearTimeout(client.timeout);
                                client.timeout = null;
                            }
                            async.eachOfSeries(client.packages, function (pkg, key, cb) {
                                if ((cv(1) && (Object.keys(client.packages).length > 1)) || cv(2))
                                    logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "handling package " + colors_js_1.default.FgCyan + (+key + 1) + "/" + Object.keys(client.packages).length + colors_js_1.default.Reset);
                                ITelexCom.handlePackage(pkg, client, function () {
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
                /*if(res[0]){
                    handlePackage(decPackages(res[0]),client.cnum,socket,handles);
                }*/
            }
            catch (e) {
                if (cv(2))
                    logWithLineNumbers_js_1.lle(e);
            }
        });
        socket.on('error', function (error) {
            if (cv(3))
                logWithLineNumbers_js_1.lle(error);
            try {
                // if(error.code == "ECONNREFUSED"||error.code == "EHOSTUNREACH"){
                if (error["code"] != "ECONNRESET") { //TODO:  alert on ECONNRESET?
                    if (cv(1))
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgRed}server ${colors_js_1.default.FgCyan + util.inspect(options) + colors_js_1.default.FgRed} had an error${colors_js_1.default.Reset}`);
                    misc.increaseErrorCounter(serverkey, error, error["code"]);
                    if (cv(0))
                        logWithLineNumbers_js_1.lle(colors_js_1.default.FgRed + "server " + colors_js_1.default.FgCyan + serverkey + colors_js_1.default.FgRed + " could not be reached; errorCounter:" + colors_js_1.default.FgCyan, misc.errorCounters[serverkey], colors_js_1.default.Reset);
                }
                // } else {
                // 	if (cv(0)) lle(colors.FgRed, error, colors.Reset);
                // }
            }
            catch (e) {
                if (cv(2))
                    logWithLineNumbers_js_1.lle(e);
            }
            finally {
                if (connections.remove(client.cnum)) {
                    if (cv(1))
                        logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.Reset}`);
                    client = null;
                }
                if (typeof onEnd === "function")
                    onEnd();
            }
        });
        socket.on('end', function () {
            if (cv(1))
                if (client.newEntries != null)
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${client.newEntries}${colors_js_1.default.FgGreen} new entries${colors_js_1.default.Reset}`);
            if (cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "The connection to server " + colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.FgYellow + " ended!" + colors_js_1.default.Reset);
            if (connections.remove(client.cnum)) {
                if (cv(1))
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + client.cnum + colors_js_1.default.Reset}`);
                client = null;
            }
            if (typeof onEnd === "function")
                onEnd();
        });
        socket.connect(options, function (connection) {
            if (cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "connected to:" + colors_js_1.default.FgCyan, options, colors_js_1.default.FgGreen + "as server " + colors_js_1.default.FgCyan + client.cnum, colors_js_1.default.Reset);
            misc.resetErrorCounter(serverkey);
            if (typeof callback === "function")
                callback(client);
        });
    }
    catch (e) {
        if (cv(2))
            logWithLineNumbers_js_1.lle(e);
        if (typeof onEnd === "function")
            onEnd();
    }
}
exports.default = connect;
