"use strict";

import * as express from "express";

const privateRouter = express.Router();

privateRouter.get('/', function(req, res, next) {
	res.end('private');
});

export default privateRouter;
