"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_js_1 = require("../SHARED/misc.js");
const colors_js_1 = require("../SHARED/colors.js");
async function httpLogger(callback, req, res, next) {
    let ip = misc_js_1.normalizeIp(req.connection.remoteAddress);
    next();
    await misc_js_1.sleep(0);
    let status = (res.statusCode || 500).toString();
    let statusColors = ['Reset', 'FgYellow', 'FgGreen', 'FgCyan', 'FgMagenta', 'FgRed'];
    let statusColor = colors_js_1.default[statusColors[status.toString().length === 3 ? status[0] : 0] || 'Reset'];
    let methodColors = {
        GET: 'FgGreen',
        POST: 'FgCyan',
        PUT: 'FgYellow',
        PATCH: 'FgMagenta',
        DELETE: 'FgRed',
    };
    let methodColor = colors_js_1.default[methodColors[req.method] || 'Reset'];
    let message = '';
    message += (ip ? ip.address : 'UNKNOWN').padEnd(15);
    message += ' ';
    message += methodColor + req.method.padEnd(6) + colors_js_1.default.Reset;
    message += ' ';
    message += statusColor + status.padStart(3) + colors_js_1.default.Reset;
    message += ' ';
    message += decodeURI(req.originalUrl).replace(/(\/|\?|&)/g, `${colors_js_1.default.FgLightBlack}$1${colors_js_1.default.Reset}`);
    callback(message, req, res);
}
exports.default = httpLogger;
