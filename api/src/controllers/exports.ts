import express from 'express';
import type { Request, Response } from 'express';
import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { isSystemCollection } from '@directus/system-data';
import { respond } from '../middleware/respond.js';
import collectionExists from '../middleware/collection-exists.js';
import { ItemsService } from '../services/items.js';
import asyncHandler from '../utils/async-handler.js';
import { sanitizeQuery } from '../utils/sanitize-query.js';

const router = express.Router();

/**
 * POST /exports/:collection
 *
 * Export items from a user collection as JSON or CSV.
 * Body: { format?: 'json' | 'csv'; query?: object; fields?: string[] }
 */
router.post(
	'/:collection',
	collectionExists,
	asyncHandler(async (req: Request, res: Response) => {
		if (isSystemCollection(req.params['collection']!)) {
			throw new ForbiddenError();
		}

		const format: 'json' | 'csv' = req.body?.format ?? 'json';
		if (format !== 'json' && format !== 'csv') {
			throw new InvalidPayloadError({ reason: "format must be 'json' or 'csv'" });
		}

		const fields: string[] | undefined = Array.isArray(req.body?.fields)
			? req.body.fields
			: undefined;

		const service = new ItemsService(req.collection, {
			accountability: req.accountability,
			schema: req.schema,
		});

		const sanitizedQuery = sanitizeQuery(req.body?.query ?? {}, req.accountability);
		if (fields) sanitizedQuery.fields = fields;

		const items = await service.readByQuery(sanitizedQuery);

		if (format === 'csv') {
			if (!items || items.length === 0) {
				res.setHeader('Content-Type', 'text/csv');
				res.setHeader('Content-Disposition', `attachment; filename="${req.collection}.csv"`);
				return res.send('');
			}

			const headers = Object.keys(items[0] as Record<string, unknown>);
			const csvRows = [
				headers.join(','),
				...items.map((row) =>
					headers
						.map((h) => {
							const val = (row as Record<string, unknown>)[h];
							const str = val == null ? '' : String(val);
							return str.includes(',') || str.includes('"') || str.includes('\n')
								? `"${str.replace(/"/g, '""')}"`
								: str;
						})
						.join(','),
				),
			].join('\n');

			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', `attachment; filename="${req.collection}.csv"`);
			return res.send(csvRows);
		}

		res.locals['payload'] = { data: items };
		return respond(req, res);
	}),
);

export default router;
