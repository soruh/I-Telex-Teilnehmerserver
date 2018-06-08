"use strict";
const path = require('path');
const PWD = path.normalize(path.join(__dirname,'..'));

var config = require(path.join(PWD,"/config.json"));

exports.get=key=>config[key];
