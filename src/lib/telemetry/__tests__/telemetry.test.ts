import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PocketBase client
vi.mock('@/lib/pocketbase/client', () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    return {
        default: {
            collection: vi.fn(() => ({ create: mockCreate })),
            authStore: { record: null },
        },
        __mockCreate: mockCreate,
    };
});

import { reportError } from '../telemetry';

// Access the mock for assertions
const getMockCreate = async () => {
    const mod = await import('@/lib/pocketbase/client');
    return (mod as unknown as { __mockCreate: ReturnType<typeof vi.fn> }).__mockCreate;
};

describe('reportError', () => {
    beforeEach(async () => {
        const mockCreate = await getMockCreate();
        mockCreate.mockClear();
    });

    it('should include context component and action in error field', async () => {
        const mockCreate = await getMockCreate();

        await reportError(new Error('Test error'), {
            component: 'LoginForm',
            action: 'submit',
        });

        expect(mockCreate).toHaveBeenCalledOnce();
        const callArgs = mockCreate.mock.calls[0][0];

        // Context should be prefixed in error field
        expect(callArgs.error).toContain('[LoginForm/submit]');
        expect(callArgs.error).toContain('[Error] Test error');
    });

    it('should include extra context in device_info', async () => {
        const mockCreate = await getMockCreate();

        await reportError(new Error('Test'), {
            component: 'global',
            action: 'window.onerror',
            extra: { filename: 'app.js', lineno: 42 },
        });

        expect(mockCreate).toHaveBeenCalledOnce();
        const callArgs = mockCreate.mock.calls[0][0];

        expect(callArgs.device_info).toContain('ctx:');
        expect(callArgs.device_info).toContain('filename');
    });

    it('should work without context (no prefix)', async () => {
        const mockCreate = await getMockCreate();

        await reportError(new Error('Plain error'));

        expect(mockCreate).toHaveBeenCalledOnce();
        const callArgs = mockCreate.mock.calls[0][0];

        // No context prefix — should start with [Error]
        expect(callArgs.error).toMatch(/^\[Error\]/);
    });

    it('should handle string errors', async () => {
        const mockCreate = await getMockCreate();

        await reportError('something went wrong', {
            component: 'Sync',
            action: 'pull',
        });

        expect(mockCreate).toHaveBeenCalledOnce();
        const callArgs = mockCreate.mock.calls[0][0];

        expect(callArgs.error).toContain('[Sync/pull]');
        expect(callArgs.error).toContain('something went wrong');
    });

    it('should never throw even if PocketBase fails', async () => {
        const mockCreate = await getMockCreate();
        mockCreate.mockRejectedValueOnce(new Error('Network error'));

        // Should not throw
        await expect(
            reportError(new Error('test'), { component: 'X', action: 'Y' })
        ).resolves.toBeUndefined();
    });
});
