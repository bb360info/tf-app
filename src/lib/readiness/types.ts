
export interface CheckinData {
    sleepDuration: number; // hours, e.g. 7.5
    sleepQuality: number; // 1-5
    soreness: number; // 0-10 (pain level, 0=no pain)
    mood: number; // 1-5 (1=stressed, 5=excellent)
}

export type ReadinessStatus = 'optimal' | 'good' | 'average' | 'poor' | 'recovery_needed';
