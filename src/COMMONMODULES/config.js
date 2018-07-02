"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var collection = {};
Object.assign(collection, require("../../config/mail.json"));
Object.assign(collection, require("../../config/mysql.json"));
Object.assign(collection, require("../../config/logging.json"));
Object.assign(collection, require("../../config/misc.json"));
Object.assign(collection, require("../../config/timings.json"));
const config = collection;
exports.default = config;
