import { Router } from 'express';
import { WebhookService } from '../services/webhooks.js';
import asyncHandler from '../utils/async-handler.js';
import { InvalidPayloadException } from '@directus/exceptions';

const router = Router();

router.post(
	'/',
	asyncHandler(async (req, res) => {
		const { url, method, collections } = req.body;

		if (!url || typeof url !== 'string') {
			throw new InvalidPayloadException('Field "url" is required');
		}

		if (!method || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
			throw new InvalidPayloadException('Field "method" must be one of: GET, POST, PUT, PATCH, DELETE');
		}

		if (!collections || !Array.isArray(collections) || collections.length === 0) {
			throw new InvalidPayloadException('Field "collections" must be a non-empty array');
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
		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		const webhook = await service.readOne(req.params.id);

		res.json({ data: webhook });
	})
);

router.delete(
	'/:id',
	asyncHandler(async (req, res) => {
		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		await service.deleteOne(req.params.id);

		res.status(204).end();
	})
);

router.patch(
	'/:id',
	asyncHandler(async (req, res) => {
		const { url, method, collections } = req.body;
		const updates: Record<string, any> = {};

		if (url) updates.url = url;
		if (method) updates.method = method;
		if (collections) updates.collections = collections;

		const service = new WebhookService({ schema: req.schema, accountability: req.accountability });
		const webhook = await service.updateOne(req.params.id, updates);

		res.json({ data: webhook });
	})
);

