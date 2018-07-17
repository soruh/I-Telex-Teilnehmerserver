"use strict";

//#region imports
import * as net from 'net';
import * as util from 'util';

import colors from "../COMMONMODULES/colors.js";
import {ll,lle,llo} from '../COMMONMODULES/logWithLineNumbers.js';
import { peer, Package_decoded} from './ITelexCom.js';
import config from "../COMMONMODULES/config.js";

const cv = config.cv;

//#endregion imports

// setInterval(()=>lle(connections),5000);

interface client{
  cnum?:string;
  connection:connection;
  state:number
  readbuffer:Buffer;
  writebuffer:peer[];
  packages:Package_decoded[];
  handling:boolean;
  timeout?:NodeJS.Timer;
  cb?:()=>void;
  servernum?:number;
  newEntries?:number;
}
interface connection extends net.Socket{
  
}

interface connections {
  [index: string]: clientList;
}
interface clientList {
  [index: string]: client;
}

var types = {
  "C":"client",
  "S":"server"
};

var connections: connections = {};

function get(loc: string): client;
function get(loc: (connection:client)=>boolean): client[];
function get(loc:string|((client:client)=>boolean)){
  if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}geting: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
  if (loc) {
    if(typeof loc === "string"){
      if(config.logConnectionChanges) if(cv(2)) llo(1,"getting connection by string key");
      let locArr: string[] = loc.split("|");
      let type: string = locArr[0];
      let number: string = locArr[1];
      if (connections[type] && connections[type][number] != null) {
        if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}got:\n${util.inspect(connections[type][number],{depth:0})}\nfor ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
        return connections[type][number];
      } else {
        if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}got: nothing for ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
        return null;
      }
    }else if(typeof loc === "function"){
      if(config.logConnectionChanges) if(cv(2)) llo(1,"getting connections matching function");
      let matches:client[] = [];
      for(let type in connections){
        for(let index in connections[type]){
          let client = connections[type][index];
          if(loc(client)) matches.push(client);
        }
      }
      if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}got:\n${util.inspect(matches,{depth:1})}\nfor ${colors.FgBlue}${loc}${colors.FgYellow}${colors.Reset}`);
      if(matches.length>0){
         return matches;
      }else{
         return null;
      }
    }else{
      return null;
    }
  } else {
    return null;
  }
}

function has(loc: string): boolean;
function has(loc: (connection:client)=>boolean): boolean;
function has(loc):boolean{
  if(get(loc)){
    return true
  }else{
    return false;
  }
}

function add(loc: string, value: client): string {
  if(loc){
    if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}adding: ${colors.FgBlue}${loc}${colors.FgYellow} to connections${colors.Reset}`);
    let locArr: string[] = loc.split("|");
    let type: string = locArr[0];
    let number: string = locArr[1];

    if (typeof connections[type] === "undefined") {
      connections[type] = {};
      ll(`Added connection subset for type ${type} (${types[type]})`);
    }

    if (number == null) number = findFree(type).toString();

    let cnum = type + "|" + number;
    if (typeof connections[type][number] === "undefined") {
      connections[type][number] = value;
      connections[type][number].cnum = cnum;
      return cnum;
    } else {
      return null;
    }
  }else{
    return null;
  }
}

function remove(loc: string): boolean {
  if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}removing: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
  if(loc){
    let locArr: string[] = loc.split("|");
    let type: string = locArr[0];
    let number: string = locArr[1];
    if (has(loc)) { //data[type]&&connections[type][number]!=null){
      connections.cnum = null;
      delete connections[type][number];
      if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}removed: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
      return true;
    } else {
      if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}couldn't remove: ${colors.FgBlue}${loc}${colors.FgYellow} from connections${colors.Reset}`);
      return false;
    }
  }else{
    return false;
  }
}

function move(locOld: string, locNew: string): string {
  if(locOld&&locNew){
    if(config.logConnectionChanges) if(cv(2)) llo(1,`${colors.FgYellow}moving: ${colors.FgBlue}${locOld}${colors.FgYellow} to ${colors.FgBlue}${locNew}${colors.FgYellow} in connections${colors.Reset}`);
    let locOldArr: string[] = locOld.split("|");
    let typeOld: string = locOldArr[0];
    let numberOld: number = +locOldArr[1];

    if (connections[typeOld] && typeof connections[typeOld][numberOld] != "undefined") {
      var retLoc: string | false = add(locNew, connections[typeOld][numberOld]);
      if (retLoc) delete connections[typeOld][numberOld];
      return retLoc;
    } else {
      return null;
    }
  }else{
    return null;
  }
}

function list(type: string): string {
  if (type) {
    return util.inspect(connections[type], {
      depth: 1
    });
  } else {
    return util.inspect(connections, {
      depth: 2
    });
  }
}

function findFree(type: string): number {
  if(!connections[type]) connections[type] = {};
  let x = 0;
  while (connections[type][x] != null) {
    x++;
  }
  return x;
}
export {
  list,
  move,
  remove,
  add,
  get,
  has,
  client,
  connection,
  types
};
