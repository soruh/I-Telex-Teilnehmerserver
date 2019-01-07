"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQL_1 = require("../../shared/SQL");
const tokens_1 = require("./tokens");
async function list(req, res) {
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
        let data = await SQL_1.SqlAll(query, []);
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
}
exports.default = list;
