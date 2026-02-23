
import { CheckinData, ReadinessStatus } from './types';

// Constants and targets
const TARGET_SLEEP = 9; // hours

/**
 * Calculate readiness score (0-100) based on sleep, soreness, and mood.
 * Formula:
 * - Sleep (40%): Combined quantity and quality
 * - Soreness (30%): Inverse of pain level
 * - Mood (30%): Stress/Mood level
 */
export function calculateReadiness(data: CheckinData): number {
    // 1. Sleep Score (40%)
    // Quantity: Cap at TARGET_SLEEP (9h)
    const sleepQuantityScore = Math.min(data.sleepDuration, TARGET_SLEEP) / TARGET_SLEEP;
    // Quality: 1-5 -> 0.2-1.0
    const sleepQualityScore = data.sleepQuality / 5;

    // Average of Quantity and Quality, derived as percentage of component weight (40)
    // (Q1 + Q2) / 2 * 40
    const sleepComponent = ((sleepQuantityScore + sleepQualityScore) / 2) * 40;

    // 2. Soreness Score (30%)
    // data.soreness is 0-10 (0 = no pain, 10 = max pain)
    // We want 0 -> 1.0 (10/10), 10 -> 0.0 (0/10)
    const sorenessComponent = ((10 - data.soreness) / 10) * 30;

    // 3. Mood Score (30%)
    // data.mood is 1-5 (1 = stressed, 5 = great)
    // 1 -> 0.2, 5 -> 1.0
    const moodComponent = (data.mood / 5) * 30;

    const total = sleepComponent + sorenessComponent + moodComponent;

    // Clamp between 0 and 100
    return Math.round(Math.max(0, Math.min(100, total)));
}

export function getReadinessStatus(score: number): ReadinessStatus {
    if (score >= 90) return 'optimal';
    if (score >= 80) return 'good';
    if (score >= 60) return 'average';
    if (score >= 40) return 'poor';
    return 'recovery_needed';
}

export function getReadinessColor(score: number): string {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 60) return 'var(--color-warning)'; // Changed to 60 for yellow
    return 'var(--color-danger)';
}
