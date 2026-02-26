import { useState, useCallback, useEffect } from 'react';

const MAX_PULL_DISTANCE = 120;
const REFRESH_THRESHOLD = 80;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
    const [pullState, setPullState] = useState<'idle' | 'pulling' | 'refreshing'>('idle');
    const [pullDistance, setPullDistance] = useState(0);
    const [startY, setStartY] = useState(0);

    const onTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
        if (window.scrollY === 0) {
            setStartY(e.touches[0].clientY);
        }
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
        if (startY > 0 && window.scrollY === 0 && pullState !== 'refreshing') {
            const currentY = e.touches[0].clientY;
            let distance = currentY - startY;

            if (distance > 0) {
                // Determine pulling resistance (logarithmic-like curve)
                distance = Math.min(MAX_PULL_DISTANCE, distance * 0.5);
                setPullDistance(distance);
                setPullState('pulling');
                // Prevent default scroll if pulling down
                if (e.cancelable) e.preventDefault();
            }
        }
    }, [startY, pullState]);

    const onTouchEnd = useCallback(async () => {
        if (pullState === 'pulling') {
            if (pullDistance > REFRESH_THRESHOLD) {
                setPullState('refreshing');
                setPullDistance(REFRESH_THRESHOLD);
                try {
                    await onRefresh();
                } finally {
                    setPullState('idle');
                    setPullDistance(0);
                }
            } else {
                setPullState('idle');
                setPullDistance(0);
            }
        }
        setStartY(0);
    }, [pullDistance, pullState, onRefresh]);

    // Handle overflow body class when pulling/refreshing
    useEffect(() => {
        if (pullState === 'pulling' || pullState === 'refreshing') {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [pullState]);

    const pullStyle = {
        transform: `translateY(${pullDistance}px)`,
        transition: pullState === 'pulling' ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        willChange: 'transform'
    };

    return { pullState, pullStyle, onTouchStart, onTouchMove, onTouchEnd };
}
