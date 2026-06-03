import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	if (await knex.schema.hasTable('directus_webhooks')) {
		return;
	}

	await knex.schema.createTable('directus_webhooks', (table) => {
		table.increments('id').primary();
		table.text('url').notNullable();
		table.string('method', 10).notNullable();
		table.json('collections').notNullable();
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTableIfExists('directus_webhooks');
}
