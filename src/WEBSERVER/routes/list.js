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
const SQL_1 = require("../../SHARED/SQL");
const tokens_1 = require("./tokens");
function list(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable:no-var-keyword
        if (tokens_1.isValidToken(req.body.token, '', req.body.salt)) {
            var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,disabled,timestamp FROM teilnehmer";
        }
        else {
            var query = "SELECT uid,number,name,type,hostname,ipaddress,port,extension,timestamp FROM teilnehmer where type!=0 and disabled=0;";
        }
        // tslint:enable:no-var-keyword
        res.header("Content-Type", "application/json; charset=utf-8");
        try {
            let data = yield SQL_1.SqlAll(query, []);
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
