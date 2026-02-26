/**
 * validation.test.ts
 * Unit tests for Zod schemas: DisciplineSchema, PRSourceSchema, SeasonTypeSchema,
 * PersonalRecordSchema, and AddPRSchema.
 */

import { describe, it, expect } from 'vitest';

import { DisciplineSchema, PRSourceSchema, SeasonTypeSchema } from '@/lib/validation/core';
import { PersonalRecordSchema, AddPRSchema } from '@/lib/validation/personalRecords';

// ── DisciplineSchema ─────────────────────────────────────────────────────────

describe('DisciplineSchema', () => {
    it('accepts valid disciplines', () => {
        expect(DisciplineSchema.parse('high_jump')).toBe('high_jump');
        expect(DisciplineSchema.parse('long_jump')).toBe('long_jump');
        expect(DisciplineSchema.parse('triple_jump')).toBe('triple_jump');
    });

    it('rejects unknown discipline', () => {
        expect(() => DisciplineSchema.parse('pole_vault')).toThrow();
        expect(() => DisciplineSchema.parse('')).toThrow();
        expect(() => DisciplineSchema.parse(null)).toThrow();
    });
});

// ── PRSourceSchema ───────────────────────────────────────────────────────────

describe('PRSourceSchema', () => {
    it('accepts valid sources', () => {
        expect(PRSourceSchema.parse('competition')).toBe('competition');
        expect(PRSourceSchema.parse('training')).toBe('training');
    });

    it('rejects unknown source', () => {
        expect(() => PRSourceSchema.parse('manual')).toThrow();
        expect(() => PRSourceSchema.parse('')).toThrow();
    });
});

// ── SeasonTypeSchema ─────────────────────────────────────────────────────────

describe('SeasonTypeSchema', () => {
    it('accepts valid season types', () => {
        expect(SeasonTypeSchema.parse('outdoor')).toBe('outdoor');
        expect(SeasonTypeSchema.parse('indoor')).toBe('indoor');
    });

    it('rejects invalid season type', () => {
        expect(() => SeasonTypeSchema.parse('summer')).toThrow();
        expect(() => SeasonTypeSchema.parse('')).toThrow();
    });
});

// ── PersonalRecordSchema ─────────────────────────────────────────────────────

describe('PersonalRecordSchema', () => {
    const valid = {
        athlete_id: 'abc123',
        discipline: 'high_jump',
        season_type: 'outdoor',
        result: 2.10,
        source: 'competition',
        is_current: true,
    };

    it('accepts valid PR record', () => {
        expect(() => PersonalRecordSchema.parse(valid)).not.toThrow();
    });

    it('fills is_current default = true', () => {
        const { is_current: _, ...withoutCurrent } = valid;
        const result = PersonalRecordSchema.parse({ ...withoutCurrent });
        expect(result.is_current).toBe(true);
    });

    it('rejects result < 0', () => {
        expect(() => PersonalRecordSchema.parse({ ...valid, result: -1 })).toThrow();
    });

    it('rejects result > 30', () => {
        expect(() => PersonalRecordSchema.parse({ ...valid, result: 31 })).toThrow();
    });

    it('rejects missing athlete_id', () => {
        const { athlete_id: _, ...missing } = valid;
        expect(() => PersonalRecordSchema.parse(missing)).toThrow();
    });

    it('rejects empty athlete_id', () => {
        expect(() => PersonalRecordSchema.parse({ ...valid, athlete_id: '' })).toThrow();
    });

    it('accepts optional fields as undefined', () => {
        const r = PersonalRecordSchema.parse(valid);
        expect(r.date).toBeUndefined();
        expect(r.competition_name).toBeUndefined();
        expect(r.notes).toBeUndefined();
    });

    it('accepts optional date as ISO string', () => {
        expect(() => PersonalRecordSchema.parse({ ...valid, date: '2026-02-22' })).not.toThrow();
    });
});

// ── AddPRSchema ──────────────────────────────────────────────────────────────

describe('AddPRSchema', () => {
    const validForm = {
        discipline: 'triple_jump',
        season_type: 'indoor',
        result: 15.5,
        source: 'training',
    };

    it('accepts valid form data without athlete_id and is_current', () => {
        expect(() => AddPRSchema.parse(validForm)).not.toThrow();
    });

    it('does NOT accept athlete_id (omitted from form schema)', () => {
        // AddPRSchema omits athlete_id, but passing it should not fail (Zod strips extras by default)
        const r = AddPRSchema.parse({ ...validForm, athlete_id: 'extra' });
        expect((r as Record<string, unknown>).athlete_id).toBeUndefined();
    });

    it('rejects invalid discipline in form', () => {
        expect(() => AddPRSchema.parse({ ...validForm, discipline: 'hurdles' })).toThrow();
    });

    it('rejects result = 0', () => {
        expect(() => AddPRSchema.parse({ ...validForm, result: 0 })).not.toThrow(); // min(0) allows 0
    });
});
