import pb from './client';
import type { UsersRecord } from './types';

/**
 * Auth utility functions for PocketBase.
 * Supports email + Google OAuth2 authentication.
 */

/** Login with email and password */
export async function loginWithEmail(email: string, password: string) {
    return pb.collection('users').authWithPassword(email, password);
}

/** Register a new user with email and password */
export async function registerWithEmail(
    email: string,
    password: string,
    name: string,
    role: 'coach' | 'athlete' = 'athlete'
) {
    const user = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
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
export async function loginWithGoogle() {
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

/** Update user name */
export async function updateUserName(id: string, name: string) {
    return pb.collection('users').update(id, { name });
}
