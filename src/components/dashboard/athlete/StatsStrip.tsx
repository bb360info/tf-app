import styles from './StatsStrip.module.css';

interface Stat {
    label: string;
    value: string | number;
}

export function StatsStrip({ stats }: { stats: Stat[] }) {
    if (!stats || stats.length === 0) return null;
    return (
        <div className={styles.strip}>
            {stats.map((s, i) => (
                <div key={i} className={styles.item}>
                    <div className={styles.itemValue}>{s.value}</div>
                    <div className={styles.itemLabel}>{s.label}</div>
                </div>
            ))}
        </div>
    );
}
