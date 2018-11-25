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
const misc_js_1 = require("../SHARED/misc.js");
const colors_js_1 = require("../SHARED/colors.js");
function httpLogger(callback, req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        let ip = misc_js_1.normalizeIp(req.connection.remoteAddress);
        next();
        yield misc_js_1.sleep(0);
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
    });
}
exports.default = httpLogger;
