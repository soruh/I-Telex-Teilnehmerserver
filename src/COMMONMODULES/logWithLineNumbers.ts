"use strict";
//#region imports
import * as fs from "fs";
import * as util from "util";
import config from "../COMMONMODULES/config.js";

import colors from "../COMMONMODULES/colors.js";
//#endregion imports


var lineMaxlen: number = 0;
var dateMaxlen: number = 0;
var offset: number = 2;
var bufferWs: boolean = config.bufferLogWithWhitespace;
var repairC: boolean = config.repairPm2Colors;
var line_disabled: boolean = !config.logLineNumbers;
var date_disabled: boolean = !config.logDate;
const outlog: string = config.stdoutLog;
const errlog: string = config.stderrLog;

function to2digits(x: string | number): string {
  let str: string = x.toString();
  return str.length < 2 ? "0".repeat(2 - str.length) + str : str;
}

function Logger(error: boolean, ...args) {
  var strArgs: string[] = args.map(function (a) {
    return typeof a != "string" ? util.inspect(a) : a;
  });
  let stack = new Error().stack.split('\n');
  var line = stack[(offset || 1) + 1].split((/^win/.test(process.platform)) ? ("\\") : ("/")).slice(-1)[0].replace(")", "");
  let d = new Date();
  let date = d.getDate() + "." + (d.getMonth() + 1) + "." + (d.getFullYear() + "").split("").slice(2, 4).join("") + " " + to2digits(d.getHours()) + ":" + to2digits(d.getMinutes()) + ":" + to2digits(d.getSeconds());

  let lineWsBuffer: string = "";
  let dateWsBuffer: string = "";
  let totalBuffer: string = "";
  if (bufferWs) {
    lineMaxlen = Math.max(lineMaxlen, line.length);
    lineWsBuffer = " ".repeat(lineMaxlen - line.length);

    dateMaxlen = Math.max(dateMaxlen, date.length);
    dateWsBuffer = " ".repeat(dateMaxlen - date.length);

    totalBuffer = lineWsBuffer + dateWsBuffer;
    if (!line_disabled) totalBuffer += " ".repeat(line.length);
    if (!date_disabled) totalBuffer += " ".repeat(date.length);

    if (!date_disabled && !line_disabled) totalBuffer += " "; //space for pipe
    if (!date_disabled || !line_disabled) totalBuffer += " "; //space after pre log
  }
  if (repairC) {
    var currentColors: {
      Fg: string,
      Bg: string,
      Mod: string
    } = {
      Fg: null,
      Bg: null,
      Mod: null
    };
    let replaceNewlines = function replaceNewlines(replacing: string, index: number, fullstring: string): string {
      for (let i = 0; i < keys.length; i++) {
        if (+keys[i] <= index) {
          let colorName: string = Object.keys(colors)[Object["values"](colors).indexOf(colorsAt[keys[i]])];
          let prefix: string = colorName.slice(0, 2);
          if (prefix == "Fg" || prefix == "Bg") {
            currentColors[prefix] = colorsAt[keys[i]];
          } else {
            currentColors.Mod = colorsAt[keys[i]];
          }
        }
      }
      return (
        colors.Reset + "\n" +
        (currentColors.Fg ? currentColors.Fg : "") +
        (currentColors.Bg ? currentColors.Bg : "") +
        (currentColors.Mod ? currentColors.Mod : "")
      );
    };
    for (let i in strArgs) {
      var colorsAt = colors.colorsAt(strArgs[i]);
      var keys: string[] = Object.keys(colorsAt).sort();
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


  strArgs = strArgs.map((a: string) =>
    a.replace(/\n/g, (replacing: string, index: number, fullstring: string) =>
      replacing + totalBuffer
    )
  );
  let preLog: string =
    colors.Underscore + colors.Dim +
    (line_disabled ? "" : line + lineWsBuffer) +
    (!(date_disabled || line_disabled) ? "|" : "") +
    (date_disabled ? "" : date + dateWsBuffer) +
    colors.Reset +
    ((date_disabled && line_disabled) ? "" : " ");

  let write = error ?
    errlog == null ?
      (buff: string):boolean => process.stderr.write(buff)
    :
      (str: string):void => fs.appendFileSync(errlog, str)
  :
    outlog == null ?
      (buff: string):boolean => process.stdout.write(buff)
    :
      (str: string):void => fs.appendFileSync(outlog, str)

  write(([preLog].concat(strArgs)).join(" ") + "\n");
}

function setLine(val: boolean): void {
  line_disabled = val;
}

function setDate(val: boolean): void {
  date_disabled = val;
}

function setOffset(val: number): void {
  offset = val;
}

function setBuffer(val: boolean): void {
  bufferWs = val;
}

function ll(...args: any[]) {
  Logger.apply(null, [false].concat(args));
}

function lle(...args: any[]) {
  Logger.apply(null, [true].concat(args));
}

function llo(ofs: number, ...args: any[]) {
  let totalOffset: number = ofs + 1;
  offset += totalOffset;
  ll.apply(null, args);
  offset -= totalOffset;
}

export {
  setLine,
  setDate,
  setOffset,
  setBuffer,
  ll,
  lle,
  llo
};