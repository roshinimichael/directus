/**
 * Generate a simple short hash for a given string
 * This is not cryptographically secure in any way, and has a high chance of collision
 *
 * @param str - The string to hash
 * @param length - Optional max length to truncate the hex output (useful for DB index name limits)
 */
export function getSimpleHash(str: string, length?: number): string {
	let hash = 0;

	for (let i = 0; i < str.length; hash &= hash) {
		hash = 31 * hash + str.charCodeAt(i++);
	}

	const result = Math.abs(hash).toString(16);
	return length !== undefined ? result.slice(0, length) : result;
}
