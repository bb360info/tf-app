
/**
 * pb_hooks/notifications.pb.js
 *
 * Non-blocking notification hooks for Jumpedia.
 * CRITICAL: These hooks ONLY write to the `notifications` table.
 * NO $http.send() here — push delivery is handled by push-delivery.pb.js Cron.
 *
 * Hooks:
 *   1. onAfterCreate('daily_checkins') — low readiness alert to coach
 *   2. onAfterUpdate('training_plans') — plan published → batch notify assigned athletes
 *   3. onAfterCreate('achievements')  — achievement granted → notify coach
 *
 * PocketBase JSVM API (v0.23+):
 *   - $app.findFirstRecordByFilter(collection, filterString, optionalParams)
 *   - $app.findRecordsByFilter(collection, filter, sort, limit, offset, params)
 *   - $app.findAllRecords(collection, ...dbxExpressions)
 */

// ─── 1. Low Readiness Alert ────────────────────────────────────────────────────
onRecordAfterCreateSuccess((e) => {
    try {
        const record = e.record;
        const score = record.getFloat("readiness_score");

        // Only alert on low readiness (< 50)
        if (score >= 50) return;

        const athleteId = record.getString("athlete_id");
        if (!athleteId) return;

        // Resolve athlete → coach_id
        const athlete = $app.findRecordById("athletes", athleteId);
        if (!athlete) return;

        const coachId = athlete.getString("coach_id");
        if (!coachId) return;

        // Check coach notification preferences
        let prefs = null;
        try {
            prefs = $app.findFirstRecordByFilter(
                "notification_preferences",
                "user_id = {:uid}",
                { uid: coachId }
            );
        } catch { /* no prefs = defaults */ }

        if (prefs) {
            // Respect disabled_types
            const disabledTypes = prefs.getStringSlice("disabled_types");
            if (disabledTypes.includes("low_readiness")) return;
        }

        const athleteName = athlete.getString("name_ru") || athlete.getString("name_en") || athlete.getString("name") || "Athlete";

        // INSERT notification (delivered defaults to false)
        const collection = $app.findCollectionByNameOrId("notifications");
        const notif = new Record(collection, {
            user_id: coachId,
            type: "low_readiness",
            message: `${athleteName} readiness: ${Math.round(score)}/100`,
            read: false,
            link: `/dashboard/athlete/${athleteId}`,
            priority: score < 30 ? "urgent" : "normal",
            delivered: false,
        });

        $app.save(notif);
    } catch (err) {
        // Non-blocking: log error but don't disrupt the checkin flow
        $app.logger().error("notifications hook: low_readiness", "error", String(err));
    }
}, "daily_checkins");

// ─── 2. Achievement Granted → Notify Coach ────────────────────────────────────
onRecordAfterCreateSuccess((e) => {
    try {
        const record = e.record;
        const athleteId = record.getString("athlete_id");
        if (!athleteId) return;

        const athlete = $app.findRecordById("athletes", athleteId);
        if (!athlete) return;

        const coachId = athlete.getString("coach_id");
        if (!coachId) return;

        // Check coach preferences
        let prefs = null;
        try {
            prefs = $app.findFirstRecordByFilter(
                "notification_preferences",
                "user_id = {:uid}",
                { uid: coachId }
            );
        } catch { /* no prefs = defaults */ }

        if (prefs) {
            const disabledTypes = prefs.getStringSlice("disabled_types");
            if (disabledTypes.includes("achievement")) return;
        }

        const achievementTitle = record.getString("title") || "Achievement";
        const collection = $app.findCollectionByNameOrId("notifications");

        const notif = new Record(collection, {
            user_id: coachId,
            type: "achievement",
            message: `Athlete unlocked achievement: ${achievementTitle}`,
            read: false,
            link: `/dashboard/athlete/${athleteId}`,
            priority: "normal",
            delivered: false,
        });

        $app.save(notif);
    } catch (err) {
        $app.logger().error("notifications hook: achievement", "error", String(err));
    }
}, "achievements");
