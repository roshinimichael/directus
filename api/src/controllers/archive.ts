/**
 * PATCH /archive/:collection
 *
 * Batch-archive (soft-delete) items by setting their status field to 'archived'.
 * Body: { keys: PrimaryKey[]; status_field?: string }
 */
import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { isSystemCollection } from '@directus/system-data';
import type { PrimaryKey } from '@directus/types';
import type { Request, Response } from 'express';
import express from 'express';
import collectionExists from '../middleware/collection-exists.js';
import { respond } from '../middleware/respond.js';
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

		// Reject explicit null — do not silently default
		if (req.body && 'status_field' in req.body && req.body.status_field === null) {
			throw new InvalidPayloadError({ reason: "'status_field' must be a non-empty string, not null." });
		}

		const statusField: string = req.body?.status_field ?? 'status';

		// status_field must be a non-empty alphabetic identifier (no pure numeric strings)
		if (typeof statusField !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(statusField)) {
			throw new InvalidPayloadError({
				reason: "'status_field' must be a valid field name (letters, digits, underscores; cannot start with a digit).",
			});
		}

		if (!Array.isArray(keys) || keys.length === 0) {
			throw new InvalidPayloadError({ reason: "'keys' must be a non-empty array of primary keys." });
		}

		if (keys.length > 500) {
			throw new InvalidPayloadError({ reason: 'Cannot archive more than 500 items at once.' });
		}

		// Reject negative integer keys
		const hasNegativeKey = keys.some((k) => typeof k === 'number' && k < 0);

		if (hasNegativeKey) {
			throw new InvalidPayloadError({ reason: "'keys' must not contain negative integers." });
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
