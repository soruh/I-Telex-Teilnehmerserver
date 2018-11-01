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
function download(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (req.query.type) {
            case "csv":
                res.setHeader('Content-disposition', 'attachment; filename=list.csv');
                res.setHeader('Content-type', 'text/csv');
                let data = yield SQL_1.SqlQuery('select number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1 and type!=0;', []);
                if (data && data.length > 0) {
                    let header = Object.keys(data[0]);
                    res.write(header.join(',') + '\n');
                    for (let row of data) {
                        for (let field of header) {
                            res.write(`"${(row[field] || '').toString()}"`);
                            if (field !== header[header.length - 1])
                                res.write(',');
                        }
                        res.write('\n');
                    }
                    res.end();
                }
                else {
                    res.end("no data");
                }
                break;
            default:
                res.end("you requested an invalid file type");
                break;
        }
    });
}
exports.default = download;
