console.log("config");
function parse(x){
  if(x==""){
    return("");
  }else if(isNaN(parseInt(x))){
    return(x);
  }else{
    return(parseInt(x));
  }
}
var raw = require('fs').readFileSync('./CONFIG',"utf-8");
var arr = raw.split("/*");
var content = "";
var exp = {};
for(o of arr){
  comments = o.split("*/");
  if(comments.length>1){
    content+=comments[1];
  }else{
    content+=comments[0];
  }
}
console.log(content);
var lines = content.replace(/(\n)/g,"").split(";");
console.log(lines);
for(l of lines){
  if(l.split(" ")[0] != ""){
    exp[l.split(" ")[0]] = parse(l.split(" ")[1]);
  }
}
module.exports = exp;
