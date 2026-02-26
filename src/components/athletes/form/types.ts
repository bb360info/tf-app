import type { AthletesRecord, Discipline, Gender } from '@/lib/pocketbase/types';

export type AthleteFormMode = 'create' | 'edit' | 'settings';

export interface AthleteFormInitialData {
    name: string;
    birthDate: string;
    gender: Gender | '';
    heightCm: string;
    primaryDiscipline: Discipline | '';
    secondaryDisciplines: Discipline[];
}


export interface AthleteFormSubmitPayload {
    athletePatch: Partial<
        Pick<
            AthletesRecord,
            'name' | 'birth_date' | 'gender' | 'height_cm' | 'primary_discipline' | 'secondary_disciplines'
        >
    >;
}

export interface AthleteFormProps {
    mode: AthleteFormMode;
    initialData: AthleteFormInitialData;
    isSubmitting?: boolean;
    error?: string;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: AthleteFormSubmitPayload) => void;
}
