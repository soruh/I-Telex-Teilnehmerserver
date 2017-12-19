if(module.parent!=null){var mod = module;var load_order = [module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev = [];for(i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[37m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[37m":"\x1b[33m"+load_order[i]+"\x1b[37m");}console.log("loaded: "+load_order_rev.join(" --> "));}
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));
const config = require(path.join(PWD,'/COMMONMODULES/config.js'));
const colors = require(path.join(PWD,"/COMMONMODULES/colors.js"));
function ll(){
  var stack = new Error().stack.split('\n');
  var line = stack[(module.exports.offset || 1) + 1].split("/").slice(-1)[0].replace(")","")
  if(!module.exports.diabled){
    console.log.apply(this,[colors.Underscore+colors.Dim+line+colors.Reset].concat(Object.values(arguments)));const ll = require(path.join(PWD,"/COMMONMODULES/logWithLineNumber.js")).ll;
  }else{
    console.log.apply(this,arguments);
  }
}
var offset = 1;
var disabled = !config.get("LOGLINENUMBERS");

module.exports.setDiabled = function setDiabled(val){disabled=val;};
module.exports.setOffset = function setOffset(val){offset=val;};
module.exports.ll = ll;
