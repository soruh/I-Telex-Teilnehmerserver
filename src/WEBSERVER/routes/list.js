"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../../SHARED/misc");
const config_1 = require("../../SHARED/config");
function list(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable:no-var-keyword
        if (req.body.password === config_1.default.webInterfacePassword) {
            var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,disabled,timestamp FROM teilnehmer";
        }
        else {
            var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,timestamp FROM teilnehmer where type!=0 and disabled=0;";
        }
        // tslint:enable:no-var-keyword
        res.header("Content-Type", "application/json; charset=utf-8");
        try {
            let data = yield misc_1.SqlQuery(query);
            if (!data)
                throw (new Error('no data'));
            res.json({
                successful: true,
                result: data,
            });
        }
        catch (error) {
            res.json({
                successful: false,
                error,
            });
        }
    });
}
exports.default = list;