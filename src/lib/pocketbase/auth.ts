import pb from './client';
import type { UsersRecord } from './types';
import type { RecordAuthResponse } from 'pocketbase';

/**
 * Auth utility functions for PocketBase.
 * Supports email + Google OAuth2 authentication.
 */

/** Login with email and password */
export async function loginWithEmail(email: string, password: string) {
    return pb.collection('users').authWithPassword(email, password);
}

/** Register a new user with email and password */
export async function registerWithEmail(params: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: 'coach' | 'athlete';
    allowAthleteViaInvite?: boolean;
}) {
    const { email, password, first_name, last_name, role = 'coach', allowAthleteViaInvite = false } = params;

    // Product rule: athlete role is allowed only when user comes via invite flow.
    if (role === 'athlete' && !allowAthleteViaInvite) {
        throw new Error('auth.athleteInviteOnly');
    }

    const name = `${first_name} ${last_name}`.trim();

    const user = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
        first_name,
        last_name,
        role,
        language: 'en',
        units: 'metric',
        emailVisibility: false,
    });

    // Auto-login after registration
    await pb.collection('users').authWithPassword(email, password);

    // Request email verification
    await pb.collection('users').requestVerification(email);

    return user;
}

/** Login with Google OAuth2 */
export async function loginWithGoogle(): Promise<RecordAuthResponse<UsersRecord>> {
    return pb.collection('users').authWithOAuth2({ provider: 'google' });
}

/** Logout — clear auth store */
export function logout() {
    pb.authStore.clear();
}

/** Update role of the currently authenticated user */
export async function updateUserRole(role: 'coach' | 'athlete') {
    const userId = pb.authStore.record?.id;
    if (!userId) throw new Error('Not authenticated');
    return pb.collection('users').update(userId, { role });
}

/** Request password reset email */
export async function requestPasswordReset(email: string) {
    return pb.collection('users').requestPasswordReset(email);
}

/** Request email verification */
export async function requestEmailVerification(email: string) {
    return pb.collection('users').requestVerification(email);
}

/** Check if user is authenticated */
export function isAuthenticated(): boolean {
    return pb.authStore.isValid;
}

/** Get current authenticated user (typed) */
export function getCurrentUser(): UsersRecord | null {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        return null;
    }
    return pb.authStore.record as unknown as UsersRecord;
}

/** Get auth token */
export function getAuthToken(): string {
    return pb.authStore.token;
}

/** Subscribe to auth state changes */
export function onAuthChange(
    callback: (token: string, record: UsersRecord | null) => void
) {
    return pb.authStore.onChange((token, record) => {
        callback(token, record as unknown as UsersRecord | null);
    });
}

/** Change password */
export async function changePassword(id: string, old: string, newPass: string, confirm: string) {
    return pb.collection('users').update(id, {
        oldPassword: old,
        password: newPass,
        passwordConfirm: confirm,
    });
}

/** Update user first/last name (computes legacy `name` field automatically) */
export async function updateUserName(
    id: string,
    params: { first_name: string; last_name: string }
) {
    const name = `${params.first_name} ${params.last_name}`.trim();
    return pb.collection('users').update(id, {
        first_name: params.first_name,
        last_name: params.last_name,
        name,
    });
}
