/**
 * nameHelpers.test.ts
 * Unit tests for getDisplayName() and getInitials() fallback chain logic.
 */

import { describe, it, expect } from 'vitest';
import { getDisplayName, getInitials } from '../nameHelpers';

describe('getDisplayName', () => {
    it('returns empty string for null/undefined', () => {
        expect(getDisplayName(null)).toBe('');
        expect(getDisplayName(undefined)).toBe('');
    });

    it('returns "First Last" when both names present', () => {
        expect(getDisplayName({ first_name: 'Ivan', last_name: 'Ivanov' })).toBe('Ivan Ivanov');
    });

    it('returns only first_name when last_name is missing', () => {
        expect(getDisplayName({ first_name: 'Ivan' })).toBe('Ivan');
    });

    it('returns only last_name when first_name is missing', () => {
        expect(getDisplayName({ last_name: 'Ivanov' })).toBe('Ivanov');
    });

    it('falls back to .name when first/last missing', () => {
        expect(getDisplayName({ name: 'Legacy Name' })).toBe('Legacy Name');
    });

    it('falls back to email prefix when only email present', () => {
        expect(getDisplayName({ email: 'athlete@example.com' })).toBe('athlete');
    });

    it('prefers first_name over .name', () => {
        expect(getDisplayName({ first_name: 'Ivan', name: 'Legacy' })).toBe('Ivan');
    });

    it('prefers .name over email', () => {
        expect(getDisplayName({ name: 'Legacy Name', email: 'test@test.com' })).toBe('Legacy Name');
    });

    it('concatenates first_name and last_name with space (preserves internal whitespace)', () => {
        // getDisplayName does not trim individual fields; that is the caller's responsibility
        const result = getDisplayName({ first_name: 'Ivan', last_name: 'Ivanov' });
        expect(result).toBe('Ivan Ivanov');
    });

    it('returns empty string for empty object', () => {
        expect(getDisplayName({})).toBe('');
    });
});

describe('getInitials', () => {
    it('returns "?" for null/undefined', () => {
        expect(getInitials(null)).toBe('?');
        expect(getInitials(undefined)).toBe('?');
    });

    it('returns "IL" from first_name + last_name', () => {
        expect(getInitials({ first_name: 'Ivan', last_name: 'Laskov' })).toBe('IL');
    });

    it('returns first char of first_name when no last_name', () => {
        expect(getInitials({ first_name: 'Ivan' })).toBe('I');
    });

    it('returns initials from .name field (two words)', () => {
        expect(getInitials({ name: 'Ivan Laskov' })).toBe('IL');
    });

    it('returns single char from .name (one word)', () => {
        expect(getInitials({ name: 'Ivan' })).toBe('I');
    });

    it('returns initials from email prefix when no name', () => {
        expect(getInitials({ email: 'ivan.laskov@test.com' })).toBe('I');
    });

    it('always returns uppercase', () => {
        expect(getInitials({ first_name: 'anna', last_name: 'petrova' })).toBe('AP');
    });

    it('returns "?" for empty object', () => {
        expect(getInitials({})).toBe('?');
    });

    it('handles first_name + last_name both single char', () => {
        expect(getInitials({ first_name: 'a', last_name: 'b' })).toBe('AB');
    });
});
