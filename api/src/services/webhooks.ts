import { ItemsService } from './items.js';
import type { AbstractServiceOptions, Item, PrimaryKey } from '../types/index.js';
import axios from 'axios';
import { createError } from '@directus/errors';

const WebhookDispatchError = createError('WEBHOOK_DISPATCH_ERROR', 'Failed to dispatch webhook', 500);

export class WebhookService extends ItemsService {
	private static activeWebhooks: Map<string, WebhookConfig[]> = new Map();

	constructor(options: AbstractServiceOptions) {
		super('directus_webhooks', options);
	}

	async createOne(data: Record<string, any>): Promise<PrimaryKey> {
		const result = await super.createOne(data);
		await this.refreshActiveWebhooks();
		return result;
	}

	async updateOne(key: PrimaryKey, data: Record<string, any>): Promise<PrimaryKey> {
		const result = await super.updateOne(key, data);
		await this.refreshActiveWebhooks();
		return result;
	}

	async deleteOne(key: PrimaryKey): Promise<PrimaryKey> {
		const result = await super.deleteOne(key);
		await this.refreshActiveWebhooks();
		return result;
	}

	async readMany(): Promise<Item[]> {
		return await super.readByQuery({});
	}

	async readOne(key: PrimaryKey): Promise<Item> {
		const items = await super.readByQuery({
			filter: { id: { _eq: key } },
			limit: 1,
		});

		if (!items || items.length === 0) {
			throw new Error(`Webhook ${key} not found`);
		}

		return items[0];
	}

	private async refreshActiveWebhooks(): Promise<void> {
		const webhooks = await this.readMany();
		WebhookService.activeWebhooks.clear();

		for (const webhook of webhooks) {
			for (const collection of webhook.collections) {
				if (!WebhookService.activeWebhooks.has(collection)) {
					WebhookService.activeWebhooks.set(collection, []);
				}

				WebhookService.activeWebhooks.get(collection)!.push({
					id: webhook.id,
					url: webhook.url,
					method: webhook.method,
				});
			}
		}
	}

	static async dispatchWebhooksForCollection(
		collection: string,
		action: 'create' | 'update' | 'delete',
		payload: Record<string, any>
	): Promise<void> {
		const webhooks = this.activeWebhooks.get(collection);

		if (!webhooks || webhooks.length === 0) {
			return;
		}

		const dispatchPromises = webhooks.map(async (webhook) => {
			try {
				await axios({
					method: webhook.method,
					url: webhook.url,
					data: {
						event: `items.${action}`,
						collection,
						payload,
						timestamp: new Date().toISOString(),
					},
					timeout: 5000,
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'Directus-Webhook/1.0',
					},
				});
			} catch (error) {
				console.error(`Failed to dispatch webhook ${webhook.id} to ${webhook.url}:`, error);
			}
		});

		await Promise.allSettled(dispatchPromises);
	}
}

interface WebhookConfig {
	id: string;
	url: string;
	method: string;
}

// Hook into items service to trigger webhooks
export async function registerWebhookHooks() {
	const originalCreateOne = ItemsService.prototype.createOne;
	const originalUpdateOne = ItemsService.prototype.updateOne;
	const originalDeleteOne = ItemsService.prototype.deleteOne;

	ItemsService.prototype.createOne = async function (data: Record<string, any>) {
		const result = await originalCreateOne.call(this, data);
		await WebhookService.dispatchWebhooksForCollection(this.collection, 'create', data);
		return result;
	};

	ItemsService.prototype.updateOne = async function (key: PrimaryKey, data: Record<string, any>) {
		const result = await originalUpdateOne.call(this, key, data);
		await WebhookService.dispatchWebhooksForCollection(this.collection, 'update', { id: key, ...data });
		return result;
	};
