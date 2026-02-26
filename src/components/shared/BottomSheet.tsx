'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
    isOpen: boolean;
    onClose?: () => void;
    title?: string;
    children: React.ReactNode;
}

// Ensure it's exported safely for next/dynamic
export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    const [mounted, setMounted] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Drag to dismiss state
    const [dragY, setDragY] = useState(0);
    const startY = useRef(0);
    const isDragging = useRef(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        // Handle escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Prevent body scroll when open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current && onClose) {
            onClose();
        }
    };

    // --- Drag to dismiss logic ---
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        isDragging.current = true;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startY.current = clientY;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging.current) return;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const deltaY = clientY - startY.current;

        // Only allow dragging downwards
        if (deltaY > 0) {
            setDragY(deltaY);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;

        // If dragged down more than 100px, dismiss
        if (dragY > 100 && onClose) {
            onClose();
        }

        // Reset transformation when touch ends (either dismissed or snapped back)
        setDragY(0);
    };

    const handleMouseLeave = () => {
        if (isDragging.current) {
            handleTouchEnd();
        }
    };

    if (!mounted) return null;

    const portalElement = document.getElementById('portal-root');
    if (!portalElement) {
        console.warn('BottomSheet requires <div id="portal-root"> in layout.tsx');
        return null;
    }

    const sheetStyle = dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined;

    return createPortal(
        <div
            className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
            ref={overlayRef}
            onClick={handleBackdropClick}
            aria-hidden={!isOpen}
            role="presentation"
        >
            <div
                className={styles.sheet}
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label={title || "Sliding panel"}
                style={sheetStyle}
            >
                {/* Drag Handle Area */}
                <div
                    className={styles.handleArea}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className={styles.handle} />
                </div>

                {(title || onClose) && (
                    <div className={styles.header}>
                        {title && <h2 className={styles.title}>{title}</h2>}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className={styles.closeButton}
                                aria-label="Close"
                            >
                                <X size={20} strokeWidth={2} />
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>,
        portalElement
    );
}
