const PWD = process.env.PWD;
const fs = require('fs');
var config = JSON.parse(fs.readFileSync(PWD+"/config.json"));
function get(key){
  return config[key];
}
exports.get = get;
