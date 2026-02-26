'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { getDisplayName } from '@/lib/utils/nameHelpers';

const DEFAULT_TITLE = 'Jumpedia';

export function DynamicDocumentTitle() {
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated || !user) {
            document.title = DEFAULT_TITLE;
            return;
        }

        const roleLabel = user.role === 'athlete' ? 'Athlete' : 'Coach';
        const name = getDisplayName(user) || 'Name';
        document.title = `${roleLabel} ${name}`;
    }, [isAuthenticated, user]);

    return null;
}
