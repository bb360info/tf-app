import styles from './WeekSummaryBar.module.css';

export function WeekSummaryBar({ checkinRatio = 0 }: { checkinRatio?: number }) {
    const pct = Math.round(checkinRatio * 100);
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.title}>Team Check-ins</span>
                <span className={styles.pct}>{pct}%</span>
            </div>
            <div className={styles.bar}>
                <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
