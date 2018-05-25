"use strict";
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));

var config = JSON.parse(require('fs').readFileSync(path.join(PWD,"/config.json")));

exports.get=key=>config[key];
