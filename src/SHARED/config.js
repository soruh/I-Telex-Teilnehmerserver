"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let collection = {};
let eMail = {};
// tslint:disable:no-var-requires
Object.assign(eMail, require("../../config/mailAccount.json"));
Object.assign(eMail, require("../../config/mailMessages.json"));
Object.assign(collection, { eMail });
Object.assign(collection, require("../../config/logging.json"));
Object.assign(collection, require("../../config/misc.json"));
Object.assign(collection, require("../../config/timings.json"));
Object.assign(collection, require("../../config/serverpin.json"));
// tslint:enable:no-var-requires
const config = collection;
exports.default = config;
