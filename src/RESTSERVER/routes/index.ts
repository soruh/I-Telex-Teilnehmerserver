"use strict";

import * as express from "express";

const router = express.Router();

router.get('/', function(req, res, next) {
	res.end('This is a rest API.<br/>For Documentation please visit:<br><a href="https://github.com/soruh/I-Telex-Teilnehmerserver/">https://github.com/soruh/I-Telex-Teilnehmerserver/</a>');
});
;

export default router;
