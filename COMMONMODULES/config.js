//const PWD = process.env.PWD;
const PWD = __dirname.split("/").slice(0,-2).join("/");
const fs = require('fs');
var config = JSON.parse(fs.readFileSync(PWD+"/config.json"));
function get(key){
  return config[key];
}
exports.get = get;
