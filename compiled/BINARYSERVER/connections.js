"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const logWithLineNumbers_js_1 = require("../COMMONMODULES/logWithLineNumbers.js");
var types = {
    "C": "client",
    "S": "server"
};
exports.types = types;
var connections = {};
function get(loc) {
    // llo(1,`${colors.FgYellow}geting: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
    if (loc) {
        let locArr = loc.split("|");
        let type = locArr[0];
        let number = locArr[1];
        if (connections[type] && connections[type][number] != null) {
            // llo(1,`${colors.FgYellow}got:\n${util.inspect(connections[type][number],{depth:0})}\nfor ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
            return connections[type][number];
        }
        else {
            // llo(1,`${colors.FgYellow}got: nothing for ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
            return null;
        }
    }
    else {
        return null;
    }
}
exports.get = get;
function has(loc) {
    // llo(1,`${colors.FgYellow}geting: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
    if (loc) {
        let locArr = loc.split("|");
        let type = locArr[0];
        let number = locArr[1];
        if (connections[type] && connections[type][number] != null) {
            // llo(1,`${colors.FgYellow}got:\n${util.inspect(connections[type][number],{depth:0})}\nfor ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
            return true;
        }
        else {
            // llo(1,`${colors.FgYellow}got: nothing for ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
            return false;
        }
    }
    else {
        return false;
    }
}
exports.has = has;
function add(loc, value) {
    if (loc) {
        // llo(1,`${colors.FgYellow}adding: ${colors.FgBlue}${loc}${colors.FgYellow} to connections${colors.Reset}`);
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
    // llo(1,`${colors.FgYellow}removing: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
    if (loc) {
        let locArr = loc.split("|");
        let type = locArr[0];
        let number = locArr[1];
        if (get(loc)) { //data[type]&&connections[type][number]!=null){
            delete connections[type][number];
            // llo(1,`${colors.FgYellow}removed: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
            return true;
        }
        else {
            // llo(1,`${colors.FgYellow}couldn't remove: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
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
        // llo(1,`${colors.FgYellow}moving: ${colors.FgBlue}${locOld}${colors.FgYellow} to ${colors.FgBlue}${locNew}${colors.FgYellow} in connections${colors.Reset}`);
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
