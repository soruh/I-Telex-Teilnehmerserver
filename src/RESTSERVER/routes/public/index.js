"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const publicRouter = express.Router();
publicRouter.get('/', function (req, res, next) {
    res.end('public');
});
exports.default = publicRouter;
