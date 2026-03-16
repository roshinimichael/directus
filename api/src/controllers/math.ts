import { Router } from 'express';
import { respond } from '../middleware/respond.js';
import asyncHandler from '../utils/async-handler.js';
import { addNumbers } from '../utils/addNumbers.js';

const router = Router();

/**
 * GET /math/add?a=<number>&b=<number>
 * Returns the sum of two numbers.
 */
router.get(
	'/add',
	asyncHandler(async (req, res, next) => {
		const a = Number(req.query['a']);
		const b = Number(req.query['b']);

		if (isNaN(a) || isNaN(b)) {
			res.status(400).json({ errors: [{ message: 'Query parameters "a" and "b" must be valid numbers.' }] });
			return;
		}

		res.locals['payload'] = { data: { result: addNumbers(a, b) } };
		return next();
	}),
	respond,
);

export default router;
