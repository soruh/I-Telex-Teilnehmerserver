//const PWD = process.env.PWD;
//const PWD = __dirname.split("/").slice(0,-2).join("/");
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));
const fs = require('fs');
var config = JSON.parse(fs.readFileSync(path.join(PWD,"/config.json")));
function get(key){
  return config[key];
}
exports.get = get;
