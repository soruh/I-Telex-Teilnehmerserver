"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const entry_1 = require("./entry");
const entries_1 = require("./entries");
const search_1 = require("./search");
const publicRouter = express.Router();
publicRouter.get('/', function (req, res, next) {
    res.json({ success: true });
});
publicRouter.use('/entry', entry_1.default);
publicRouter.get('/entries', entries_1.default);
publicRouter.get('/search', search_1.default);
exports.default = publicRouter;
