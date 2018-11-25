"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-var-requires
const fs_1 = require("fs");
const path_1 = require("path");
//#endregion
//#region email
let eMail = {};
Object.assign(eMail, require("../../config/mailAccount.json"));
Object.assign(eMail, require("../../config/mailMessages.json"));
//#endregion
//#region tls
const { RESTCertPath, RESTKeyPath } = require("../../config/tls.json");
function readCertFile(path) {
    function normalizePath(path) {
        if (path_1.isAbsolute(path)) {
            return path;
        }
        else {
            return path_1.join(__dirname, '../..', path);
        }
    }
    try {
        return fs_1.readFileSync(normalizePath(path));
    }
    catch (err) {
        console.error(err);
        throw (new Error("couldn't load https certificates"));
    }
}
let RESTCert;
let RESTKey;
const tls = {
    get RESTCert() {
        if (!RESTCert)
            RESTCert = readCertFile(RESTCertPath);
        return RESTCert;
    },
    get RESTKey() {
        if (!RESTKey)
            RESTKey = readCertFile(RESTKeyPath);
        return RESTKey;
    },
};
//#endregion
let collection = {};
Object.assign(collection, tls);
Object.assign(collection, { eMail });
Object.assign(collection, require("../../config/logging.json"));
Object.assign(collection, require("../../config/misc.json"));
Object.assign(collection, require("../../config/timings.json"));
Object.assign(collection, require("../../config/serverpin.json"));
const config = collection;
exports.default = config;
