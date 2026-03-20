import { InvalidCredentialsError, InvalidPayloadError } from '@directus/errors';
import type { Accountability } from '@directus/types';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/generate-hash.js', () => ({
	generateHash: vi.fn((s: string) => Promise.resolve(`hashed:${s}`)),
}));

vi.mock('argon2', () => ({
	default: { verify: vi.fn() },
}));

vi.mock('../database/index.js', () => ({ default: vi.fn() }));
vi.mock('../services/utils.js', () => ({ UtilsService: vi.fn() }));
vi.mock('../services/import-export.js', () => ({ ExportService: vi.fn(), ImportService: vi.fn() }));
vi.mock('../services/revisions.js', () => ({ RevisionsService: vi.fn() }));
vi.mock('../middleware/collection-exists.js', () => ({ default: vi.fn((_req, _res, next) => next()) }));

// Import router after all mocks are set up
const { default: router } = await import('./utils.js');

function makeReq(overrides: Partial<Request> = {}): Request {
	return {
		body: {},
		query: {},
		params: {},
		accountability: { user: 'user-id', role: 'role-id', admin: false } as Accountability,
		...overrides,
	} as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
	const json = vi.fn();
	const status = vi.fn().mockReturnThis();
	const res = { json, status, locals: {} } as unknown as Response;
	return { res, json, status };
}

function callRoute(method: string, path: string, req: Request, res: Response): Promise<void> {
	return new Promise((resolve, reject) => {
		const layer = (router.stack as any[]).find(
			(l) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()],
		);

		if (!layer) {
			return reject(new Error(`Route ${method} ${path} not found`));
		}

		const handlers: any[] = layer.route.stack.map((s: any) => s.handle);

		let idx = 0;

		const next = (err?: any) => {
			if (err) return reject(err);
			const handler = handlers[idx++];
			if (!handler) return resolve();

			try {
				const result = handler(req, res, next);
				if (result && typeof result.catch === 'function') result.catch(reject);
			} catch (e) {
				reject(e);
			}
		};

		next();
	});
}

describe('POST /hash/generate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('auth boundary', () => {
		it('returns 401 when no accountability (unauthenticated)', async () => {
			const req = makeReq({ accountability: null as any, body: { string: 'test' } });
			const { res } = makeRes();

			await expect(callRoute('post', '/hash/generate', req, res)).rejects.toBeInstanceOf(InvalidCredentialsError);
		});
	});

	describe('single string', () => {
		it('returns a hash string for { string }', async () => {
			const req = makeReq({ body: { string: 'hello' } });
			const { res, json } = makeRes();

			await callRoute('post', '/hash/generate', req, res);

			expect(json).toHaveBeenCalledWith({ data: 'hashed:hello' });
		});

		it('throws InvalidPayloadError when both string and strings are missing', async () => {
			const req = makeReq({ body: {} });
			const { res } = makeRes();

			await expect(callRoute('post', '/hash/generate', req, res)).rejects.toBeInstanceOf(InvalidPayloadError);
		});
	});

	describe('bulk strings', () => {
		it('returns an array of hashes for { strings }', async () => {
			const req = makeReq({ body: { strings: ['a', 'b', 'c'] } });
			const { res, json } = makeRes();

			await callRoute('post', '/hash/generate', req, res);

			expect(json).toHaveBeenCalledWith({ data: ['hashed:a', 'hashed:b', 'hashed:c'] });
		});

		it('preserves input order in the returned array', async () => {
			const req = makeReq({ body: { strings: ['x', 'y', 'z'] } });
			const { res, json } = makeRes();

			await callRoute('post', '/hash/generate', req, res);

			const result = (json.mock.calls[0] as any)[0].data as string[];
			expect(result[0]).toBe('hashed:x');
			expect(result[1]).toBe('hashed:y');
			expect(result[2]).toBe('hashed:z');
		});

		it('throws InvalidPayloadError for empty strings array', async () => {
			const req = makeReq({ body: { strings: [] } });
			const { res } = makeRes();

			await expect(callRoute('post', '/hash/generate', req, res)).rejects.toBeInstanceOf(InvalidPayloadError);
		});

		it('throws InvalidPayloadError when strings is not an array', async () => {
			const req = makeReq({ body: { strings: 'not-an-array' } });
			const { res } = makeRes();

			await expect(callRoute('post', '/hash/generate', req, res)).rejects.toBeInstanceOf(InvalidPayloadError);
		});
	});
});
