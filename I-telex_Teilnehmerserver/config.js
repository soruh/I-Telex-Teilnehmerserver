function parse(x){
  if(x==""){
    return("");
  }else if(parseInt(x) != NaN){
    return(parseInt(x));
  }else{
    return(x);
  }
}

var content = require('fs').readFileSync('CONFIG',"utf-8");
var lines = content.replace(/(\r\n)/g,"").split(";");
for(l of lines){
  if(l.split(" ")[0] != ""){
    module.exports[l.split(" ")[0]] = parse(l.split(" ")[1]);
  }
}
