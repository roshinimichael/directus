import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { systemCollectionRows } from '@directus/system-data';
import type { AbstractServiceOptions, Accountability, PrimaryKey, SchemaOverview } from '@directus/types';
import type { Knex } from 'knex';
import { clearSystemCache, getCache } from '../cache.js';
import getDatabase from '../database/index.js';
import emitter from '../emitter.js';
import { fetchAllowedFields } from '../permissions/modules/fetch-allowed-fields/fetch-allowed-fields.js';
import { validateAccess } from '../permissions/modules/validate-access/validate-access.js';
import { shouldClearCache } from '../utils/should-clear-cache.js';

export class UtilsService {
	knex: Knex;
	accountability: Accountability | null;
	schema: SchemaOverview;

	constructor(options: AbstractServiceOptions) {
		this.knex = options.knex || getDatabase();
		this.accountability = options.accountability || null;
		this.schema = options.schema;
	}

	private async _getSortField(collection: string): Promise<string> {
		const sortFieldResponse =
			(await this.knex.select('sort_field').from('directus_collections').where({ collection }).first()) ||
			systemCollectionRows;

		const sortField = sortFieldResponse?.sort_field;

		if (!sortField) {
			throw new InvalidPayloadError({ reason: `Collection "${collection}" doesn't have a sort field` });
		}

		return sortField;
	}

	private async _validateSortAccess(collection: string, sortField: string): Promise<void> {
		if (this.accountability && this.accountability.admin !== true) {
			await validateAccess(
				{
					accountability: this.accountability,
					action: 'update',
					collection,
				},
				{
					schema: this.schema,
					knex: this.knex,
				},
			);

			const allowedFields = await fetchAllowedFields(
				{ collection, action: 'update', accountability: this.accountability },
				{ schema: this.schema, knex: this.knex },
			);

			if (allowedFields[0] !== '*' && allowedFields.includes(sortField) === false) {
				throw new ForbiddenError();
			}
		}
	}

	private async _normalizeSortValues(collection: string, sortField: string, primaryKeyField: string): Promise<void> {
		// Make sure all rows have a sort value
		const countResponse = await this.knex.count('* as count').from(collection).whereNull(sortField).first();

		if (countResponse?.count && +countResponse.count !== 0) {
			const lastSortValueResponse = await this.knex.max(sortField).from(collection).first();

			const rowsWithoutSortValue = await this.knex
				.select(primaryKeyField, sortField)
				.from(collection)
				.whereNull(sortField);

			let lastSortValue: any = lastSortValueResponse ? Object.values(lastSortValueResponse)[0] : 0;

			for (const row of rowsWithoutSortValue) {
				lastSortValue++;

				await this.knex(collection)
					.update({ [sortField]: lastSortValue })
					.where({ [primaryKeyField]: row[primaryKeyField] });
			}
		}

		// Check to see if there's any duplicate values in the sort counts. If that's the case, we'll have to
		// reset the count values, otherwise the sort operation will cause unexpected results
		const duplicates = await this.knex
			.select(sortField)
			.count(sortField, { as: 'count' })
			.groupBy(sortField)
			.from(collection)
			.havingRaw('count(??) > 1', [sortField]);

		if (duplicates?.length > 0) {
			const ids = await this.knex.select(primaryKeyField).from(collection).orderBy(sortField);

			// This might not scale that well, but I don't really know how to accurately set all rows
			// to a sequential value that works cross-DB vendor otherwise
			for (let i = 0; i < ids.length; i++) {
				await this.knex(collection)
					.update({ [sortField]: i + 1 })
					.where(ids[i]);
			}
		}
	}

	private async _applySortMove(
		collection: string,
		sortField: string,
		primaryKeyField: string,
		item: PrimaryKey,
		to: PrimaryKey,
	): Promise<void> {
		const targetSortValueResponse = await this.knex
			.select(sortField)
			.from(collection)
			.where({ [primaryKeyField]: to })
			.first();

		const targetSortValue = targetSortValueResponse[sortField];

		const sourceSortValueResponse = await this.knex
			.select(sortField)
			.from(collection)
			.where({ [primaryKeyField]: item })
			.first();

		const sourceSortValue = sourceSortValueResponse[sortField];

		// Set the target item to the new sort value
		await this.knex(collection)
			.update({ [sortField]: targetSortValue })
			.where({ [primaryKeyField]: item });

		if (sourceSortValue < targetSortValue) {
			await this.knex(collection)
				.decrement(sortField, 1)
				.where(sortField, '>', sourceSortValue)
				.andWhere(sortField, '<=', targetSortValue)
				.andWhereNot({ [primaryKeyField]: item });
		} else {
			await this.knex(collection)
				.increment(sortField, 1)
				.where(sortField, '>=', targetSortValue)
				.andWhere(sortField, '<=', sourceSortValue)
				.andWhereNot({ [primaryKeyField]: item });
		}
	}

	async sort(collection: string, { item, to }: { item: PrimaryKey; to: PrimaryKey }): Promise<void> {
		const sortField = await this._getSortField(collection);
		await this._validateSortAccess(collection, sortField);

		const primaryKeyField = this.schema.collections[collection]!.primary;
		await this._normalizeSortValues(collection, sortField, primaryKeyField);
		await this._applySortMove(collection, sortField, primaryKeyField, item, to);

		// check if cache should be cleared
		const { cache } = getCache();

		if (shouldClearCache(cache, undefined, collection)) {
			await cache.clear();
		}

		emitter.emitAction(
			['items.sort', `${collection}.items.sort`],
			{
				collection,
				item,
				to,
			},
			{
				database: this.knex,
				schema: this.schema,
				accountability: this.accountability,
			},
		);
	}

	async sortMany(collection: string, moves: Array<{ item: PrimaryKey; to: PrimaryKey }>): Promise<void> {
		if (moves.length === 0) return;

		const sortField = await this._getSortField(collection);
		await this._validateSortAccess(collection, sortField);

		const primaryKeyField = this.schema.collections[collection]!.primary;
		await this._normalizeSortValues(collection, sortField, primaryKeyField);

		for (const { item, to } of moves) {
			await this._applySortMove(collection, sortField, primaryKeyField, item, to);
		}

		// check if cache should be cleared
		const { cache } = getCache();

		if (shouldClearCache(cache, undefined, collection)) {
			await cache.clear();
		}

		emitter.emitAction(
			['items.sort', `${collection}.items.sort`],
			{
				collection,
				moves,
			},
			{
				database: this.knex,
				schema: this.schema,
				accountability: this.accountability,
			},
		);
	}

	async clearCache({ system }: { system: boolean }): Promise<void> {
		if (this.accountability?.admin !== true) {
			throw new ForbiddenError();
		}

		const { cache } = getCache();

		if (system) {
			await clearSystemCache({ forced: true });
		}

		return cache?.clear();
	}
}
