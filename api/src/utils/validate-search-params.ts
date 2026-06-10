import type { SchemaOverview } from '../types/index.js';

export interface ValidateSearchParamsOptions {
	collections?: string[];
	fields?: string[];
	schema: SchemaOverview;
}

export async function validateSearchParams(
	options: ValidateSearchParamsOptions
): Promise<void> {
	const { collections, fields, schema } = options;

	// Validate collections exist
	if (collections) {
		for (const collection of collections) {
			if (!schema.collections[collection]) {
				throw new Error(`Collection "${collection}" does not exist`);
			}
		}
	}

	// Validate fields are text fields
	if (fields && collections) {
		const textTypes = ['string', 'text', 'varchar', 'char'];

		for (const collection of collections) {
			const collectionSchema = schema.collections[collection];

			if (!collectionSchema) {
				continue;
			}

			for (const field of fields) {
				const fieldSchema = collectionSchema.fields[field];

				if (!fieldSchema) {
					throw new Error(
						`Field "${field}" does not exist in collection "${collection}"`
					);
				}

				if (!textTypes.includes(fieldSchema.type)) {
					throw new Error(
						`Field "${field}" in collection "${collection}" is not a text field`
					);
				}
			}
		}
	}
}
