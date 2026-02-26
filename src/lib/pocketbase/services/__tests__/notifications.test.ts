/**
 * notifications.test.ts
 * Unit tests for sendNotification() and sendCoachNote() service functions.
 *
 * Mock strategy:
 *   - vi.mock('@/lib/pocketbase/client') with factory (no top-level var refs due to hoisting)
 *   - Access mocks via vi.mocked() after import
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock PocketBase (factory must be self-contained due to vi.mock hoisting) ─

vi.mock('@/lib/pocketbase/client', () => {
    const mockCreate = vi.fn();
    const mockGetFirstListItem = vi.fn();
    const mockGetOne = vi.fn();

    return {
        default: {
            collection: vi.fn(() => ({
                create: mockCreate,
                getFirstListItem: mockGetFirstListItem,
                getOne: mockGetOne,
            })),
            filter: vi.fn((template: string) => template),
            // Expose mocks via the module object so tests can access them
            _mocks: { mockCreate, mockGetFirstListItem, mockGetOne },
        },
    };
});

// ─── Import AFTER mock ───────────────────────────────────────────────────────

import pb from '@/lib/pocketbase/client';
import { sendNotification, sendCoachNote } from '../notifications';

// ─── Helpers to access inner mocks ───────────────────────────────────────────

type PbWithMocks = typeof pb & {
    _mocks: {
        mockCreate: ReturnType<typeof vi.fn>;
        mockGetFirstListItem: ReturnType<typeof vi.fn>;
        mockGetOne: ReturnType<typeof vi.fn>;
    };
};
const getMocks = () => (pb as PbWithMocks)._mocks;

// ─── Fixture factories ────────────────────────────────────────────────────────

const makePrefRecord = (disabledTypes: string[]) => ({
    id: 'pref1',
    user_id: 'user_abc',
    disabled_types: disabledTypes,
    push_enabled: true,
    email_enabled: false,
    quiet_hours_start: '',
    quiet_hours_end: '',
    timezone: 'UTC',
    created: '',
    updated: '',
    collectionId: '',
    collectionName: 'notification_preferences',
});

const makeNotifRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'notif1',
    user_id: 'user_abc',
    type: 'system',
    message_key: 'joinedGroup',
    message_params: {},
    message: 'joinedGroup',
    read: false,
    link: '',
    priority: 'normal',
    expires_at: '',
    created: '',
    updated: '',
    collectionId: '',
    collectionName: 'notifications',
    ...overrides,
});

// ─── sendNotification() tests ─────────────────────────────────────────────────

describe('sendNotification()', () => {
    beforeEach(() => {
        const { mockCreate, mockGetFirstListItem, mockGetOne } = getMocks();
        mockCreate.mockReset();
        mockGetFirstListItem.mockReset();
        mockGetOne.mockReset();
    });

    it('throws if userId is empty string', async () => {
        await expect(
            sendNotification({ userId: '', type: 'system', messageKey: 'test' })
        ).rejects.toThrow('sendNotification: userId is required');

        expect(getMocks().mockCreate).not.toHaveBeenCalled();
    });

    it('returns null when notification type is muted in preferences', async () => {
        getMocks().mockGetFirstListItem.mockResolvedValueOnce(
            makePrefRecord(['plan_published', 'checkin_reminder'])
        );

        const result = await sendNotification({
            userId: 'user_abc',
            type: 'plan_published',
            messageKey: 'planPublished',
            messageParams: { week: '5' },
        });

        expect(result).toBeNull();
        expect(getMocks().mockCreate).not.toHaveBeenCalled();
    });

    it('creates record with correct message_key and message_params', async () => {
        // No prefs record → throw → allow all (fail-soft)
        getMocks().mockGetFirstListItem.mockRejectedValueOnce(new Error('404 Not Found'));

        const expectedRecord = makeNotifRecord({
            message_key: 'achievementEarned',
            message_params: { title: 'sprint_30m' },
            type: 'achievement',
            user_id: 'user_abc',
        });
        getMocks().mockCreate.mockResolvedValueOnce(expectedRecord);

        const result = await sendNotification({
            userId: 'user_abc',
            type: 'achievement',
            messageKey: 'achievementEarned',
            messageParams: { title: 'sprint_30m' },
        });

        expect(getMocks().mockCreate).toHaveBeenCalledOnce();
        const arg = getMocks().mockCreate.mock.calls[0][0] as Record<string, unknown>;
        expect(arg.message_key).toBe('achievementEarned');
        expect(arg.message_params).toEqual({ title: 'sprint_30m' });
        expect(arg.user_id).toBe('user_abc');
        expect(arg.type).toBe('achievement');
        expect(arg.read).toBe(false);
        expect(result).toEqual(expectedRecord);
    });

    it('defaults priority to normal when not provided', async () => {
        getMocks().mockGetFirstListItem.mockRejectedValueOnce(new Error('No prefs'));
        getMocks().mockCreate.mockResolvedValueOnce(makeNotifRecord());

        await sendNotification({ userId: 'user_abc', type: 'system', messageKey: 'movedToGroup' });

        const arg = getMocks().mockCreate.mock.calls[0][0] as Record<string, unknown>;
        expect(arg.priority).toBe('normal');
    });

    it('sends notification when type is NOT in disabled_types', async () => {
        // Only coach_note is muted, but we send achievement
        getMocks().mockGetFirstListItem.mockResolvedValueOnce(makePrefRecord(['coach_note']));
        const notif = makeNotifRecord({ type: 'achievement' });
        getMocks().mockCreate.mockResolvedValueOnce(notif);

        const result = await sendNotification({
            userId: 'user_abc',
            type: 'achievement',
            messageKey: 'achievementEarned',
        });

        expect(getMocks().mockCreate).toHaveBeenCalledOnce();
        expect(result).toEqual(notif);
    });
});

// ─── sendCoachNote() tests ─────────────────────────────────────────────────────

describe('sendCoachNote()', () => {
    beforeEach(() => {
        const { mockCreate, mockGetFirstListItem, mockGetOne } = getMocks();
        mockCreate.mockReset();
        mockGetFirstListItem.mockReset();
        mockGetOne.mockReset();
    });

    it('returns null when athlete record has no user_id', async () => {
        getMocks().mockGetOne.mockResolvedValueOnce({ id: 'athlete1', name: 'Ivan' });

        const result = await sendCoachNote('athlete1', 'Хорошая работа!');

        expect(result).toBeNull();
        expect(getMocks().mockCreate).not.toHaveBeenCalled();
    });

    it('preserves custom coach text in messageParams.text', async () => {
        const coachText = 'Отличная тренировка сегодня!';
        getMocks().mockGetOne.mockResolvedValueOnce({ id: 'athlete1', user_id: 'user_athlete' });
        getMocks().mockGetFirstListItem.mockRejectedValueOnce(new Error('No prefs'));

        const expected = makeNotifRecord({
            type: 'coach_note',
            message_key: 'coachNoteSent',
            message_params: { text: coachText },
            user_id: 'user_athlete',
        });
        getMocks().mockCreate.mockResolvedValueOnce(expected);

        const result = await sendCoachNote('athlete1', coachText);

        expect(getMocks().mockCreate).toHaveBeenCalledOnce();
        const arg = getMocks().mockCreate.mock.calls[0][0] as Record<string, unknown>;
        expect(arg.message_key).toBe('coachNoteSent');
        expect((arg.message_params as Record<string, string>).text).toBe(coachText);
        expect(arg.type).toBe('coach_note');
        expect(result).toEqual(expected);
    });

    it('sends empty messageParams when message is empty string', async () => {
        getMocks().mockGetOne.mockResolvedValueOnce({ id: 'athlete1', user_id: 'user_athlete' });
        getMocks().mockGetFirstListItem.mockRejectedValueOnce(new Error('No prefs'));
        getMocks().mockCreate.mockResolvedValueOnce(makeNotifRecord({ type: 'coach_note', message_params: {} }));

        await sendCoachNote('athlete1', '');

        const arg = getMocks().mockCreate.mock.calls[0][0] as Record<string, unknown>;
        expect(arg.message_params).toEqual({});
    });
});
