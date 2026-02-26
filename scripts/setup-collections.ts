#!/usr/bin/env npx tsx
/**
 * PocketBase Collection Setup Script (v3 — PB v0.36+ compatible)
 *
 * Three-pass approach:
 *   Pass 1: Create/ensure all collections with non-relation fields, NO rules
 *   Pass 2: Add relation fields (with resolved collection IDs)
 *   Pass 3: Set API rules + indexes (now that all fields exist)
 *
 * Usage:
 *   PB_URL=https://jumpedia.app PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... npx tsx scripts/setup-collections.ts
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL ?? 'https://jumpedia.app';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD ?? '';

if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    console.error('❌ Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD env variables');
    process.exit(1);
}

const pb = new PocketBase(PB_URL);

// ─── PB v0.36+ Field Definitions (top-level properties) ───────────────────

type Field = Record<string, unknown>;

function text(name: string, required = true, max = 255): Field {
    return { name, type: 'text', required, max, min: 0 };
}

function num(name: string, required = false, min?: number, max?: number): Field {
    return { name, type: 'number', required, min: min ?? 0, max: max ?? 0, onlyInt: false };
}

function bool(name: string, required = false): Field {
    return { name, type: 'bool', required };
}

function date(name: string, required = true): Field {
    return { name, type: 'date', required };
}

function sel(name: string, values: string[], required = true, maxSelect = 1): Field {
    return { name, type: 'select', required, values, maxSelect };
}

function multisel(name: string, values: string[]): Field {
    return { name, type: 'select', required: false, values, maxSelect: values.length };
}

function jsonField(name: string, required = false): Field {
    return { name, type: 'json', required, maxSize: 2000000 };
}

function fileField(name: string, required = false, maxSelect = 1): Field {
    return { name, type: 'file', required, maxSelect, maxSize: 52428800 }; // 50MB
}

function softDelete(): Field {
    return date('deleted_at', false);
}

function syncId(): Field {
    return text('sync_id', false, 36);
}

// Relation — stored separately, resolved in Pass 2
interface RelDef {
    name: string;
    target: string; // collection name
    required: boolean;
}

// ─── Collection Schema ────────────────────────────────────────────────────

interface CollectionSchema {
    name: string;
    type: 'base' | 'auth';
    fields: Field[];
    relations: RelDef[];
    indexes: string[];
    listRule: string | null;
    viewRule: string | null;
    createRule: string | null;
    updateRule: string | null;
    deleteRule: string | null;
}

const R = (name: string, target: string, required = true): RelDef => ({ name, target, required });

// Coach-owned rules
const coachRules = {
    listRule: '@request.auth.id != "" && coach_id = @request.auth.id' as string | null,
    viewRule: '@request.auth.id != "" && coach_id = @request.auth.id' as string | null,
    createRule: '@request.auth.id != ""' as string | null,
    updateRule: '@request.auth.id != "" && coach_id = @request.auth.id' as string | null,
    deleteRule: '@request.auth.id != "" && coach_id = @request.auth.id' as string | null,
};

const authRules = {
    listRule: '@request.auth.id != ""' as string | null,
    viewRule: '@request.auth.id != ""' as string | null,
    createRule: '@request.auth.id != ""' as string | null,
    updateRule: '@request.auth.id != ""' as string | null,
    deleteRule: '@request.auth.id != ""' as string | null,
};

const coachOrSelfRules = {
    listRule: '@request.auth.id != "" && (coach_id = @request.auth.id || user_id = @request.auth.id)' as string | null,
    viewRule: '@request.auth.id != "" && (coach_id = @request.auth.id || user_id = @request.auth.id)' as string | null,
    createRule: '@request.auth.id != "" && (coach_id = @request.auth.id || user_id = @request.auth.id)' as string | null,
    updateRule: '@request.auth.id != "" && (coach_id = @request.auth.id || user_id = @request.auth.id)' as string | null,
    deleteRule: '@request.auth.id != "" && coach_id = @request.auth.id' as string | null,
};

const schemas: CollectionSchema[] = [
    {
        name: 'athletes', type: 'base',
        fields: [text('name'), date('birth_date', false), sel('gender', ['male', 'female'], false), num('height_cm', false, 100, 250), softDelete()],
        relations: [R('coach_id', 'users', false), R('user_id', 'users', false)],
        indexes: [
            'CREATE INDEX idx_athletes_coach ON athletes (coach_id)',
            "CREATE UNIQUE INDEX idx_athletes_user ON athletes (user_id) WHERE user_id != ''",
        ],
        ...coachOrSelfRules,
    },
    {
        name: 'groups', type: 'base',
        fields: [text('name'), text('timezone', false, 50), softDelete()],
        relations: [R('coach_id', 'users')],
        indexes: ['CREATE INDEX idx_groups_coach ON groups (coach_id)'],
        ...coachRules,
    },
    {
        name: 'group_members', type: 'base',
        fields: [],
        relations: [R('group_id', 'groups'), R('athlete_id', 'athletes')],
        indexes: ['CREATE UNIQUE INDEX idx_group_members_unique ON group_members (group_id, athlete_id)'],
        ...authRules, updateRule: null,
    },
    {
        name: 'coach_preferences', type: 'base',
        fields: [jsonField('default_plan_languages')],
        relations: [R('coach_id', 'users')],
        indexes: ['CREATE UNIQUE INDEX idx_coach_pref_unique ON coach_preferences (coach_id)'],
        ...coachRules,
    },
    {
        name: 'seasons', type: 'base',
        fields: [text('name'), date('start_date'), date('end_date'), softDelete()],
        relations: [R('coach_id', 'users')],
        indexes: ['CREATE INDEX idx_seasons_coach ON seasons (coach_id)'],
        ...coachRules,
    },
    {
        name: 'training_phases', type: 'base',
        fields: [sel('phase_type', ['GPP', 'SPP', 'COMP', 'TRANSITION']), num('order', true, 0), date('start_date', false), date('end_date', false), softDelete()],
        relations: [R('season_id', 'seasons')],
        indexes: ['CREATE INDEX idx_phases_season ON training_phases (season_id)'],
        ...authRules,
    },
    {
        name: 'training_plans', type: 'base',
        fields: [num('week_number', true, 1), sel('status', ['draft', 'published', 'archived']), text('notes', false, 5000), syncId(), softDelete()],
        relations: [R('phase_id', 'training_phases')],
        indexes: ['CREATE INDEX idx_plans_phase ON training_plans (phase_id)'],
        ...authRules,
    },
    {
        name: 'exercises', type: 'base',
        fields: [
            text('name_ru', true, 500), text('name_en', true, 500), text('name_cn', true, 500),
            text('description_ru', false, 5000), text('description_en', false, 5000), text('description_cn', false, 5000),
            sel('level', ['beginner', 'intermediate', 'advanced']),
            sel('unit_type', ['reps', 'time', 'distance', 'weight']),
            num('cns_cost', true, 1, 5),
            sel('training_category', ['plyometric', 'highjump', 'strength', 'gpp', 'speed', 'flexibility', 'jump']),
            multisel('phase_suitability', ['GPP', 'SPP', 'COMP', 'TRANSITION']),
            jsonField('tags'),
            fileField('illustration'),
        ],
        relations: [],
        indexes: [],
        listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.role = "admin"', updateRule: '@request.auth.role = "admin"', deleteRule: '@request.auth.role = "admin"',
    },
    {
        name: 'plan_exercises', type: 'base',
        fields: [num('order', true, 0), num('day_of_week', false, 1, 7), num('sets', false, 1), text('reps', false, 100), text('intensity', false, 100), text('notes', false, 2000), softDelete()],
        relations: [R('plan_id', 'training_plans'), R('exercise_id', 'exercises')],
        indexes: ['CREATE INDEX idx_plan_ex_plan ON plan_exercises (plan_id)'],
        ...authRules,
    },
    {
        name: 'plan_snapshots', type: 'base',
        fields: [jsonField('snapshot', true), num('version', true, 1)],
        relations: [R('plan_id', 'training_plans')],
        indexes: ['CREATE INDEX idx_snapshots_plan ON plan_snapshots (plan_id)'],
        listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""', updateRule: null, deleteRule: null,
    },
    {
        name: 'custom_exercises', type: 'base',
        fields: [
            text('name_ru', false, 500), text('name_en', false, 500), text('name_cn', false, 500),
            text('description_ru', false, 5000), text('description_en', false, 5000), text('description_cn', false, 5000),
            sel('level', ['beginner', 'intermediate', 'advanced']),
            sel('unit_type', ['reps', 'time', 'distance', 'weight']),
            num('cns_cost', true, 1, 5),
            sel('training_category', ['plyometric', 'highjump', 'strength', 'gpp', 'speed', 'flexibility', 'jump']),
            multisel('phase_suitability', ['GPP', 'SPP', 'COMP', 'TRANSITION']),
            jsonField('tags'), softDelete(),
        ],
        relations: [R('coach_id', 'users')],
        indexes: ['CREATE INDEX idx_custom_ex_coach ON custom_exercises (coach_id)'],
        ...coachRules,
    },
    {
        name: 'training_logs', type: 'base',
        fields: [date('date'), text('notes', false, 5000), num('readiness_score', false, 0, 100), syncId()],
        relations: [R('athlete_id', 'athletes'), R('plan_id', 'training_plans')],
        indexes: ['CREATE UNIQUE INDEX idx_logs_unique ON training_logs (athlete_id, plan_id, date)', 'CREATE INDEX idx_logs_athlete ON training_logs (athlete_id)'],
        ...authRules,
    },
    {
        name: 'log_exercises', type: 'base',
        fields: [jsonField('sets_data', true)],
        relations: [R('log_id', 'training_logs'), R('exercise_id', 'exercises')],
        indexes: ['CREATE INDEX idx_log_ex_log ON log_exercises (log_id)'],
        ...authRules,
    },
    {
        name: 'daily_checkins', type: 'base',
        fields: [date('date'), num('sleep_hours', false, 0, 24), num('sleep_quality', false, 1, 5), num('pain_level', false, 0, 10), num('mood', false, 1, 5), text('notes', false, 2000), syncId()],
        relations: [R('athlete_id', 'athletes')],
        indexes: ['CREATE UNIQUE INDEX idx_checkins_unique ON daily_checkins (athlete_id, date)', 'CREATE INDEX idx_checkins_athlete ON daily_checkins (athlete_id)'],
        ...authRules,
    },
    {
        name: 'test_results', type: 'base',
        fields: [sel('test_type', ['standing_jump', 'approach_jump', 'sprint_30m', 'sprint_60m', 'squat_max', 'clean_max', 'snatch_max']), num('value', true), date('date'), text('notes', false, 2000)],
        relations: [R('athlete_id', 'athletes')],
        indexes: ['CREATE UNIQUE INDEX idx_tests_unique ON test_results (athlete_id, test_type, date)', 'CREATE INDEX idx_tests_athlete ON test_results (athlete_id)'],
        ...authRules,
    },
    {
        name: 'competitions', type: 'base',
        fields: [
            text('name'),
            date('date'),
            sel('priority', ['A', 'B', 'C']),
            sel('discipline', ['high_jump', 'long_jump', 'triple_jump'], false),
            sel('season_type', ['indoor', 'outdoor'], false),
            text('website', false, 1000),
            sel('status', ['planned', 'confirmed', 'completed', 'cancelled'], false),
            num('official_result', false, 0, 30),
            text('location', false, 500),
            text('notes', false, 2000),
            date('official_updated_at', false),
            softDelete(),
        ],
        relations: [R('season_id', 'seasons'), R('official_updated_by', 'users', false)],
        indexes: [
            'CREATE INDEX idx_comp_season ON competitions (season_id)',
            'CREATE INDEX idx_comp_filters ON competitions (season_id, date, discipline, season_type, status)',
        ],
        listRule: '@request.auth.id != "" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id || season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id)',
        viewRule: '@request.auth.id != "" && (season_id.coach_id = @request.auth.id || season_id.athlete_id.user_id = @request.auth.id || season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id)',
        createRule: '@request.auth.id != "" && season_id.coach_id = @request.auth.id',
        updateRule: '@request.auth.id != "" && season_id.coach_id = @request.auth.id',
        deleteRule: '@request.auth.id != "" && season_id.coach_id = @request.auth.id',
    },
    {
        name: 'competition_participants', type: 'base',
        fields: [
            sel('status', ['planned', 'confirmed', 'withdrawn', 'dns', 'dnf', 'finished']),
            text('lane_or_order', false, 50),
            text('bib_number', false, 50),
            text('result_note', false, 1000),
            softDelete(),
        ],
        relations: [R('competition_id', 'competitions'), R('athlete_id', 'athletes')],
        indexes: [
            'CREATE UNIQUE INDEX idx_comp_participant_unique ON competition_participants (competition_id, athlete_id)',
            'CREATE INDEX idx_comp_participants_competition ON competition_participants (competition_id, status)',
            'CREATE INDEX idx_comp_participants_athlete ON competition_participants (athlete_id, status)',
        ],
        listRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)',
        viewRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)',
        createRule: '@request.auth.id != "" && competition_id.season_id.coach_id = @request.auth.id',
        updateRule: '@request.auth.id != "" && competition_id.season_id.coach_id = @request.auth.id',
        deleteRule: '@request.auth.id != "" && competition_id.season_id.coach_id = @request.auth.id',
    },
    {
        name: 'competition_proposals', type: 'base',
        fields: [
            sel('kind', ['result', 'metadata', 'pre_event_info', 'media_meta']),
            jsonField('payload', true),
            sel('status', ['pending', 'approved', 'rejected', 'superseded']),
            date('proposed_at', false),
            text('athlete_comment', false, 2000),
            text('review_comment', false, 2000),
            jsonField('reviewed_fields', false),
            date('reviewed_at', false),
            softDelete(),
        ],
        relations: [R('competition_id', 'competitions'), R('athlete_id', 'athletes'), R('reviewed_by', 'users', false)],
        indexes: [
            'CREATE INDEX idx_comp_proposals_inbox ON competition_proposals (competition_id, status, proposed_at)',
            'CREATE INDEX idx_comp_proposals_athlete ON competition_proposals (athlete_id, status, proposed_at)',
        ],
        listRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)',
        viewRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || athlete_id.user_id = @request.auth.id)',
        createRule: '@request.auth.id != "" && athlete_id.user_id = @request.auth.id && status = "pending"',
        updateRule: '@request.auth.id != "" && competition_id.season_id.coach_id = @request.auth.id',
        deleteRule: '@request.auth.id != "" && competition_id.season_id.coach_id = @request.auth.id',
    },
    {
        name: 'competition_media', type: 'base',
        fields: [
            fileField('file', true),
            sel('kind', ['photo', 'video', 'document'], false),
            sel('visibility', ['team', 'participants', 'private', 'public']),
            sel('moderation_status', ['visible', 'hidden']),
            text('caption', false, 2000),
            text('moderation_reason', false, 2000),
            date('moderated_at', false),
            softDelete(),
        ],
        relations: [
            R('competition_id', 'competitions'),
            R('uploader_athlete_id', 'athletes'),
            R('subject_athlete_id', 'athletes', false),
            R('moderated_by', 'users', false),
        ],
        indexes: [
            'CREATE INDEX idx_comp_media_mod ON competition_media (competition_id, moderation_status, visibility)',
            'CREATE INDEX idx_comp_media_uploader ON competition_media (uploader_athlete_id, visibility)',
        ],
        listRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || (moderation_status = "visible" && (visibility = "public" || (visibility = "team" && (competition_id.season_id.athlete_id.user_id = @request.auth.id || competition_id.season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id)) || (visibility = "participants" && competition_id.competition_participants_via_competition_id.athlete_id.user_id ?= @request.auth.id) || (visibility = "private" && (uploader_athlete_id.user_id = @request.auth.id || subject_athlete_id.user_id = @request.auth.id)))))',
        viewRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || (moderation_status = "visible" && (visibility = "public" || (visibility = "team" && (competition_id.season_id.athlete_id.user_id = @request.auth.id || competition_id.season_id.group_id.group_members_via_group_id.athlete_id.user_id ?= @request.auth.id)) || (visibility = "participants" && competition_id.competition_participants_via_competition_id.athlete_id.user_id ?= @request.auth.id) || (visibility = "private" && (uploader_athlete_id.user_id = @request.auth.id || subject_athlete_id.user_id = @request.auth.id)))))',
        createRule: '@request.auth.id != "" && uploader_athlete_id.user_id = @request.auth.id && (subject_athlete_id = "" || competition_id.competition_participants_via_competition_id.athlete_id ?= subject_athlete_id)',
        updateRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || uploader_athlete_id.user_id = @request.auth.id) && (subject_athlete_id = "" || competition_id.competition_participants_via_competition_id.athlete_id ?= subject_athlete_id)',
        deleteRule: '@request.auth.id != "" && (competition_id.season_id.coach_id = @request.auth.id || uploader_athlete_id.user_id = @request.auth.id)',
    },
    {
        name: 'exercise_videos', type: 'base',
        fields: [fileField('file', true), text('description', false, 2000)],
        relations: [R('exercise_id', 'exercises'), R('coach_id', 'users')],
        indexes: ['CREATE INDEX idx_videos_exercise ON exercise_videos (exercise_id)'],
        listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != "" && coach_id = @request.auth.id',
        deleteRule: '@request.auth.id != "" && coach_id = @request.auth.id',
    },
    {
        name: 'achievements', type: 'base',
        fields: [sel('type', ['streak', 'personal_best', 'milestone', 'consistency']), date('earned_at'), text('title', false), text('description', false, 2000)],
        relations: [R('athlete_id', 'athletes')],
        indexes: ['CREATE INDEX idx_achievements_athlete ON achievements (athlete_id)'],
        listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""', updateRule: null, deleteRule: '@request.auth.id != ""',
    },
    {
        name: 'notifications', type: 'base',
        fields: [sel('type', ['plan_published', 'checkin_reminder', 'achievement', 'system']), text('message', true, 2000), bool('read'), text('link', false, 500)],
        relations: [R('user_id', 'users')],
        indexes: ['CREATE INDEX idx_notif_user ON notifications (user_id)', 'CREATE INDEX idx_notif_unread ON notifications (user_id, read)'],
        listRule: '@request.auth.id != "" && user_id = @request.auth.id',
        viewRule: '@request.auth.id != "" && user_id = @request.auth.id',
        createRule: null,
        updateRule: '@request.auth.id != "" && user_id = @request.auth.id',
        deleteRule: '@request.auth.id != "" && user_id = @request.auth.id',
    },
    {
        name: 'error_logs', type: 'base',
        fields: [text('user_id', false, 15), text('error', true, 5000), text('stack', false, 10000), text('device_info', false, 1000), text('url', false, 2000)],
        relations: [],
        indexes: [],
        listRule: '@request.auth.role = "admin"', viewRule: '@request.auth.role = "admin"',
        createRule: '', updateRule: null, deleteRule: '@request.auth.role = "admin"',
    },
];

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
    console.log(`🔌 Connecting to PocketBase at ${PB_URL}...`);

    try {
        await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (err) {
        console.error('❌ Admin auth failed:', err);
        process.exit(1);
    }

    // ── Update users collection with custom fields ──
    console.log('👤 Updating users collection...');
    try {
        const usersCol = await pb.collections.getOne('users');
        const existingNames = new Set((usersCol.fields ?? []).map((f: Field) => f.name));

        const customFields: Field[] = [
            sel('role', ['coach', 'athlete', 'admin']),
            sel('language', ['ru', 'en', 'cn']),
            sel('units', ['metric', 'imperial']),
        ];

        const newFields = customFields.filter((f) => !existingNames.has(f.name as string));
        if (newFields.length > 0) {
            await pb.collections.update('users', {
                fields: [...(usersCol.fields ?? []), ...newFields],
            });
            console.log(`  ✅ Added ${newFields.length} custom fields`);
        } else {
            console.log('  ⏭️  Custom fields already exist');
        }
    } catch (err) {
        const e = err as { response?: { data?: unknown } };
        console.error('  ❌ Failed:', JSON.stringify(e.response?.data ?? err));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 1: Create collections with non-relation fields, NO rules
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══ PASS 1: Create collections (no relations, no rules) ═══\n');

    let p1Created = 0, p1Skipped = 0, p1Failed = 0;

    for (const s of schemas) {
        process.stdout.write(`  📦 ${s.name}... `);
        try {
            try { await pb.collections.getOne(s.name); console.log('⏭️  exists'); p1Skipped++; continue; } catch { /* doesn't exist */ }

            // Only non-relation fields, no rules that reference fields
            const hasRelRules = s.relations.length > 0 && (
                (s.listRule ?? '').includes('coach_id') || (s.listRule ?? '').includes('user_id') ||
                (s.viewRule ?? '').includes('coach_id') || (s.viewRule ?? '').includes('user_id') ||
                (s.updateRule ?? '').includes('coach_id') || (s.updateRule ?? '').includes('user_id') ||
                (s.deleteRule ?? '').includes('coach_id') || (s.deleteRule ?? '').includes('user_id')
            );

            await pb.collections.create({
                name: s.name, type: s.type,
                fields: s.fields,
                indexes: [],
                // If rules reference relation fields, defer to Pass 3
                listRule: hasRelRules ? '' : (s.listRule ?? null),
                viewRule: hasRelRules ? '' : (s.viewRule ?? null),
                createRule: hasRelRules ? '' : (s.createRule ?? null),
                updateRule: hasRelRules ? '' : (s.updateRule ?? null),
                deleteRule: hasRelRules ? '' : (s.deleteRule ?? null),
            });
            console.log('✅'); p1Created++;
        } catch (err) {
            const e = err as { response?: { data?: unknown } };
            console.log('❌');
            console.error(`    ${JSON.stringify(e.response?.data ?? err)}`);
            p1Failed++;
        }
    }
    console.log(`\n  Pass 1: ✅ ${p1Created}  ⏭️ ${p1Skipped}  ❌ ${p1Failed}`);

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 2: Add relation fields
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══ PASS 2: Add relation fields ═══\n');

    // Build fresh name→ID map
    const allCols = await pb.collections.getFullList();
    const nameToId: Record<string, string> = {};
    for (const c of allCols) nameToId[c.name] = c.id;

    let p2Updated = 0, p2Skipped = 0, p2Failed = 0;

    for (const s of schemas) {
        if (s.relations.length === 0) { continue; }

        process.stdout.write(`  🔗 ${s.name}... `);
        try {
            const col = await pb.collections.getOne(s.name);
            const existingNames = new Set((col.fields ?? []).map((f: Field) => f.name));

            const newRelFields: Field[] = [];
            for (const r of s.relations) {
                if (existingNames.has(r.name)) continue;
                const targetId = nameToId[r.target];
                if (!targetId) { console.log(`⚠️  "${r.target}" not found`); continue; }
                newRelFields.push({
                    name: r.name,
                    type: 'relation',
                    required: r.required,
                    collectionId: targetId,
                    cascadeDelete: false,
                    maxSelect: 1,
                });
            }

            if (newRelFields.length === 0) { console.log('⏭️  exists'); p2Skipped++; continue; }

            await pb.collections.update(s.name, {
                fields: [...(col.fields ?? []), ...newRelFields],
            });
            console.log(`✅ +${newRelFields.length}`); p2Updated++;
        } catch (err) {
            const e = err as { response?: { data?: unknown } };
            console.log('❌');
            console.error(`    ${JSON.stringify(e.response?.data ?? err)}`);
            p2Failed++;
        }
    }
    console.log(`\n  Pass 2: ✅ ${p2Updated}  ⏭️ ${p2Skipped}  ❌ ${p2Failed}`);

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 3: Set API rules + indexes
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══ PASS 3: Set API rules & indexes ═══\n');

    let p3Updated = 0, p3Failed = 0;

    for (const s of schemas) {
        process.stdout.write(`  🔒 ${s.name}... `);
        try {
            await pb.collections.update(s.name, {
                indexes: s.indexes,
                listRule: s.listRule,
                viewRule: s.viewRule,
                createRule: s.createRule,
                updateRule: s.updateRule,
                deleteRule: s.deleteRule,
            });
            console.log('✅'); p3Updated++;
        } catch (err) {
            const e = err as { response?: { data?: unknown } };
            console.log('❌');
            console.error(`    ${JSON.stringify(e.response?.data ?? err)}`);
            p3Failed++;
        }
    }
    console.log(`\n  Pass 3: ✅ ${p3Updated}  ❌ ${p3Failed}`);

    // ─── Summary ───
    console.log(`\n${'═'.repeat(50)}`);
    console.log('📊 Summary:');
    console.log(`   Pass 1 (create):    ✅ ${p1Created}  ⏭️ ${p1Skipped}  ❌ ${p1Failed}`);
    console.log(`   Pass 2 (relations): ✅ ${p2Updated}  ⏭️ ${p2Skipped}  ❌ ${p2Failed}`);
    console.log(`   Pass 3 (rules):     ✅ ${p3Updated}  ❌ ${p3Failed}`);

    if (p1Failed === 0 && p2Failed === 0 && p3Failed === 0) {
        console.log('\n🎉 All 21 collections created successfully!');
    }
}

main().catch(console.error);
