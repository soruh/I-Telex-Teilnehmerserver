"use strict";

import * as express from "express";

const publicRouter = express.Router();

publicRouter.get('/', function(req, res, next) {
	res.end('public');
});

export default publicRouter;
