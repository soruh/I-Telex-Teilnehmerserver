"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const entries_1 = require("./entries");
const config_1 = require("../../../SHARED/config");
const PASSWORD = config_1.default.serverPin + '';
const adminRouter = express.Router();
// Test Authorization header of all requests to /private/*
adminRouter.all('*', function (req, res, next) {
    if (!(req.header('Authorization') && /Basic (.*)/.test(req.header('Authorization')))) {
        res.status(401);
        res.header("WWW-Authenticate", "Basic");
        res.json({ success: false, error: 'authentication error' });
        return;
    }
    const [user, pass] = Buffer.from(/Basic (.*)/.exec(req.header('Authorization'))[1], 'base64').toString().split(':');
    if (!(user === "admin" && pass === PASSWORD)) {
        res.status(403);
        res.json({ success: false, error: 'authentication error' });
        return;
    }
    next();
});
adminRouter.get('/', function (req, res, next) {
    res.json({ success: true, error: 'authenticated' });
});
adminRouter.get('/entries', entries_1.getEntries);
adminRouter.put('/entries', entries_1.putEntries);
exports.default = adminRouter;
