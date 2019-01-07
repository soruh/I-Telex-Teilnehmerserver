"use strict";

import * as express from "express";
import entryRouter from './entry';
import entries from './entries';
import search from './search';

const publicRouter = express.Router();

publicRouter.get('/', function(req, res, next) {
	res.json({success:true});
});

publicRouter.use('/entry', entryRouter);
publicRouter.get('/entries', entries);
publicRouter.get('/search', search);

export default publicRouter;
