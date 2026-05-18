/**
 * PATCH /archive/:collection
 *
 * Batch-archive (soft-delete) items by setting their status field to 'archived'.
 * Body: { keys: PrimaryKey[]; status_field?: string }
 */
import express from 'express';
import type { Request, Response } from 'express';
import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { isSystemCollection } from '@directus/system-data';
import type { PrimaryKey } from '@directus/types';
import { respond } from '../middleware/respond.js';
import collectionExists from '../middleware/collection-exists.js';
import { ItemsService } from '../services/items.js';
import asyncHandler from '../utils/async-handler.js';

const router = express.Router();

router.patch(
	'/:collection',
	collectionExists,
	asyncHandler(async (req: Request, res: Response, next) => {
		if (isSystemCollection(req.params['collection']!)) {
			throw new ForbiddenError();
		}

		const keys: PrimaryKey[] = req.body?.keys;
		const statusField: string = req.body?.status_field ?? 'status';

		if (!Array.isArray(keys) || keys.length === 0) {
			throw new InvalidPayloadError({ reason: "'keys' must be a non-empty array of primary keys." });
		}
		if (keys.length > 500) {
			throw new InvalidPayloadError({ reason: 'Cannot archive more than 500 items at once.' });
		}

		const service = new ItemsService(req.collection, {
			accountability: req.accountability,
			schema: req.schema,
		});

		await service.updateMany(keys, { [statusField]: 'archived' });

		res.locals['payload'] = {
			data: {
				archived: keys.length,
				keys,
				status_field: statusField,
			},
		};

		return next();
	}),
	respond,
);

export default router;
