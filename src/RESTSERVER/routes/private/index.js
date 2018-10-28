"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const privateRouter = express.Router();
privateRouter.get('/', function (req, res, next) {
    res.end('private');
});
exports.default = privateRouter;
