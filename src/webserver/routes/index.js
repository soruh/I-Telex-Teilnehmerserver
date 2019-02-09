"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const edit_1 = require("./edit");
const list_1 = require("./list");
const download_1 = require("./download");
const tokens_1 = require("./tokens");
const router = express.Router();
router.get('/', function (req, res, next) {
    res.render('index');
});
router.post('/list', list_1.default);
router.post('/edit', edit_1.default);
router.get('/download', download_1.default);
router.get('/getSalt', tokens_1.createSalt);
exports.default = router;
