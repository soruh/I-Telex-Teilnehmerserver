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
const net = require("net");
const config_js_1 = require("../COMMONMODULES/config.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const ITelexCom = require("../BINARYSERVER/ITelexCom.js");
const constants = require("../BINARYSERVER/constants.js");
const serialEachPromise_js_1 = require("../COMMONMODULES/serialEachPromise.js");
const misc_js_1 = require("./misc.js");
const cv = config_js_1.default.cv;
var binaryServer = net.createServer(function (connection) {
    var client = {
        name: misc_js_1.clientName(),
        connection: connection,
        state: constants.states.STANDBY,
        handling: false,
        readbuffer: null,
        writebuffer: null,
        packages: []
    };
    if (cv(1))
        logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "client " + colors_js_1.default.FgCyan + client.name + colors_js_1.default.FgGreen + " connected from ipaddress: " + colors_js_1.default.FgCyan + connection.remoteAddress + colors_js_1.default.Reset); //.replace(/^.*:/,'')
    connection.on('end', function () {
        if (client) {
            if (cv(1))
                if (client.newEntries != null)
                    logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}recieved ${colors_js_1.default.FgCyan}${client.newEntries}${colors_js_1.default.FgGreen} new entries${colors_js_1.default.Reset}`);
            if (cv(1))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + client.name + colors_js_1.default.FgYellow + " disconnected" + colors_js_1.default.Reset);
            clearTimeout(client.timeout);
            logWithLineNumbers_js_1.ll(`${colors_js_1.default.FgGreen}deleted connection ${colors_js_1.default.FgCyan + client.name + colors_js_1.default.FgGreen}${colors_js_1.default.Reset}`);
            client = null;
        }
    });
    connection.setTimeout(config_js_1.default.connectionTimeout);
    connection.on('timeout', function () {
        if (cv(1))
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgYellow + "client " + colors_js_1.default.FgCyan + client.name + colors_js_1.default.FgYellow + " timed out" + colors_js_1.default.Reset);
        connection.end();
    });
    connection.on('error', function (err) {
        logWithLineNumbers_js_1.lle(err);
        connection.end();
    });
    connection.on('data', function (data) {
        if (cv(2)) {
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "recieved data:" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
            logWithLineNumbers_js_1.ll(colors_js_1.default.FgCyan + data.toString().replace(/[^ -~]/g, "·") + colors_js_1.default.Reset);
        }
        if (data[0] == 'q'.charCodeAt(0) && /[0-9]/.test(String.fromCharCode(data[1])) /*&&(data[data.length-2] == 0x0D&&data[data.length-1] == 0x0A)*/) {
            if (cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving ascii request" + colors_js_1.default.Reset);
            ITelexCom.ascii(data, client);
        }
        else if (data[0] == 'c'.charCodeAt(0)) {
            misc_js_1.checkIp(data, client);
        }
        else {
            if (cv(2))
                logWithLineNumbers_js_1.ll(colors_js_1.default.FgGreen + "serving binary request" + colors_js_1.default.Reset);
            if (cv(2))
                logWithLineNumbers_js_1.ll("Buffer for client " + client.name + ":" + colors_js_1.default.FgCyan, client.readbuffer, colors_js_1.default.Reset);
            if (cv(2))
                logWithLineNumbers_js_1.ll("New Data for client " + client.name + ":" + colors_js_1.default.FgCyan, data, colors_js_1.default.Reset);
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
                        let nPackages = client.packages.length;
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
});
binaryServer.on("error", err => logWithLineNumbers_js_1.lle("server error:", err));
exports.default = binaryServer;
