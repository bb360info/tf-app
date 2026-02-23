import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock telemetry before importing errors module
vi.mock('@/lib/telemetry/telemetry', () => ({
    reportError: vi.fn().mockResolvedValue(undefined),
}));

import { getErrorMessage, logError } from '../errors';

describe('getErrorMessage', () => {
    it('extracts message from standard Error', () => {
        expect(getErrorMessage(new Error('Network failed'))).toBe('Network failed');
    });

    it('returns fallback for non-Error values', () => {
        expect(getErrorMessage(null, 'Something went wrong')).toBe('Something went wrong');
        expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
        expect(getErrorMessage(42, 'default')).toBe('default');
    });

    it('extracts PocketBase response.data.message', () => {
        const pbErr = Object.assign(new Error('generic'), {
            response: { data: { message: 'Field "name" is required' } },
        });
        expect(getErrorMessage(pbErr)).toBe('Field "name" is required');
    });

    it('falls back to Error.message when PB response has no message', () => {
        const pbErr = Object.assign(new Error('auth failed'), {
            response: { data: {} },
        });
        expect(getErrorMessage(pbErr)).toBe('auth failed');
    });

    it('uses default fallback when none provided', () => {
        expect(getErrorMessage('string error')).toBe('An error occurred');
    });
});

describe('logError', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not throw', () => {
        expect(() =>
            logError(new Error('test'), { component: 'TestComponent', action: 'run' })
        ).not.toThrow();
    });

    it('does not throw for non-Error values', () => {
        expect(() =>
            logError('string error', { component: 'X', action: 'Y' })
        ).not.toThrow();
    });

    it('calls reportError from telemetry', async () => {
        const { reportError } = await import('@/lib/telemetry/telemetry');
        const error = new Error('test error');
        const ctx = { component: 'Plans', action: 'create' };

        logError(error, ctx);

        expect(reportError).toHaveBeenCalledWith(error, ctx);
    });
});
