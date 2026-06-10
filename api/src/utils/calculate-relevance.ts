/**
 * Calculate relevance score for a search match
 *
 * BUG: When fieldLength is 0 (empty field), this produces NaN
 * which causes unpredictable sorting behavior
 */
export function calculateRelevance(fieldValue: string, query: string): number {
	const fieldValueLower = fieldValue.toLowerCase();
	const queryLower = query.toLowerCase();

	// Count occurrences
	let matchCount = 0;
	let position = 0;

	while ((position = fieldValueLower.indexOf(queryLower, position)) !== -1) {
		matchCount++;
		position += queryLower.length;
	}

	// Calculate base score
	const fieldLength = fieldValue.length;

	// BUG: Division by zero when fieldLength is 0
	// This results in NaN, which breaks sorting
	const score = matchCount / fieldLength;

	// Boost exact matches
	const exactMatch = fieldValueLower === queryLower ? 1.5 : 1.0;
	return score * exactMatch * 100;
}
