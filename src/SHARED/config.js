"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var collection = {};
var eMail = {};
Object.assign(eMail, require("../../config/mailAccount.json"));
Object.assign(eMail, require("../../config/mailMessages.json"));
Object.assign(collection, {
    eMail
});
Object.assign(collection, require("../../config/mysql.json"));
Object.assign(collection, require("../../config/logging.json"));
Object.assign(collection, require("../../config/misc.json"));
Object.assign(collection, require("../../config/timings.json"));
const config = collection;
exports.default = config;