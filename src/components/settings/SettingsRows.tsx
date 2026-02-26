import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import styles from './SettingsRows.module.css';

interface BaseRowProps {
    icon: LucideIcon;
    name: string;
    description?: string;
}

interface SettingsNavRowProps extends BaseRowProps {
    href: string;
    value?: string;
}

interface SettingsToggleRowProps extends BaseRowProps {
    checked: boolean;
    inputId: string;
    onChange: (checked: boolean) => void;
}

interface SettingsSelectRowProps extends BaseRowProps {
    id: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}

interface SettingsSegmentedRowProps extends BaseRowProps {
    control: ReactNode;
}

function RowLabel({ icon: Icon, name, description }: BaseRowProps) {
    return (
        <div className={styles.rowLabel}>
            <div className={styles.rowIconWrap}>
                <Icon size={18} aria-hidden="true" />
            </div>
            <div className={styles.rowInfo}>
                <span className={styles.rowName}>{name}</span>
                {description && <span className={styles.rowDesc}>{description}</span>}
            </div>
        </div>
    );
}

export function SettingsNavRow({ icon, name, description, href, value }: SettingsNavRowProps) {
    return (
        <Link href={href} className={styles.rowLink}>
            <RowLabel icon={icon} name={name} description={description} />
            <div className={styles.rowNavRight}>
                {value && <span className={styles.rowValue}>{value}</span>}
                <ChevronRight size={16} className={styles.chevronIcon} aria-hidden="true" />
            </div>
        </Link>
    );
}

export function SettingsToggleRow({ icon, name, description, checked, inputId, onChange }: SettingsToggleRowProps) {
    return (
        <div className={styles.row}>
            <RowLabel icon={icon} name={name} description={description} />
            <label className={styles.toggle} htmlFor={inputId}>
                <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.target.checked)}
                />
                <span className={styles.toggleTrack} />
            </label>
        </div>
    );
}

export function SettingsSelectRow({ icon, name, description, id, value, options, onChange }: SettingsSelectRowProps) {
    return (
        <div className={styles.row}>
            <RowLabel icon={icon} name={name} description={description} />
            <div className={styles.selectWrap}>
                <select
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={styles.select}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className={styles.selectIcon} aria-hidden="true" />
            </div>
        </div>
    );
}

export function SettingsSegmentedRow({ icon, name, description, control }: SettingsSegmentedRowProps) {
    return (
        <div className={styles.row}>
            <RowLabel icon={icon} name={name} description={description} />
            <div className={styles.controlWrap}>{control}</div>
        </div>
    );
}
