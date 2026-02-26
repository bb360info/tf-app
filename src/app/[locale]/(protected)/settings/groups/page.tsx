'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Plus, Copy, RefreshCw, Users, Clock, Check, Trash2, ChevronDown, ChevronUp, UserMinus, Share2, QrCode, X } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
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
    moveAthleteToGroup,
    hasActiveGroupPlan,
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
    const locale = useLocale();
    const router = useRouter();
    const { isCoach, isAthlete } = useAuth();
    const { showToast } = useToast();
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
    const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);

    // Move/Add athlete state
    interface MoveTarget { member: GroupMember; fromGroup: GroupInfo }
    const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
    const [moveToGroupId, setMoveToGroupId] = useState<string>('');
    const [keepInOriginal, setKeepInOriginal] = useState(false);
    const [moveWarning, setMoveWarning] = useState<string>('');
    const [confirmMoveOpen, setConfirmMoveOpen] = useState(false);
    const [moving, setMoving] = useState(false);
    const [manageDialogOpen, setManageDialogOpen] = useState(false);
    const [manageTarget, setManageTarget] = useState<MoveTarget | null>(null);
    const [manageToGroupId, setManageToGroupId] = useState('');
    const [manageMode, setManageMode] = useState<'add' | 'move'>('add');

    // QR Code state
    interface QrTarget { name: string; code: string; url: string }
    const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const qrRef = useRef<HTMLImageElement>(null);

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

    // ── Phase 3: Share Link ─────────────────────────────────────────────────
    async function handleShareLink(code: string, groupName: string, expires: string, groupId: string) {
        const expiresIn = new Date(expires).getTime() - Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Warn if expiring within 24h and offer to regenerate
        if (expiresIn < oneDayMs) {
            const confirmed = window.confirm(t('linkExpiringSoon'));
            if (confirmed) {
                await handleGenerate(groupId);
                return; // New code generated — user can share again
            }
        }

        const url = `${window.location.origin}/${locale}/join?code=${code}`;

        // Use Web Share API only on touch/mobile devices.
        // On desktop (pointer: fine), macOS/Windows show a native share sheet
        // which is confusing UX — always fall back to clipboard instead.
        const isMobile =
            typeof window !== 'undefined' &&
            window.matchMedia('(pointer: coarse)').matches;

        if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: t('inviteTitle'),
                    text: `${t('inviteText', { group: groupName })}\n${t('linkExpiry')}`,
                    url,
                });
            } catch {
                /* user cancelled Web Share — OK */
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                setLinkCopiedId(groupId);
                setTimeout(() => setLinkCopiedId(null), 2000);
                showToast({ message: t('linkCopied'), type: 'success' });
            } catch {
                /* clipboard not available */
            }
        }
    }

    // ── Phase 4: Move Athletes ──────────────────────────────────────────────
    async function handleMoveAttempt(member: GroupMember, fromGroup: GroupInfo, toGroupId: string, keepOriginal: boolean) {
        if (!toGroupId) return;
        setMoveTarget({ member, fromGroup });
        setMoveToGroupId(toGroupId);
        setKeepInOriginal(keepOriginal);

        // Check active plans in both groups to generate appropriate warning
        const toGroup = groups.find(g => g.id === toGroupId);
        const [fromHasPlan, toHasPlan] = await Promise.all([
            keepOriginal ? Promise.resolve(false) : hasActiveGroupPlan(fromGroup.id),
            hasActiveGroupPlan(toGroupId),
        ]);

        let warning = '';
        if (fromHasPlan && toHasPlan) {
            warning = t('moveWarningBoth', { from: fromGroup.name, to: toGroup?.name ?? toGroupId });
        } else if (fromHasPlan) {
            warning = t('moveWarning', { from: fromGroup.name });
        } else if (toHasPlan) {
            warning = t('moveWarningGain', { to: toGroup?.name ?? toGroupId });
        }
        setMoveWarning(warning);
        setConfirmMoveOpen(true);
    }

    function handleOpenManageDialog(member: GroupMember, fromGroup: GroupInfo) {
        const availableGroups = groups.filter(og => og.id !== fromGroup.id);
        if (availableGroups.length === 0) return;
        setManageTarget({ member, fromGroup });
        setManageToGroupId(availableGroups[0].id);
        setManageMode('add');
        setManageDialogOpen(true);
    }

    async function handleManageSubmit() {
        if (!manageTarget || !manageToGroupId) return;
        setManageDialogOpen(false);
        await handleMoveAttempt(
            manageTarget.member,
            manageTarget.fromGroup,
            manageToGroupId,
            manageMode === 'add'
        );
    }

    async function handleMoveConfirm() {
        if (!moveTarget || !moveToGroupId) return;
        setMoving(true);
        setConfirmMoveOpen(false);
        try {
            await moveAthleteToGroup(moveTarget.member.athlete_id, moveTarget.fromGroup.id, moveToGroupId, keepInOriginal);
            // Refresh members list for both affected groups
            setGroups(prev => prev.map(g => {
                if (g.id === moveTarget.fromGroup.id && !keepInOriginal) {
                    return { ...g, members: (g.members ?? []).filter(m => m.id !== moveTarget.member.id), membersLoaded: true };
                }
                if (g.id === moveToGroupId) {
                    return { ...g, membersLoaded: false }; // reload next expand
                }
                return g;
            }));
        } catch (err) {
            logError(err, { component: 'GroupsPage', action: 'handleMoveConfirm' });
        } finally {
            setMoving(false);
            setMoveTarget(null);
        }
    }

    // ── Phase 5: QR Code ────────────────────────────────────────────────────
    async function handleShowQR(group: GroupInfo) {
        if (!group.activeCode) return;
        const url = `${window.location.origin}/${locale}/join?code=${group.activeCode.code}`;
        setQrTarget({ name: group.name, code: group.activeCode.code, url });
        setQrDataUrl(null);

        const QRCode = await import('qrcode');
        const isDark = typeof document !== 'undefined' &&
            document.documentElement.getAttribute('data-theme') === 'dark';
        const dataUrl = await QRCode.toDataURL(url, {
            width: 256,
            color: {
                dark: isDark ? '#ffffff' : '#111111',
                light: isDark ? '#1a1a1a' : '#ffffff',
            },
        });
        setQrDataUrl(dataUrl);
    }

    function handleDownloadQR() {
        if (!qrDataUrl || !qrTarget) return;
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `jumpedia-${qrTarget.name.replace(/\s+/g, '-').toLowerCase()}-invite.png`;
        a.click();
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
                                                                <div className={styles.memberActions}>
                                                                    {groups.filter(og => og.id !== g.id).length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            className={styles.manageBtn}
                                                                            disabled={moving}
                                                                            onClick={() => handleOpenManageDialog(m, g)}
                                                                        >
                                                                            {t('manageMember')}
                                                                        </button>
                                                                    )}
                                                                    {/* Remove member */}
                                                                    <button
                                                                        type="button"
                                                                        className={`${styles.iconBtn} ${styles.removeBtn}`}
                                                                        onClick={() => handleRemoveMember(g.id, m.id)}
                                                                        aria-label="Remove member"
                                                                    >
                                                                        <UserMinus size={14} />
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}

                                        {/* Invite code block */}
                                        {g.activeCode ? (
                                            <div className={styles.codeBlock}>
                                                <code className={styles.code}>{g.activeCode.code}</code>
                                                <span className={styles.expiry}>
                                                    <Clock size={12} />
                                                    {formatExpiry(g.activeCode.expires)}
                                                </span>
                                                {/* Copy code */}
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleCopy(g.activeCode!.code, g.id)}
                                                    aria-label={t('copy')}
                                                >
                                                    {copiedId === g.id ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                                {/* Regenerate */}
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleGenerate(g.id)}
                                                    aria-label={t('regenerate')}
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                                {/* Phase 3: Share invite link */}
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleShareLink(g.activeCode!.code, g.name, g.activeCode!.expires, g.id)}
                                                    aria-label={t('shareLink')}
                                                    title={linkCopiedId === g.id ? t('linkCopied') : t('shareLink')}
                                                >
                                                    {linkCopiedId === g.id ? <Check size={14} /> : <Share2 size={14} />}
                                                </button>
                                                {/* Phase 5: QR Code */}
                                                <button
                                                    type="button"
                                                    className={styles.iconBtn}
                                                    onClick={() => handleShowQR(g)}
                                                    aria-label={t('showQR')}
                                                    title={t('showQR')}
                                                >
                                                    <QrCode size={14} />
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
                                        <button
                                            type="button"
                                            className={styles.planBtn}
                                            onClick={() => router.push(`/${locale}/training?openWizard=1&groupId=${g.id}`)}
                                        >
                                            {t('createPlanForGroup')}
                                        </button>
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

            {/* Phase 4: ConfirmDialog for moving athletes */}
            <ConfirmDialog
                open={confirmMoveOpen}
                title={keepInOriginal ? t('addTo') : t('moveTo')}
                message={moveWarning || (keepInOriginal ? t('addTo') : t('moveTo'))}
                confirmLabel={keepInOriginal ? t('addConfirm') : t('moveConfirm')}
                cancelLabel={t('confirmCancel')}
                variant="default"
                onConfirm={handleMoveConfirm}
                onCancel={() => { setConfirmMoveOpen(false); setMoveTarget(null); }}
            />

            {manageDialogOpen && manageTarget && (
                <div
                    className={styles.manageOverlay}
                    onClick={() => setManageDialogOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('manageMemberTitle')}
                >
                    <div className={styles.manageModal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.manageTitle}>{t('manageMemberTitle')}</h3>
                        <p className={styles.manageSubtitle}>
                            {manageTarget.member.expand?.athlete_id?.name ?? manageTarget.member.athlete_id}
                        </p>

                        <label className={styles.manageLabel} htmlFor="manage-target-group">
                            {t('targetGroup')}
                        </label>
                        <select
                            id="manage-target-group"
                            className={styles.manageSelect}
                            value={manageToGroupId}
                            onChange={(e) => setManageToGroupId(e.target.value)}
                        >
                            {groups.filter(group => group.id !== manageTarget.fromGroup.id).map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>

                        <label className={styles.manageLabel}>{t('actionType')}</label>
                        <div className={styles.manageModeRow}>
                            <button
                                type="button"
                                className={`${styles.manageModeBtn} ${manageMode === 'add' ? styles.manageModeBtnActive : ''}`}
                                onClick={() => setManageMode('add')}
                            >
                                {t('actionAdd')}
                            </button>
                            <button
                                type="button"
                                className={`${styles.manageModeBtn} ${manageMode === 'move' ? styles.manageModeBtnActive : ''}`}
                                onClick={() => setManageMode('move')}
                            >
                                {t('actionMove')}
                            </button>
                        </div>

                        <div className={styles.manageActions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setManageDialogOpen(false)}>
                                {t('confirmCancel')}
                            </button>
                            <button type="button" className={styles.saveBtn} onClick={() => void handleManageSubmit()}>
                                {t('manageSubmit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Phase 5: QR Code Modal */}
            {qrTarget && (
                <div
                    className={styles.qrOverlay}
                    onClick={() => { setQrTarget(null); setQrDataUrl(null); }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('showQR')}
                >
                    <div
                        className={styles.qrModal}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className={styles.qrClose}
                            onClick={() => { setQrTarget(null); setQrDataUrl(null); }}
                            aria-label="close"
                        >
                            <X size={18} />
                        </button>
                        <h3 className={styles.qrGroupName}>{qrTarget.name}</h3>
                        {qrDataUrl ? (
                            <img
                                ref={qrRef}
                                src={qrDataUrl}
                                alt="QR Code"
                                width={256}
                                height={256}
                                className={styles.qrImage}
                            />
                        ) : (
                            <div className={styles.qrSkeleton} />
                        )}
                        <code className={styles.qrCode}>{qrTarget.code}</code>
                        <button
                            type="button"
                            className={styles.qrDownloadBtn}
                            onClick={handleDownloadQR}
                            disabled={!qrDataUrl}
                        >
                            {t('downloadQR')}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
