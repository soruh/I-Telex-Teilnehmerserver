"use strict";

import * as express from "express";
import editEndpoint from "./edit";
import list from "./list";
import download from "./download";

const router = express.Router();
router.get('/', function(req, res, next) {
	res.render('index');
});

router.post('/list', list);

router.post('/edit', editEndpoint);

router.get('/download', download);

export default router;
