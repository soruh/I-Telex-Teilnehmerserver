"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
router.get('/', function (req, res, next) {
    res.end('This is a rest API.<br/>For Documentation please visit:<br><a href="https://github.com/soruh/I-Telex-Teilnehmerserver/">https://github.com/soruh/I-Telex-Teilnehmerserver/</a>');
});
;
exports.default = router;
