'use client';

import styles from './template.module.css';

/**
 * Next.js template — re-mounts on every navigation within (protected) zone,
 * triggering a CSS fade-in/slide-up page transition.
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/template
 */
export default function ProtectedTemplate({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className={styles.wrapper}>{children}</div>;
}
