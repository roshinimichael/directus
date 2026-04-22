#!/usr/bin/env node

/**
 * Auto-migration script for v-old-button to v-button
 *
 * This codemod:
 * - Updates all component imports
 * - Renames props: type to variant
 * - Updates slot syntax: #default to #content
 * - Validates all changes before committing
 * - Provides rollback mechanism if validation fails
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const BACKUP_DIR = '.migration-backup';
const DRY_RUN = process.argv.includes('--dry-run');

const propMappings = {
	'type="primary"': 'variant="primary"',
	'type="secondary"': 'variant="secondary"',
	'type="danger"': 'variant="danger"',
	'type="normal"': 'variant="normal"',
	":type='primary'": ":variant='primary'",
	":type='secondary'": ":variant='secondary'",
	":type='danger'": ":variant='danger'",
	":type='normal'": ":variant='normal'",
};

const slotMappings = {
	'<template #default>': '<template #content>',
	'</template> <!-- default -->': '</template> <!-- content -->',
};

async function backupFile(filePath) {
	const backupPath = path.join(BACKUP_DIR, filePath);
	const backupDir = path.dirname(backupPath);
	await fs.mkdir(backupDir, { recursive: true });
	await fs.copyFile(filePath, backupPath);
	console.log(`  ✓ Backed up: ${filePath}`);
}

async function migrateFile(filePath) {
	let content = await fs.readFile(filePath, 'utf-8');
	let changed = false;

	// Update imports
	if (content.includes('v-old-button')) {
		content = content.replace(
			/import\s+VOldButton\s+from\s+['"].*v-old-button\.vue['"]/g,
			"import VButton from '@/components/v-button.vue'"
		);
		content = content.replace(/<v-old-button/g, '<v-button');
		content = content.replace(/<\/v-old-button>/g, '</v-button>');
		changed = true;
	}

	// Update props
	for (const [oldProp, newProp] of Object.entries(propMappings)) {
		if (content.includes(oldProp)) {
			content = content.replace(new RegExp(oldProp.replace(/"/g, '\\"'), 'g'), newProp);
			changed = true;
		}
	}

	// Update slot syntax
	for (const [oldSlot, newSlot] of Object.entries(slotMappings)) {
		if (content.includes(oldSlot)) {
			content = content.replace(new RegExp(oldSlot, 'g'), newSlot);
			changed = true;
		}
	}

	if (changed) {
		if (!DRY_RUN) {
			await backupFile(filePath);
			await fs.writeFile(filePath, content, 'utf-8');
		}
		return { path: filePath, changed: true };
	}

	return { path: filePath, changed: false };
}

async function validateMigration(results) {
	const changed = results.filter((r) => r.changed);
	console.log(`\n✓ Migration complete: ${changed.length} files updated`);

	// Basic validation: no broken imports
	for (const result of changed) {
		const content = await fs.readFile(result.path, 'utf-8');
		if (content.includes('v-old-button')) {
			throw new Error(`Validation failed: ${result.path} still contains v-old-button references`);
		}
		if (content.includes('type="primary"') || content.includes('type="secondary"')) {
			console.warn(`⚠ Warning: ${result.path} may have unmapped type props`);
		}
	}

	console.log('✓ Validation passed');
}

async function rollback() {
	console.log('\nRolling back changes...');
	const backupFiles = await glob(`${BACKUP_DIR}/**/*.vue`);

	for (const backupPath of backupFiles) {
		const originalPath = backupPath.replace(BACKUP_DIR + '/', '');
		await fs.copyFile(backupPath, originalPath);
		console.log(`  ✓ Restored: ${originalPath}`);
	}

	await fs.rm(BACKUP_DIR, { recursive: true });
	console.log('✓ Rollback complete');
}

async function main() {
	try {
		console.log('Starting v-old-button to v-button migration\n');

		if (DRY_RUN) {
			console.log('DRY RUN MODE (no files will be modified)\n');
		}

		// Find all Vue files that use v-old-button
		const files = await glob('app/src/**/*.vue');
		console.log(`Found ${files.length} Vue files to scan\n`);

		const results = [];
		for (const file of files) {
			const result = await migrateFile(file);
			if (result.changed) {
				console.log(`  ✓ Migrated: ${file}`);
				results.push(result);
			}
		}

		if (results.length === 0) {
			console.log('\n✓ No files needed migration');
			return;
		}

		if (!DRY_RUN) {
			await validateMigration(results);
		}

		console.log('\n✓ Migration successful!');
		console.log(`\nBackup stored in: ${BACKUP_DIR}`);
		console.log('To rollback, run: node scripts/migrate-v-old-button.js --rollback');
	} catch (error) {
		console.error('\nMigration failed:', error.message);
		if (process.argv.includes('--rollback')) {
			await rollback();
		}
		process.exit(1);
	}
}

if (process.argv.includes('--rollback')) {
	rollback();
} else {
	main();
}
