import type { Knex } from 'knex';
import type { AbstractServiceOptions, Accountability, SchemaOverview } from '../types/index.js';
import { ItemsService } from './items.js';
import { calculateRelevance } from '../utils/calculate-relevance.js';

export interface SearchOptions {
	query: string;
	collections?: string[];
	fields?: string[];
	limit: number;
	offset: number;
}

export interface SearchResult {
	collection: string;
	id: string | number;
	field: string;
	snippet: string;
	score: number;
}

export interface SearchResponse {
	results: SearchResult[];
	total_count: number;
}

export class SearchService {
	knex: Knex;
	accountability: Accountability | null;
	schema: SchemaOverview;

	constructor(options: AbstractServiceOptions) {
		this.knex = options.knex || (global as any).database;
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	async search(options: SearchOptions): Promise<SearchResponse> {
		const { query, collections, fields, limit, offset } = options;

		// Determine which collections to search
		const collectionsToSearch = collections || this.getAllSearchableCollections();

		// Perform search across all collections
		const allResults: SearchResult[] = [];

		for (const collection of collectionsToSearch) {
			const collectionResults = await this.searchInCollection({
				collection,
				query,
				fields,
			});

			allResults.push(...collectionResults);
		}

		// Sort by relevance score (descending)
		allResults.sort((a, b) => b.score - a.score);

		// Apply pagination
		const paginatedResults = allResults.slice(offset, offset + limit);

		return {
			results: paginatedResults,
			total_count: allResults.length,
		};
	}

	private async searchInCollection(options: {
		collection: string;
		query: string;
		fields?: string[];
	}): Promise<SearchResult[]> {
		const { collection, query, fields } = options;

		// Get text fields for this collection
		const textFields = this.getTextFieldsForCollection(collection, fields);

		if (textFields.length === 0) {
			return [];
		}

		// Fetch all items from collection
		const service = new ItemsService(collection, {
			knex: this.knex,
			accountability: this.accountability,
			schema: this.schema,
		});

		const items = await service.readByQuery({
			fields: ['id', ...textFields],
			limit: -1,
		});

		// Search in text fields
		const results: SearchResult[] = [];
		const queryLower = query.toLowerCase();

		for (const item of items) {
			for (const field of textFields) {
				const fieldValue = item[field];

				if (!fieldValue || typeof fieldValue !== 'string') {
					continue;
				}

				const fieldValueLower = fieldValue.toLowerCase();

				if (fieldValueLower.includes(queryLower)) {
					// Calculate relevance score
					const score = calculateRelevance(fieldValue, query);

					// Generate snippet
					const snippet = this.generateSnippet(fieldValue, query);

					results.push({
						collection,
						id: item.id,
						field,
						snippet,
						score,
					});
				}
			}
		}

		return results;
	}

	private getAllSearchableCollections(): string[] {
		const collections = Object.keys(this.schema.collections);
		return collections.filter((name) => !name.startsWith('directus_'));
	}

	private getTextFieldsForCollection(
		collection: string,
		requestedFields?: string[]
	): string[] {
		const collectionSchema = this.schema.collections[collection];

		if (!collectionSchema) {
			return [];
		}

		const textTypes = ['string', 'text', 'varchar', 'char'];
		const allTextFields = Object.entries(collectionSchema.fields)
			.filter(([_, field]) => textTypes.includes(field.type))
			.map(([name, _]) => name);

		if (requestedFields) {
			return allTextFields.filter((field) => requestedFields.includes(field));
		}

		return allTextFields;
	}

	private generateSnippet(text: string, query: string, maxLength = 150): string {
		const queryLower = query.toLowerCase();
		const textLower = text.toLowerCase();
		const index = textLower.indexOf(queryLower);

		if (index === -1) {
			return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
		}

		const start = Math.max(0, index - 50);
		const end = Math.min(text.length, index + query.length + 50);

		let snippet = text.substring(start, end);

		if (start > 0) snippet = '...' + snippet;
		if (end < text.length) snippet = snippet + '...';

		// Highlight query term
		snippet = snippet.replace(new RegExp(query, 'gi'), (match) => `<mark>${match}</mark>`);

		return snippet;
