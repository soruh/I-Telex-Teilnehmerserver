"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../SHARED/config");
const crypto = require("crypto");
const misc_1 = require("../../SHARED/misc");
let tokens = {};
function removeOldTokens() {
    for (let salt in tokens) {
        if (Date.now() - new Date(salt).getTime() > config_1.default.webServerTokenLifeTime) {
            delete tokens[salt];
        }
    }
}
function createSalt() {
    // let salt = Array.from(new Date(Date.now()+Math.random()*60000).toISOString());
    return crypto.randomBytes(32).toString('base64').slice(0, -1);
}
function createToken(req, res) {
    try {
        const salt = createSalt();
        const hash = crypto.createHash('sha256').update(salt + config_1.default.webInterfacePassword).digest();
        const token = Array.from(hash).map(x => x.toString(16).padStart(2, '0')).join('');
        removeOldTokens();
        tokens[salt] = token;
        res.header("Content-Type", "application/json; charset=utf-8");
        logger.log('debug', misc_1.inspect `created new token: ${token}`);
        res.json({
            successful: true,
            salt,
        });
    }
    catch (error) {
        res.json({
            successful: false,
            error,
        });
    }
}
exports.createToken = createToken;
function isValidToken(token) {
    logger.log('debug', misc_1.inspect `checking if token ${token} is valid`);
    removeOldTokens();
    for (let salt in tokens) {
        if (tokens[salt] === token) {
            logger.log('debug', misc_1.inspect `token is valid`);
            delete tokens[salt];
            return true;
        }
    }
    logger.log('debug', misc_1.inspect `token is invalid`);
    return false;
}
exports.isValidToken = isValidToken;
