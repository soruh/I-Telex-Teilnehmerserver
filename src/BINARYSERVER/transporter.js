"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#endregion
var transporter;
function setTransporter(value) {
    transporter = value;
}
exports.setTransporter = setTransporter;
function getTransporter() {
    return transporter;
}
exports.getTransporter = getTransporter;
