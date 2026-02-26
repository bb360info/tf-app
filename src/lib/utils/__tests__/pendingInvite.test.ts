/**
 * Unit tests for pendingInvite.ts utilities
 * Track 4.22 — Phase 0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We'll mock storage manually per test group
// Mock modules are hoisted, so we define them before imports

const localStorageData: Record<string, string> = {};
const sessionStorageData: Record<string, string> = {};

function makeMockStorage(data: Record<string, string>, shouldThrow = false) {
    return {
        getItem: (key: string) => {
            if (shouldThrow) throw new Error('Storage unavailable');
            return data[key] ?? null;
        },
        setItem: (key: string, value: string) => {
            if (shouldThrow) throw new Error('Storage unavailable');
            data[key] = value;
        },
        removeItem: (key: string) => {
            if (shouldThrow) throw new Error('Storage unavailable');
            delete data[key];
        },
    };
}

// Setup storage mocks before importing the module
Object.defineProperty(globalThis, 'localStorage', {
    value: makeMockStorage(localStorageData),
    writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeMockStorage(sessionStorageData),
    writable: true,
});

import {
    savePendingInvite,
    getPendingInvite,
    clearPendingInvite,
    consumePendingInvite,
    getJoinedGroupName,
} from '../pendingInvite';

const STORAGE_KEY = 'pendingInviteCode';
const JOINED_KEY = 'joinedGroup';

beforeEach(() => {
    // Clear storage between tests
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
    Object.keys(sessionStorageData).forEach((k) => delete sessionStorageData[k]);
    vi.restoreAllMocks();
});

describe('savePendingInvite', () => {
    it('saves code to both localStorage and sessionStorage', () => {
        savePendingInvite('ABC123');
        const lsRaw = localStorageData[STORAGE_KEY];
        const ssRaw = sessionStorageData[STORAGE_KEY];
        expect(lsRaw).toBeDefined();
        expect(ssRaw).toBeDefined();
        const lsParsed = JSON.parse(lsRaw);
        expect(lsParsed.code).toBe('ABC123');
        expect(typeof lsParsed.timestamp).toBe('number');
    });

    it('overwrites previously saved code', () => {
        savePendingInvite('FIRST1');
        savePendingInvite('NEWCOD');
        expect(getPendingInvite()).toBe('NEWCOD');
    });
});

describe('getPendingInvite', () => {
    it('returns code when valid', () => {
        savePendingInvite('VALID1');
        expect(getPendingInvite()).toBe('VALID1');
    });

    it('returns null when nothing is saved', () => {
        expect(getPendingInvite()).toBeNull();
    });

    it('returns null and clears storage when entry is stale (>24h)', () => {
        const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25h ago
        const staleData = JSON.stringify({ code: 'STALE1', timestamp: staleTimestamp });
        localStorageData[STORAGE_KEY] = staleData;
        sessionStorageData[STORAGE_KEY] = staleData;

        expect(getPendingInvite()).toBeNull();
        // Auto-cleanup should have removed stale entries
        expect(localStorageData[STORAGE_KEY]).toBeUndefined();
        expect(sessionStorageData[STORAGE_KEY]).toBeUndefined();
    });

    it('returns null and clears storage when JSON is malformed', () => {
        localStorageData[STORAGE_KEY] = 'not-valid-json';

        expect(getPendingInvite()).toBeNull();
        expect(localStorageData[STORAGE_KEY]).toBeUndefined();
    });
});

describe('clearPendingInvite', () => {
    it('removes code from both storage locations', () => {
        savePendingInvite('CLEAR1');
        clearPendingInvite();
        expect(localStorageData[STORAGE_KEY]).toBeUndefined();
        expect(sessionStorageData[STORAGE_KEY]).toBeUndefined();
        expect(getPendingInvite()).toBeNull();
    });
});

describe('consumePendingInvite', () => {
    it('returns code and clears storage', () => {
        savePendingInvite('CONSU1');
        const code = consumePendingInvite();
        expect(code).toBe('CONSU1');
        expect(localStorageData[STORAGE_KEY]).toBeUndefined();
    });

    it('second call returns null (idempotent)', () => {
        savePendingInvite('CONSU2');
        consumePendingInvite(); // first call
        const second = consumePendingInvite(); // second call
        expect(second).toBeNull();
    });

    it('returns null when nothing is saved', () => {
        expect(consumePendingInvite()).toBeNull();
    });
});

describe('sessionStorage fallback', () => {
    it('falls back to sessionStorage when localStorage throws', () => {
        // Override localStorage to throw
        Object.defineProperty(globalThis, 'localStorage', {
            value: makeMockStorage({}, true), // throws on all operations
            writable: true,
            configurable: true,
        });

        // Manually populate sessionStorage (simulating previous savePendingInvite call)
        const data = JSON.stringify({ code: 'SAFARI', timestamp: Date.now() });
        sessionStorageData[STORAGE_KEY] = data;

        expect(getPendingInvite()).toBe('SAFARI');

        // Restore
        Object.defineProperty(globalThis, 'localStorage', {
            value: makeMockStorage(localStorageData),
            writable: true,
            configurable: true,
        });
    });
});

describe('getJoinedGroupName', () => {
    it('returns name from sessionStorage and clears it', () => {
        sessionStorageData[JOINED_KEY] = 'Sprint Group';
        const name = getJoinedGroupName();
        expect(name).toBe('Sprint Group');
        expect(sessionStorageData[JOINED_KEY]).toBeUndefined();
    });

    it('returns null when nothing is saved', () => {
        expect(getJoinedGroupName()).toBeNull();
    });

    it('clears on second call', () => {
        sessionStorageData[JOINED_KEY] = 'Test Group';
        getJoinedGroupName(); // first call — clears
        expect(getJoinedGroupName()).toBeNull(); // second call
    });
});
