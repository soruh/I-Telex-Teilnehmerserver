"use strict";

import * as express from "express";
import editEndpoint from "./edit";
import list from "./list";
import download from "./download";
import { createToken } from "./tokens";

const router = express.Router();
router.get('/', function(req, res, next) {
	res.render('index');
});

router.post('/list', list);

router.post('/edit', editEndpoint);

router.get('/download', download);

router.get('/getSalt', createToken);

export default router;
