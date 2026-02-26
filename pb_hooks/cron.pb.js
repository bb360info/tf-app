
/**
 * pb_hooks/cron.pb.js
 *
 * Scheduled maintenance jobs:
 *   1. Weekly: cleanup expired notifications (expires_at < now)
 *   2. Daily:  timezone-aware checkin reminders (8:00 local time per user tz)
 *
 * PocketBase JSVM API (v0.23+):
 *   - $app.findRecordsByFilter(collection, filter, sort, limit, offset, params)
 *   - $app.findFirstRecordByFilter(collection, filterString, params)
 */

// ─── 1. Weekly Notification Cleanup ──────────────────────────────────────────
// Every Monday at 03:00 UTC
cronAdd("notif-cleanup", "0 3 * * 1", () => {
    try {
        const now = new Date().toISOString();

        let expired;
        try {
            expired = $app.findRecordsByFilter(
                "notifications",
                "expires_at != '' && expires_at < {:now}",
                "-created",
                500,  // limit
                0,
                { now }
            );
        } catch {
            // No expired notifications
            return;
        }

        if (!expired || expired.length === 0) return;

        let deleted = 0;
        for (const notif of expired) {
            try {
                $app.delete(notif);
                deleted++;
            } catch (err) {
                $app.logger().error("cron: cleanup notif", "id", notif.id, "error", String(err));
            }
        }

        if (deleted > 0) {
            $app.logger().info("cron: notif-cleanup", "deleted", String(deleted), "total_expired", String(expired.length));
        }
    } catch (err) {
        $app.logger().error("cron: notif-cleanup failed", "error", String(err));
    }
});

// ─── 2. Daily Checkin Reminder (timezone-aware) ───────────────────────────────
// Runs every hour — only sends to users whose local time is 8:00
cronAdd("checkin-reminder", "0 * * * *", () => {
    try {
        // Find users with push_enabled = true
        let allPrefs;
        try {
            allPrefs = $app.findRecordsByFilter(
                "notification_preferences",
                "push_enabled = true",
                "",   // no sort
                500,  // limit
                0
            );
        } catch {
            // No preferences found
            return;
        }

        if (!allPrefs || allPrefs.length === 0) return;

        const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const notifCollection = $app.findCollectionByNameOrId("notifications");

        for (const prefs of allPrefs) {
            try {
                const userId = prefs.getString("user_id");
                if (!userId) continue;

                // Check disabled_types
                const disabledTypes = prefs.getStringSlice("disabled_types");
                if (disabledTypes.includes("checkin_reminder")) continue;

                const tz = prefs.getString("timezone") || "UTC";

                // Get user's current local hour
                const formatter = new Intl.DateTimeFormat("en-US", {
                    timeZone: tz,
                    hour: "2-digit",
                    hour12: false,
                });
                const localHour = parseInt(formatter.format(new Date()));

                // Only send at 8am local time
                if (localHour !== 8) continue;

                // Find the athlete for this user to check if they already checked in today
                let athlete = null;
                try {
                    athlete = $app.findFirstRecordByFilter(
                        "athletes",
                        "user_id = {:uid}",
                        { uid: userId }
                    );
                } catch { continue; }

                if (!athlete) continue;

                const athleteId = athlete.id;

                // Check if already checked in today
                let alreadyCheckedIn = false;
                try {
                    const todayCheckin = $app.findFirstRecordByFilter(
                        "daily_checkins",
                        "athlete_id = {:aid} && date >= {:today}",
                        { aid: athleteId, today: todayUTC }
                    );
                    alreadyCheckedIn = !!todayCheckin;
                } catch { /* none found */ }

                if (alreadyCheckedIn) continue;

                // Check if reminder already sent today
                let reminderSentToday = false;
                try {
                    const existing = $app.findFirstRecordByFilter(
                        "notifications",
                        "user_id = {:uid} && type = 'checkin_reminder' && created >= {:today}",
                        { uid: userId, today: todayUTC }
                    );
                    reminderSentToday = !!existing;
                } catch { /* none found */ }

                if (reminderSentToday) continue;

                // INSERT reminder notification with 24h TTL
                const expires = new Date();
                expires.setHours(expires.getHours() + 24);

                const notif = new Record(notifCollection, {
                    user_id: userId,
                    type: "checkin_reminder",
                    message: "Don't forget your daily check-in!",
                    read: false,
                    link: "/training",
                    priority: "normal",
                    delivered: false,
                    expires_at: expires.toISOString(),
                });

                $app.save(notif);
            } catch (innerErr) {
                $app.logger().error("cron: checkin-reminder user", "error", String(innerErr));
            }
        }
    } catch (err) {
        $app.logger().error("cron: checkin-reminder failed", "error", String(err));
    }
});
