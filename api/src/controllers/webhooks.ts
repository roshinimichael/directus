import { Router } from 'express';
import { WebhookService } from '../services/webhooks.js';
import asyncHandler from '../utils/async-handler.js';
import { InvalidPayloadError } from '@directus/errors';

const router = Router();

router.post(
	'/',
	asyncHandler(async (req, res) => {
		const { url, method, collections } = req.body;

		if (!url || typeof url !== 'string') {
			throw new InvalidPayloadError({ reason: 'Field "url" is required' });
		}

		if (!method || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
			throw new InvalidPayloadError({ reason: 'Field "method" must be one of: GET, POST, PUT, PATCH, DELETE' });
		}

		if (!collections || !Array.isArray(collections) || collections.length === 0) {
			throw new InvalidPayloadError({ reason: 'Field "collections" must be a non-empty array' });
		}

		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		const webhook = await service.createOne({ url, method, collections });

		res.status(201).json({ data: webhook });
	})
);

router.get(
	'/',
	asyncHandler(async (req, res) => {
		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		const webhooks = await service.readMany();

		res.json({ data: webhooks });
	})
);

router.get(
	'/:id',
	asyncHandler(async (req, res) => {
		const id = req.params['id'];
		if (!id) throw new InvalidPayloadError({ reason: 'Webhook id is required' });

		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		const webhook = await service.readOne(id);

		res.json({ data: webhook });
	})
);

router.delete(
	'/:id',
	asyncHandler(async (req, res) => {
		const id = req.params['id'];
		if (!id) throw new InvalidPayloadError({ reason: 'Webhook id is required' });

		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		await service.deleteOne(id);

		res.status(204).end();
	})
);

router.patch(
	'/:id',
	asyncHandler(async (req, res) => {
		const { url, method, collections } = req.body;
		const id = req.params['id'];
		if (!id) throw new InvalidPayloadError({ reason: 'Webhook id is required' });

		const updates: Record<string, any> = {};

		if (url) updates['url'] = url;
		if (method) updates['method'] = method;
		if (collections) updates['collections'] = collections;

		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		const webhook = await service.updateOne(id, updates);

		res.json({ data: webhook });
	})
);

export default router;
