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
for(o of arr){
  comments = o.split("*/");
  if(comments.length>1){
    content+=comments[1];
  }else{
    content+=comments[0];
  }
}
var lines = content.replace(/(\r\n)/g,"").split(";");
for(l of lines){
  if(l.split(" ")[0] != ""){
    module.exports[l.split(" ")[0]] = parse(l.split(" ")[1]);
  }
}
