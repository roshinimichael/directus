/**
 * Sanitize query parameters.
 * This ensures that query params are formatted and ready to go for the services.
 */

import type { RequestHandler } from 'express';
import { QUERY_HARD_LIMIT_CAP } from '../constants.js';
import { sanitizeQuery } from '../utils/sanitize-query.js';
import { validateQuery } from '../utils/validate-query.js';

const sanitizeQueryMiddleware: RequestHandler = async (req, res, next) => {
	req.sanitizedQuery = {};
	if (!req.query) return;

	// Skip sanitization and validation if query is empty
	if (Object.keys(req.query).length === 0) {
		Object.freeze(req.sanitizedQuery);
		return next();
	}

	try {
		const rawLimit = req.query['limit'] !== undefined ? Number(req.query['limit']) : undefined;

		req.sanitizedQuery = await sanitizeQuery(
			{
				fields: req.query['fields'] || '*',
				...req.query,
			},
			req.schema,
			req.accountability || null,
		);

		// Embed the original (pre-cap) limit so MetaService can detect capping downstream.
		// sanitizeQuery caps limit=-1 and limit>max to effectiveMaxLimit, so we preserve the
		// raw value here to allow controllers and MetaService to signal capping to clients.
		if (rawLimit !== undefined) {
			(req.sanitizedQuery as any).raw_limit = rawLimit;
		}

		Object.freeze(req.sanitizedQuery);

		validateQuery(req.sanitizedQuery);

		if (rawLimit === -1 || (rawLimit !== undefined && rawLimit > QUERY_HARD_LIMIT_CAP)) {
			res.setHeader('X-Query-Limit-Capped', 'true');
			res.setHeader('X-Query-Limit-Effective', String(QUERY_HARD_LIMIT_CAP));
		}
	} catch (error) {
		return next(error);
	}

	return next();
};

export default sanitizeQueryMiddleware;
