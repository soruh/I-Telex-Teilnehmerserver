"use strict";
if(module.parent!=null){var mod=module;var load_order=[module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev=[];for(let i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[0m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[0m":"\x1b[33m"+load_order[i]+"\x1b[0m");}console.log("loaded: "+load_order_rev.join(" ––> "));}

const util = require('util');
const fs = require('fs');
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));
const colors = require(path.join(PWD,'/COMMONMODULES/colors.js'));

var lineMaxlen=0;
var dateMaxlen=0;
var offset = 2;
var bufferWs = config.get("bufferLogWithWhitespace");
var repairC = config.get("repairPm2Colors");
var line_disabled = !config.get("logLineNumbers");
var date_disabled = !config.get("logDate");
const outlog = config.get("stdoutLog");
const errlog = config.get("stderrLog");

var cv = level=>level<=config.get("loggingVerbosity"); //check verbosity

function to2digits(x){
  let str = x.toString();
  return(str.length<2?"0"+str:str);
}
function Logger(error, ...args){
  //let args = Object.values(arguments).slice(1);
  args = args.map(a=>(typeof a!="string"?util.inspect(a):a)+" ");
  if(!(line_disabled||date_disabled)){
    let stack = new Error().stack.split('\n');
    let line = stack[(offset||1) + 0].split((/^win/.test(process.platform))?("\\"):("/")).slice(-1)[0].replace(")","");
    let d = new Date();
    let date = d.getDate()+"."+(d.getMonth()+1)+"."+(d.getFullYear()+"").split("").slice(2,4).join("")+" "+d.getHours()+":"+to2digits(d.getMinutes())+":"+to2digits(d.getSeconds());
    if(bufferWs){
      lineMaxlen=lineMaxlen<line.length?line.length:lineMaxlen;
      var lineWsBuffer=" ".repeat(lineMaxlen-line.length);

      dateMaxlen=dateMaxlen<date.length?date.length:dateMaxlen;
      var dateWsBuffer=" ".repeat(dateMaxlen-date.length);

      var totalBuffer=lineWsBuffer+dateWsBuffer;
      if(!line_disabled) totalBuffer+=" ".repeat(line.length);
      if(!date_disabled) totalBuffer+=" ".repeat(date.length);

      if((!date_disabled)&&(!line_disabled)) totalBuffer+=" "; //space for pipe
      if(!(date_disabled&&line_disabled)) totalBuffer+=" "; //space after pre log
    }else{
      var lineWsBuffer = "";
      var dateWsBuffer = "";
      var totalBuffer = "";
    }
    if(repairC){
      var currentColors = {Fg:null,Bg:null,Mod:null};
      for(let i in args){
        var colorsAt = colors.colorsAt(args[i]);
        var keys = Object.keys(colorsAt).sort();
        args[i]=args[i].replace(/\n/g,function(replacing,index,fullstring){
          for(i=0;i<keys.length;i++){
            if(keys[i] <= index){
              let colorName = Object.keys(colors)[Object.values(colors).indexOf(colorsAt[keys[i]])];
              let prefix = colorName.slice(0,2);
              if(prefix=="Fg"||prefix=="Bg"){
                currentColors[prefix] = colorsAt[keys[i]];
              }else{
                currentColors["Mod"] = colorsAt[keys[i]];
              }
            }
          }
          return(colors.Reset+"\n"+(currentColors.Fg?currentColors.Fg:"")+(currentColors.Bg?currentColors.Bg:"")+(currentColors.Mod?currentColors.Mod:""));
        });
        for(i=0;i<keys.length;i++){
          let colorName = Object.keys(colors)[Object.values(colors).indexOf(colorsAt[keys[i]])];
          let prefix = colorName.slice(0,2);
          if(prefix=="Fg"||prefix=="Bg"){
            currentColors[prefix] = colorsAt[keys[i]];
          }else{
            currentColors["Mod"] = colorsAt[keys[i]];
          }
        }
      }
    }
    var preLog = colors.Underscore+colors.Dim+(line_disabled?"":line+lineWsBuffer)+(((!date_disabled)&&(!line_disabled))?"|":"")+(date_disabled?"":date+dateWsBuffer)+colors.Reset+((date_disabled&&line_disabled)?"":" ");
    args = args.map(a=>a.replace(/\n/g,replacing=>replacing+totalBuffer));
  }else{
    var preLog = "";
  }
  let write = error?
  (errlog==""?buff=>process.stderr.write(buff):str=>fs.appendFileSync(errlog,str)):
  (outlog==""?buff=>process.stdout.write(buff):str=>fs.appendFileSync(outlog,str));


  write(([preLog].concat(args)).join("")+"\n");
}
module.exports.setLine = function setLine(val){line_disabled=val;};
module.exports.setDate = function setDate(val){date_disabled=val;};
module.exports.setOffset = function setOffset(val){offset=val;};
module.exports.setBuffer = function setLine(val){bufferWs=val;};
module.exports.ll = Logger.bind(null, false);
module.exports.lle = Logger.bind(null, true);
module.exports.llo = function llo(ofs, ...args){
  let correctedOffset = ofs+1;
  offset+=correctedOffset;
  module.exports.ll.apply(null,args);
  offset-=correctedOffset;
}
