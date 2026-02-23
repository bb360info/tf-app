'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Copy, RefreshCw, Users, Clock, Check, Trash2, ChevronDown, ChevronUp, UserMinus } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
    listMyGroups,
    createGroup,
    generateInviteCode,
    getActiveInviteCode,
    joinByInviteCode,
    listGroupMembers,
    removeGroupMember,
    deleteGroup,
    type GroupWithRelations,
    type GroupMember,
} from '@/lib/pocketbase/services/groups';
import { logError } from '@/lib/utils/errors';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import styles from './groups.module.css';

interface GroupInfo extends GroupWithRelations {
    activeCode?: { code: string; expires: string } | null;
    members?: GroupMember[];
    membersLoaded?: boolean;
    expanded?: boolean;
}

export default function GroupsPage() {
    const t = useTranslations('groups');
    const { isCoach, isAthlete } = useAuth();
    const [groups, setGroups] = useState<GroupInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

    // Join form (athletes)
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinResult, setJoinResult] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    // Copy animation
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const loadGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const raw = await listMyGroups();
            const enriched = await Promise.all(
                raw.map(async (g) => {
                    try {
                        const activeCode = await getActiveInviteCode(g.id);
                        return { ...g, activeCode } as GroupInfo;
                    } catch {
                        /* non-critical: invite code enrichment */
                        return { ...g, activeCode: null } as GroupInfo;
                    }
                })
            );
            setGroups(enriched);
        } catch (err) {
            logError(err, { component: 'GroupsPage', action: 'loadGroups' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    async function handleCreate() {
        if (!newName.trim() || creating) return;
        setCreating(true);
        setCreateError(null);
        try {
            await createGroup(newName.trim());
            setNewName('');
            setShowCreate(false);
            loadGroups();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : t('createError'));
        } finally {
            setCreating(false);
        }
    }

    async function handleGenerate(groupId: string) {
        try {
            await generateInviteCode(groupId);
            loadGroups();
        } catch (err) {
            logError(err, { component: 'GroupsPage', action: 'handleGenerate' });
        }
    }

    async function handleCopy(code: string, groupId: string) {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(groupId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            /* non-critical: clipboard API may not be available */
        }
    }

    async function handleJoin() {
        if (!joinCode.trim() || joining) return;
        setJoining(true);
        setJoinError(null);
        setJoinResult(null);
        try {
            const group = await joinByInviteCode(joinCode.trim());
            setJoinResult(group.name);
            setJoinCode('');
        } catch (err) {
            logError(err, { component: 'GroupsPage', action: 'handleJoin' });
            setJoinError(t('invalidCode'));
        } finally {
            setJoining(false);
        }
    }

    async function handleToggleMembers(groupId: string) {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                const nowExpanded = !g.expanded;
                if (nowExpanded && !g.membersLoaded) {
                    // Load members async
                    listGroupMembers(groupId).then((members) => {
                        setGroups((prev2) =>
                            prev2.map((g2) =>
                                g2.id === groupId ? { ...g2, members, membersLoaded: true } : g2
                            )
                        );
                    }).catch(() => { });
                }
                return { ...g, expanded: nowExpanded };
            })
        );
    }

    async function handleRemoveMember(groupId: string, memberId: string) {
        try {
            await removeGroupMember(memberId);
            setGroups((prev) =>
                prev.map((g) =>
                    g.id === groupId
                        ? { ...g, members: (g.members ?? []).filter((m) => m.id !== memberId) }
                        : g
                )
            );
        } catch (err) {
            logError(err, { component: 'GroupsPage', action: 'handleRemoveMember' });
        }
    }

    async function handleDeleteGroup(groupId: string) {
        setDeletingId(groupId);
        try {
            await deleteGroup(groupId);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
        } catch (err) {
            logError(err, { component: 'GroupsPage', action: 'handleDeleteGroup' });
        } finally {
            setDeletingId(null);
        }
    }

    function formatExpiry(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        const hours = Math.max(0, Math.round((d.getTime() - now.getTime()) / 3_600_000));
        if (hours < 24) return `${hours}h`;
        return `${Math.round(hours / 24)}d`;
    }

    return (
        <main className={styles.page}>
            <PageWrapper maxWidth="narrow">
                {/* Header */}
                <PageHeader
                    title={t('title')}
                    backHref="/settings"
                />

                {/* ── Coach: Group management ── */}
                {isCoach && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>{t('myGroups')}</h2>
                            <button
                                type="button"
                                className={styles.addBtn}
                                onClick={() => setShowCreate(true)}
                            >
                                <Plus size={16} />
                                {t('create')}
                            </button>
                        </div>

                        {/* Create form */}
                        {showCreate && (
                            <div className={styles.createForm}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder={t('groupNamePlaceholder')}
                                    value={newName}
                                    onChange={(e) => { setNewName(e.target.value); setCreateError(null); }}
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                                />
                                {createError && (
                                    <p className={styles.errorMsg}>{createError}</p>
                                )}
                                <div className={styles.formActions}>
                                    <button
                                        type="button"
                                        className={styles.cancelBtn}
                                        onClick={() => { setShowCreate(false); setNewName(''); setCreateError(null); }}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.saveBtn}
                                        onClick={handleCreate}
                                        disabled={!newName.trim() || creating}
                                    >
                                        {t('save')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Group list */}
                        {isLoading ? (
                            <div className={styles.loading}>
                                <div className={styles.spinner} />
                            </div>
                        ) : groups.length === 0 ? (
                            <div className={styles.empty}>
                                <Users size={40} />
                                <p>{t('noGroups')}</p>
                            </div>
                        ) : (
                            <div className={styles.groupList}>
                                {groups.map((g) => (
                                    <div key={g.id} className={styles.groupCard}>
                                        <div className={styles.groupInfo}>
                                            <span className={styles.groupName}>{g.name}</span>
                                            <div className={styles.groupActions}>
                                                {/* Toggle members */}
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleToggleMembers(g.id)}
                                                    aria-label={t('manageGroups')}
                                                >
                                                    <Users size={14} />
                                                    {g.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                                {/* Delete group */}
                                                <button
                                                    type="button"
                                                    className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                                    onClick={() => setConfirmDeleteGroupId(g.id)}
                                                    disabled={deletingId === g.id}
                                                    aria-label="Delete group"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Members panel */}
                                        {g.expanded && (
                                            <div className={styles.membersPanel}>
                                                {!g.membersLoaded ? (
                                                    <div className={styles.membersLoading}>
                                                        <div className={styles.spinnerSm} />
                                                    </div>
                                                ) : (g.members ?? []).length === 0 ? (
                                                    <p className={styles.noMembers}>{t('noGroups')}</p>
                                                ) : (
                                                    <ul className={styles.membersList}>
                                                        {(g.members ?? []).map((m) => (
                                                            <li key={m.id} className={styles.memberItem}>
                                                                <span className={styles.memberName}>
                                                                    {m.expand?.athlete_id?.name ?? m.athlete_id}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className={`${styles.iconBtn} ${styles.removeBtn}`}
                                                                    onClick={() => handleRemoveMember(g.id, m.id)}
                                                                    aria-label="Remove member"
                                                                >
                                                                    <UserMinus size={14} />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}

                                        {/* Invite code */}
                                        {g.activeCode ? (
                                            <div className={styles.codeBlock}>
                                                <code className={styles.code}>{g.activeCode.code}</code>
                                                <span className={styles.expiry}>
                                                    <Clock size={12} />
                                                    {formatExpiry(g.activeCode.expires)}
                                                </span>
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleCopy(g.activeCode!.code, g.id)}
                                                    aria-label={t('copy')}
                                                >
                                                    {copiedId === g.id ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleGenerate(g.id)}
                                                    aria-label={t('regenerate')}
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className={styles.generateBtn}
                                                onClick={() => handleGenerate(g.id)}
                                            >
                                                {t('generateCode')}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ── Athlete: Join by code ── */}
                {isAthlete && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t('joinGroup')}</h2>
                        <p className={styles.description}>{t('joinDescription')}</p>

                        <div className={styles.joinForm}>
                            <input
                                type="text"
                                className={styles.codeInput}
                                placeholder="ABC123"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                            />
                            <button
                                type="button"
                                className={styles.saveBtn}
                                onClick={handleJoin}
                                disabled={joinCode.length < 6 || joining}
                            >
                                {joining ? '...' : t('join')}
                            </button>
                        </div>

                        {joinResult && (
                            <div className={styles.successMsg}>
                                <Check size={16} />
                                {t('joinSuccess', { name: joinResult })}
                            </div>
                        )}
                        {joinError && (
                            <div className={styles.errorMsg}>{joinError}</div>
                        )}
                    </section>
                )}
            </PageWrapper>

            {/* ConfirmDialog for group deletion */}
            {
                (() => {
                    const group = groups.find(g => g.id === confirmDeleteGroupId);
                    return (
                        <ConfirmDialog
                            open={!!confirmDeleteGroupId}
                            title={t('deleteGroupTitle')}
                            message={group ? t('deleteGroupConfirm', { name: group.name }) : ''}
                            confirmLabel={t('confirmDelete')}
                            cancelLabel={t('confirmCancel')}
                            variant="danger"
                            onConfirm={() => {
                                if (confirmDeleteGroupId) handleDeleteGroup(confirmDeleteGroupId);
                                setConfirmDeleteGroupId(null);
                            }}
                            onCancel={() => setConfirmDeleteGroupId(null)}
                        />
                    );
                })()
            }
        </main>
    );
}
