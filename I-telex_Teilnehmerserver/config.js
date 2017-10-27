const fs = require('fs');
var config = JSON.parse(fs.readFileSync("../config.json"));
function get(key){
  return config[key];
}
exports.get = get;
