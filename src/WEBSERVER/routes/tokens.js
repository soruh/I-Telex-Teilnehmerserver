"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../SHARED/config");
const crypto = require("crypto");
const misc_1 = require("../../SHARED/misc");
let salts = {};
function removeOldSalts() {
    for (let i in salts) {
        if (Date.now() - new Date(salts[i]).getTime() > config_1.default.webServerTokenLifeTime) {
            delete salts[i];
        }
    }
}
function createSalt(req, res) {
    try {
        removeOldSalts();
        const salt = crypto.randomBytes(32).toString('base64').slice(0, -1);
        salts[salt] = new Date().toJSON();
        logger.log('debug', misc_1.inspect `created new salt: ${salt}`);
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
exports.createSalt = createSalt;
function isValidToken(suppliedToken, data, salt) {
    logger.log('debug', misc_1.inspect `checking if token ${suppliedToken} is valid for data: ${data}`);
    removeOldSalts();
    if (!salts.hasOwnProperty(salt)) {
        logger.log('debug', misc_1.inspect `salt is invalid`);
        return false;
    }
    const hash = crypto.createHash('sha256').update(salt + config_1.default.webInterfacePassword + data).digest();
    const correctToken = hash.toString('hex');
    if (suppliedToken === correctToken) {
        logger.log('debug', misc_1.inspect `token is valid`);
        delete salts[salt];
        return true;
    }
    else {
        logger.log('debug', misc_1.inspect `${correctToken} !=\n${suppliedToken}`);
        logger.log('debug', misc_1.inspect `token is invalid`);
        return false;
    }
}
exports.isValidToken = isValidToken;
