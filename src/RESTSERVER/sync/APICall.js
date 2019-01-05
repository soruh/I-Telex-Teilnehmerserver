"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const config_1 = require("../../SHARED/config");
const misc_1 = require("../../SHARED/misc");
function APIcall(method, host, port, path, data) {
    return new Promise((resolve, reject) => {
        logger.log('admin', `making ${method} request to ${host}:${port}${path[0] === '/' ? '' : '/'}${path}`);
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
        const req = https.request({
            method,
            host,
            port,
            path,
            auth: 'admin:' + config_1.default.serverPin,
            headers,
            key: config_1.default.RESTKey,
            cert: config_1.default.RESTCert,
            rejectUnauthorized: true,
            ca: [config_1.default.RESTCert],
            checkServerIdentity: () => undefined,
        }, res => {
            logger.log('debug', 'made API request');
            let buffer = "";
            res.on('data', data => {
                buffer += data.toString();
            });
            res.once('end', () => {
                logger.log('debug', 'API request ended');
                logger.log('silly', misc_1.inspect `ApiCall recieved data: ${buffer}`);
                if (res.statusCode !== 200) {
                    logger.log('debug', misc_1.inspect `API call failed with error    code: ${res.statusCode} (${res.statusMessage})`);
                    try {
                        const { error } = JSON.parse(buffer);
                        if (error)
                            logger.log('error', misc_1.inspect `API call failed with error message: ${error}`);
                    }
                    catch (err) { /*fail silently*/ }
                    reject(misc_1.inspect `${res.statusCode} (${res.statusMessage})`);
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
