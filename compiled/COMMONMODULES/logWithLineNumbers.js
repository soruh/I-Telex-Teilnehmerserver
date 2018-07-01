"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (module.parent != null) {
    var mod = module;
    var load_order = [module.id.split("/").slice(-1)];
    while (mod.parent) {
        load_order.push(mod.parent.filename.split("/").slice(-1));
        mod = mod.parent;
    }
    var load_order_rev = [];
    for (let i = load_order.length - 1; i >= 0; i--) {
        load_order_rev.push(i == 0 ? "\x1b[32m" + load_order[i] + "\x1b[0m" : i == load_order.length - 1 ? "\x1b[36m" + load_order[i] + "\x1b[0m" : "\x1b[33m" + load_order[i] + "\x1b[0m");
    }
    console.log("loaded: " + load_order_rev.join(" ––> " + "\x1b[0m"));
}
//#region imports
const fs = require("fs");
const util = require("util");
const config_js_1 = require("../COMMONMODULES/config.js");
const colors_js_1 = require("../COMMONMODULES/colors.js");
//#endregion imports
var lineMaxlen = 0;
var dateMaxlen = 0;
var offset = 2;
var bufferWs = config_js_1.default.bufferLogWithWhitespace;
var repairC = config_js_1.default.repairPm2Colors;
var line_disabled = !config_js_1.default.logLineNumbers;
var date_disabled = !config_js_1.default.logDate;
const outlog = config_js_1.default.stdoutLog;
const errlog = config_js_1.default.stderrLog;
function to2digits(x) {
    let str = x.toString();
    return str.length < 2 ? "0".repeat(2 - str.length) + str : str;
}
function Logger(error, ...args) {
    var strArgs = args.map(function (a) {
        return typeof a != "string" ? util.inspect(a) : a;
    });
    let stack = new Error().stack.split('\n');
    var line = stack[(offset || 1) + 1].split((/^win/.test(process.platform)) ? ("\\") : ("/")).slice(-1)[0].replace(")", "");
    let d = new Date();
    let date = d.getDate() + "." + (d.getMonth() + 1) + "." + (d.getFullYear() + "").split("").slice(2, 4).join("") + " " + to2digits(d.getHours()) + ":" + to2digits(d.getMinutes()) + ":" + to2digits(d.getSeconds());
    let lineWsBuffer = "";
    let dateWsBuffer = "";
    let totalBuffer = "";
    if (bufferWs) {
        lineMaxlen = Math.max(lineMaxlen, line.length);
        lineWsBuffer = " ".repeat(lineMaxlen - line.length);
        dateMaxlen = Math.max(dateMaxlen, date.length);
        dateWsBuffer = " ".repeat(dateMaxlen - date.length);
        totalBuffer = lineWsBuffer + dateWsBuffer;
        if (!line_disabled)
            totalBuffer += " ".repeat(line.length);
        if (!date_disabled)
            totalBuffer += " ".repeat(date.length);
        if (!date_disabled && !line_disabled)
            totalBuffer += " "; //space for pipe
        if (!date_disabled || !line_disabled)
            totalBuffer += " "; //space after pre log
    }
    if (repairC) {
        var currentColors = {
            Fg: null,
            Bg: null,
            Mod: null
        };
        let replaceNewlines = function replaceNewlines(replacing, index, fullstring) {
            for (let i = 0; i < keys.length; i++) {
                if (+keys[i] <= index) {
                    let colorName = Object.keys(colors_js_1.default)[Object["values"](colors_js_1.default).indexOf(colorsAt[keys[i]])];
                    let prefix = colorName.slice(0, 2);
                    if (prefix == "Fg" || prefix == "Bg") {
                        currentColors[prefix] = colorsAt[keys[i]];
                    }
                    else {
                        currentColors.Mod = colorsAt[keys[i]];
                    }
                }
            }
            return (colors_js_1.default.Reset + "\n" +
                (currentColors.Fg ? currentColors.Fg : "") +
                (currentColors.Bg ? currentColors.Bg : "") +
                (currentColors.Mod ? currentColors.Mod : ""));
        };
        for (let i in strArgs) {
            var colorsAt = colors_js_1.default.colorsAt(strArgs[i]);
            var keys = Object.keys(colorsAt).sort();
            strArgs[i] = strArgs[i].replace(/\n/g, replaceNewlines);
            // for (let i = 0; i < keys.length; i++) {
            //   let colorName:string = Object.keys(colors)[Object["values"](colors).indexOf(colorsAt[keys[i]])];
            //   let prefix:string = colorName.slice(0, 2);
            //   if (prefix == "Fg" || prefix == "Bg") {
            //     currentColors[prefix] = colorsAt[keys[i]];
            //   } else {
            //     currentColors.Mod = colorsAt[keys[i]];
            //   }
            // }
        }
    }
    strArgs = strArgs.map((a) => a.replace(/\n/g, (replacing, index, fullstring) => replacing + totalBuffer));
    let preLog = colors_js_1.default.Underscore + colors_js_1.default.Dim +
        (line_disabled ? "" : line + lineWsBuffer) +
        (!(date_disabled || line_disabled) ? "|" : "") +
        (date_disabled ? "" : date + dateWsBuffer) +
        colors_js_1.default.Reset +
        ((date_disabled && line_disabled) ? "" : " ");
    let write = error ?
        errlog == null ?
            (buff) => process.stderr.write(buff)
            :
                (str) => fs.appendFileSync(errlog, str)
        :
            outlog == null ?
                (buff) => process.stdout.write(buff)
                :
                    (str) => fs.appendFileSync(outlog, str);
    write(([preLog].concat(strArgs)).join(" ") + "\n");
}
function setLine(val) {
    line_disabled = val;
}
exports.setLine = setLine;
function setDate(val) {
    date_disabled = val;
}
exports.setDate = setDate;
function setOffset(val) {
    offset = val;
}
exports.setOffset = setOffset;
function setBuffer(val) {
    bufferWs = val;
}
exports.setBuffer = setBuffer;
function ll(...args) {
    Logger.apply(null, [false].concat(args));
}
exports.ll = ll;
function lle(...args) {
    Logger.apply(null, [true].concat(args));
}
exports.lle = lle;
function llo(ofs, ...args) {
    let totalOffset = ofs + 1;
    offset += totalOffset;
    ll.apply(null, args);
    offset -= totalOffset;
}
exports.llo = llo;
