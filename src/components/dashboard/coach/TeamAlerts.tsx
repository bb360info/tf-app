import { AlertCircle } from 'lucide-react';
import { getTeamReadinessAlerts } from '@/lib/pocketbase/services/readiness';
import type { AthleteWithStats } from '@/lib/pocketbase/services/athletes';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import styles from './TeamAlerts.module.css';

export function TeamAlerts({ athletes }: { athletes: AthleteWithStats[] }) {
    const t = useTranslations('dashboard');
    const alerts = getTeamReadinessAlerts(athletes);
    if (alerts.length === 0) return null;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <AlertCircle size={16} className={styles.icon} />
                <span className={styles.title}>{t('attentionNeeded')}</span>
            </div>
            <div className={styles.list}>
                {alerts.map(a => (
                    <Link key={a.id} href={`/dashboard/athlete?id=${a.id}`} className={styles.item}>
                        <span className={styles.name}>{a.name}</span>
                        <span className={styles.score}>{a.latestReadiness}%</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
