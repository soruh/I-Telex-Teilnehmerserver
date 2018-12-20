"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQL_1 = require("../../SHARED/SQL");
async function download(req, res, next) {
    switch (req.query.type) {
        case "csv":
            res.setHeader('Content-disposition', 'attachment; filename=list.csv');
            res.setHeader('Content-type', 'text/csv');
            let data = await SQL_1.SqlAll('SELECT number,name,type,hostname,ipaddress,port,extension from teilnehmer where disabled!=1 and type!=0;', []);
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
}
exports.default = download;
