"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const privateRouter = express.Router();
// Test Authorization header of all requests to /private/*
privateRouter.all('*', function (req, res, next) {
    if (!(req.header('Authorization') && /Basic (.*)/.test(req.header('Authorization')))) {
        res.header("WWW-Authenticate", "Basic");
        res.status(401);
        res.json({ success: false, error: 'authentication error' });
        return;
    }
    let [user, pass] = Buffer.from(/Basic (.*)/.exec(req.header('Authorization'))[1], 'base64').toString().split(':');
    if (true) { // * SQLQuery for user pin by number(user)
        res.status(403);
        res.json({ success: false, error: 'authentication error' });
        return;
    }
    next();
});
privateRouter.get('/', function (req, res, next) {
    res.status(200);
    res.json({ success: true, error: 'authenticated' });
});
exports.default = privateRouter;
