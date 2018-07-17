"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const colors_js_1 = require("../COMMONMODULES/colors.js");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
const config_js_1 = require("../COMMONMODULES/config.js");
const cv = config_js_1.default.cv;
var types = {
    "C": "client",
    "S": "server"
};
exports.types = types;
var connections = {};
function get(loc) {
    if (config_js_1.default.logConnectionChanges)
        if (cv(2))
            logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}geting: ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow} from connections${colors_js_1.default.Reset}`);
    if (loc) {
        if (typeof loc === "string") {
            if (config_js_1.default.logConnectionChanges)
                if (cv(2))
                    logWithLineNumbers_js_1.llo(1, "getting connection by string key");
            let locArr = loc.split("|");
            let type = locArr[0];
            let number = locArr[1];
            if (connections[type] && connections[type][number] != null) {
                if (config_js_1.default.logConnectionChanges)
                    if (cv(2))
                        logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}got:\n${util.inspect(connections[type][number], { depth: 0 })}\nfor ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow}${colors_js_1.default.Reset}`);
                return connections[type][number];
            }
            else {
                if (config_js_1.default.logConnectionChanges)
                    if (cv(2))
                        logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}got: nothing for ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow}${colors_js_1.default.Reset}`);
                return null;
            }
        }
        else if (typeof loc === "function") {
            if (config_js_1.default.logConnectionChanges)
                if (cv(2))
                    logWithLineNumbers_js_1.llo(1, "getting connections matching function");
            let matches = [];
            for (let type in connections) {
                for (let index in connections[type]) {
                    let client = connections[type][index];
                    if (loc(client))
                        matches.push(client);
                }
            }
            if (config_js_1.default.logConnectionChanges)
                if (cv(2))
                    logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}got:\n${util.inspect(matches, { depth: 1 })}\nfor ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow}${colors_js_1.default.Reset}`);
            if (matches.length > 0) {
                return matches;
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}
exports.get = get;
function has(loc) {
    if (get(loc)) {
        return true;
    }
    else {
        return false;
    }
}
exports.has = has;
function add(loc, value) {
    if (loc) {
        if (config_js_1.default.logConnectionChanges)
            if (cv(2))
                logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}adding: ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow} to connections${colors_js_1.default.Reset}`);
        let locArr = loc.split("|");
        let type = locArr[0];
        let number = locArr[1];
        if (typeof connections[type] === "undefined") {
            connections[type] = {};
            logWithLineNumbers_js_1.ll(`Added connection subset for type ${type} (${types[type]})`);
        }
        if (number == null)
            number = findFree(type).toString();
        let cnum = type + "|" + number;
        if (typeof connections[type][number] === "undefined") {
            connections[type][number] = value;
            connections[type][number].cnum = cnum;
            return cnum;
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}
exports.add = add;
function remove(loc) {
    if (config_js_1.default.logConnectionChanges)
        if (cv(2))
            logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}removing: ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow} from connections${colors_js_1.default.Reset}`);
    if (loc) {
        let locArr = loc.split("|");
        let type = locArr[0];
        let number = locArr[1];
        if (has(loc)) { //data[type]&&connections[type][number]!=null){
            connections.cnum = null;
            delete connections[type][number];
            if (config_js_1.default.logConnectionChanges)
                if (cv(2))
                    logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}removed: ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow} from connections${colors_js_1.default.Reset}`);
            return true;
        }
        else {
            if (config_js_1.default.logConnectionChanges)
                if (cv(2))
                    logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}couldn't remove: ${colors_js_1.default.FgBlue}${loc}${colors_js_1.default.FgYellow} from connections${colors_js_1.default.Reset}`);
            return false;
        }
    }
    else {
        return false;
    }
}
exports.remove = remove;
function move(locOld, locNew) {
    if (locOld && locNew) {
        if (config_js_1.default.logConnectionChanges)
            if (cv(2))
                logWithLineNumbers_js_1.llo(1, `${colors_js_1.default.FgYellow}moving: ${colors_js_1.default.FgBlue}${locOld}${colors_js_1.default.FgYellow} to ${colors_js_1.default.FgBlue}${locNew}${colors_js_1.default.FgYellow} in connections${colors_js_1.default.Reset}`);
        let locOldArr = locOld.split("|");
        let typeOld = locOldArr[0];
        let numberOld = +locOldArr[1];
        if (connections[typeOld] && typeof connections[typeOld][numberOld] != "undefined") {
            var retLoc = add(locNew, connections[typeOld][numberOld]);
            if (retLoc)
                delete connections[typeOld][numberOld];
            return retLoc;
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}
exports.move = move;
function list(type) {
    if (type) {
        return util.inspect(connections[type], {
            depth: 1
        });
    }
    else {
        return util.inspect(connections, {
            depth: 2
        });
    }
}
exports.list = list;
function findFree(type) {
    if (!connections[type])
        connections[type] = {};
    let x = 0;
    while (connections[type][x] != null) {
        x++;
    }
    return x;
}
