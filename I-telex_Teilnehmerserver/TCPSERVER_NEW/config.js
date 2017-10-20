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
var lines = content.replace(/\n/g,"").split(";");
for(l of lines){
  if(l.split(" ")[0] != ""){
    var str="";
    var sp=l.split(" ");
    for(i=1;i<sp.length;i++){
      str+=sp[i];
    }
    exp[sp[0]] = parse(sp[1]);
  }
}
module.exports = exp;
