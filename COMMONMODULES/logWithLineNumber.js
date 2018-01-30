"use strict";
if(module.parent!=null){var mod=module;var load_order=[module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev=[];for(let i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[0m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[0m":"\x1b[33m"+load_order[i]+"\x1b[0m");}console.log("loaded: "+load_order_rev.join(" ––> "));}
const util = require('util');
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));
function to2digits(x){
  let str = x.toString();
  return(str.length<2?"0"+str:str);
}
function Logger(error){
  let args = Object.values(arguments).slice(1);
  let stack = new Error().stack.split('\n');
  var line = stack[(offset||1) + 1].split((/^win/.test(process.platform))?("\\"):("/")).slice(-1)[0].replace(")","");
  let d = new Date();
  let date = d.getDate()+"."+(d.getMonth()+1)+"."+(d.getFullYear()+"").split("").slice(2,4).join("")+" "+d.getHours()+":"+to2digits(d.getMinutes())+":"+to2digits(d.getSeconds());
  if(bufferWs){
    lineMaxlen=lineMaxlen<line.length?line.length:lineMaxlen;
    var lineWsBuffer="";
    for(let i=0;i<lineMaxlen-line.length;i++){lineWsBuffer+=" ";}

    dateMaxlen=dateMaxlen<date.length?date.length:dateMaxlen;
    var dateWsBuffer="";
    for(let i=0;i<dateMaxlen-date.length;i++){dateWsBuffer+=" ";}

    let totalBuffer = lineWsBuffer+dateWsBuffer;
    if(!line_disabled){
      for(let i=0;i<line.length;i++){totalBuffer+=" ";}
    }
    if(!date_disabled){
      for(let i=0;i<date.length;i++){totalBuffer+=" ";}
    }
    if((!date_disabled)&&(!line_disabled)){
      totalBuffer+=" ";
    }

    totalBuffer+=" ";

    for(let i in args){
      if(typeof args[i]!="string") args[i]=util.inspect(args[i]).replace(/\n/g,"\n"+totalBuffer,{});
    }
  }else{
    var lineWsBuffer = "";
    var dateWsBuffer = "";
  }

  let preLog = colors.Underscore+colors.Dim+(line_disabled?"":line+lineWsBuffer)+(((!date_disabled)&&(!line_disabled))?"|":"")+(date_disabled?"":date+dateWsBuffer)+colors.Reset;
  //console.log([preLog].concat(args));
  if(error){
    for(let s of [preLog].concat(args)){
      process.stderr.write(s+" ");
    }
    process.stderr.write("\n");
    //console.error.apply(this,[preLog].concat(args));
  }else{
    for(let s of [preLog].concat(args)){
      process.stdout.write(s+" ");
    }
    process.stdout.write("\n");
    //console.log.apply(this,[preLog].concat(args));
  }
}
var lineMaxlen=0;
var dateMaxlen=0;
var offset = 2;
var bufferWs = config.get("BUFFERLOGWITHWHITESPACE");
var line_disabled = !config.get("LOGLINENUMBERS");
var date_disabled = !config.get("LOGDATE");

module.exports.setLine = function setLine(val){line_disabled=val;};
module.exports.setDate = function setDate(val){date_disabled=val;};
module.exports.setOffset = function setOffset(val){offset=val;};
module.exports.setBuffer = function setLine(val){bufferWs=val;};
module.exports.ll = function(){Logger.apply(null,[false].concat(Object.values(arguments)));};
module.exports.lle = function(){Logger.apply(null,[true].concat(Object.values(arguments)));};
