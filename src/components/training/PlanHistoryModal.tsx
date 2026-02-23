'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Clock } from 'lucide-react';
import { listSnapshots, type PlanSnapshot } from '@/lib/pocketbase/services/snapshots';
import styles from './PlanHistoryModal.module.css';

interface Props {
    planId: string;
    onClose: () => void;
    // onRestore: (snapshot: PlanSnapshot) => void; // Future feature
}

export default function PlanHistoryModal({ planId, onClose }: Props) {
    const t = useTranslations();
    const [snapshots, setSnapshots] = useState<PlanSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listSnapshots(planId)
            .then(setSnapshots)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [planId]);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>{t('training.history')}</h3>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>{t('loading')}</div>
                    ) : snapshots.length === 0 ? (
                        <div className={styles.empty}>{t('training.noSnapshots')}</div>
                    ) : (
                        <ul className={styles.list}>
                            {snapshots.map((snap) => (
                                <li key={snap.id} className={styles.item}>
                                    <div className={styles.info}>
                                        <div className={styles.versionBadge}>v{snap.version}</div>
                                        <div className={styles.timestamp}>
                                            <Clock size={14} />
                                            {new Date(snap.created).toLocaleString()}
                                        </div>
                                    </div>
                                    {/* 
                                        TODO: Show diff or summary? 
                                        For now just listing versions.
                                        Restore button is a future feature.
                                    */}
                                    {/* <button className={styles.restoreBtn} disabled>
                                        <RotateCcw size={14} />
                                        {t('training.restore')}
                                    </button> */}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
