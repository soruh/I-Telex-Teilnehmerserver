"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../SHARED/config");
const crypto = require("crypto");
const misc_1 = require("../../SHARED/misc");
let salts = [];
function removeOldSalts() {
    for (let i in salts) {
        if (Date.now() - new Date(salts[i]).getTime() > config_1.default.webServerTokenLifeTime) {
            salts.splice(+i, 1);
        }
    }
}
function createSalt(req, res) {
    try {
        removeOldSalts();
        const salt = new Date().toJSON();
        salts.push(salt);
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
    const saltIndex = salts.indexOf(salt);
    if (saltIndex === -1) {
        logger.log('debug', misc_1.inspect `salt is invalid`);
        return false;
    }
    const hash = crypto.createHash('sha256').update(salt + config_1.default.webInterfacePassword + data).digest();
    const correctToken = Array.from(hash).map(x => x.toString(16).padStart(2, '0')).join('');
    if (suppliedToken === correctToken) {
        logger.log('debug', misc_1.inspect `token is valid`);
        salts.splice(saltIndex, 1);
        return true;
    }
    else {
        logger.log('debug', misc_1.inspect `${correctToken} !=\n${suppliedToken}`);
        logger.log('debug', misc_1.inspect `token is invalid`);
        return false;
    }
}
exports.isValidToken = isValidToken;
