"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const config_1 = require("../SHARED/config");
const misc_1 = require("../SHARED/misc");
function APIcall(method, host, port, path, data) {
    return new Promise((resolve, reject) => {
        logger.log('debug', `making ${method} request to ${host}:${port}${path[0] === '/' ? '' : '/'}${path}`);
        let headers = {};
        let stringifiedData;
        if (data) {
            try {
                stringifiedData = JSON.stringify({ data });
            }
            catch (err) {
                reject(err);
                return;
            }
            headers = {
                'content-type': 'application/json; charset=utf-8',
                'content-length': Buffer.byteLength(stringifiedData),
            };
        }
        const req = http.request({
            method,
            host,
            port,
            path,
            auth: 'admin:' + config_1.default.serverPin,
            headers,
        }, res => {
            logger.log('debug', 'made API request');
            let buffer = "";
            res.on('data', data => {
                buffer += data.toString();
            });
            res.once('end', () => {
                logger.log('debug', 'API request ended');
                logger.log('silly', buffer);
                if (res.statusCode !== 200) {
                    logger.log('debug', `API call failed with code ${res.statusCode} (${res.statusMessage})`);
                    reject(`${res.statusCode} (${res.statusMessage})`);
                    return;
                }
                try {
                    const parsed = JSON.parse(buffer);
                    if (parsed.success) {
                        resolve(parsed.data);
                    }
                    else {
                        reject(parsed.error);
                    }
                }
                catch (err) {
                    reject(err);
                }
            });
            res.once('error', err => {
                reject(err);
                res.destroy();
            });
        });
        req.on('error', err => {
            logger.log('error', misc_1.inspect `${err}`);
            reject(err);
        });
        if (stringifiedData)
            req.write(stringifiedData);
        req.end();
    });
}
exports.default = APIcall;
