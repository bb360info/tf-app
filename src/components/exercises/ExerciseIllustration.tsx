import { Image as ImageIcon } from 'lucide-react';
import styles from './ExerciseIllustration.module.css';

interface Props {
    title?: string;
    size?: 'small' | 'large';
}

export function ExerciseIllustration({ title, size = 'large' }: Props) {
    return (
        <div className={`${styles.placeholder} ${styles[size]}`} aria-label={title || 'No illustration'}>
            <ImageIcon className={styles.icon} size={size === 'large' ? 48 : 24} />
            {size === 'large' && <span className={styles.text}>Media coming soon</span>}
        </div>
    );
}
