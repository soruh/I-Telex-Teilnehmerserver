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
const express = require("express");
const SQL_1 = require("../../../SHARED/SQL");
const peerUpdate_1 = require("./peerUpdate");
const privateRouter = express.Router();
// Test Authorization header of all requests to /private/*
privateRouter.all('*', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(req.header('Authorization') && /Basic (.*)/.test(req.header('Authorization')))) {
            res.header("WWW-Authenticate", "Basic");
            res.status(401);
            res.json({ success: false, error: 'authentication error' });
            return;
        }
        const [number, pass] = Buffer.from(/Basic (.*)/.exec(req.header('Authorization'))[1], 'base64').toString().split(':');
        const user = yield SQL_1.SqlGet("SELECT * FROM teilnehmer WHERE number=?;", [number]);
        if (!user) {
            res.status(403);
            res.json({ success: false, error: 'authentication error' });
            return;
        }
        if (user.pin + '' !== pass) {
            res.status(403);
            res.json({ success: false, error: 'authentication error' });
            return;
        }
        req['user'] = user;
        next();
    });
});
privateRouter.get('/', function (req, res, next) {
    res.json({ success: true, error: 'authenticated' });
});
privateRouter.patch('/edit', peerUpdate_1.default);
exports.default = privateRouter;
