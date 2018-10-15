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
function download(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (req.query.type) {
            case "xls":
                res.setHeader('Content-disposition', 'attachment; filename=list.xls');
                res.setHeader('Content-type', 'application/xls');
                let data = yield misc_1.SqlQuery('select number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1;');
                if (data && data.length > 0) {
                    let header = Object.keys(data[0]);
                    for (let i in header) {
                        res.write(header[i]);
                        if (+i === header.length - 1) {
                            res.write('\n');
                        }
                        else {
                            res.write('\t');
                        }
                    }
                    for (let row of data) {
                        let values = Object.values(row);
                        for (let i in values) {
                            res.write(values[i].toString());
                            if (+i === values.length - 1) {
                                res.write('\n');
                            }
                            else {
                                res.write('\t');
                            }
                        }
                    }
                    res.end();
                }
                else {
                    res.end("no data");
                }
                break;
            default:
                res.end("requested an invalid file type");
                break;
        }
    });
}
exports.default = download;
