
/**
 * pb_hooks/cron.pb.js
 *
 * Scheduled maintenance jobs:
 *   1. Weekly: cleanup expired notifications (expires_at < now)
 *   2. Daily:  timezone-aware checkin reminders (8:00 local time per user tz)
 */

// ─── 1. Weekly Notification Cleanup ──────────────────────────────────────────
// Every Monday at 03:00 UTC
cronAdd("notif-cleanup", "0 3 * * 1", () => {
    try {
        const now = new Date().toISOString();

        const expired = $app.findAllRecords("notifications",
            $app.pbql("expires_at != '' && expires_at < {:now}", { now })
        );

        let deleted = 0;
        for (const notif of expired) {
            try {
                $app.delete(notif);
                deleted++;
            } catch (err) {
                $app.logger().error("cron: cleanup notif", "id", notif.getId(), "error", String(err));
            }
        }

        if (deleted > 0) {
            $app.logger().info("cron: notif-cleanup", "deleted", deleted, "total_expired", expired.length);
        }
    } catch (err) {
        $app.logger().error("cron: notif-cleanup failed", "error", String(err));
    }
});

// ─── 2. Daily Checkin Reminder (timezone-aware) ───────────────────────────────
// Runs every hour — only sends to users whose local time is 8:00
cronAdd("checkin-reminder", "0 * * * *", () => {
    try {
        // Find users with push_enabled = true who haven't checked in today
        const allPrefs = $app.findAllRecords("notification_preferences",
            $app.pbql("push_enabled = true")
        );

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
                    athlete = $app.findFirstRecordByFilter("athletes",
                        $app.pbql("user_id = {:uid}", { uid: userId })
                    );
                } catch { continue; }

                if (!athlete) continue;

                const athleteId = athlete.getId();

                // Check if already checked in today
                let alreadyCheckedIn = false;
                try {
                    const todayCheckin = $app.findFirstRecordByFilter("daily_checkins",
                        $app.pbql("athlete_id = {:aid} && date >= {:today}", {
                            aid: athleteId,
                            today: todayUTC,
                        })
                    );
                    alreadyCheckedIn = !!todayCheckin;
                } catch { /* none found */ }

                if (alreadyCheckedIn) continue;

                // Check if reminder already sent today
                let reminderSentToday = false;
                try {
                    const existing = $app.findFirstRecordByFilter("notifications",
                        $app.pbql(
                            "user_id = {:uid} && type = 'checkin_reminder' && created >= {:today}",
                            { uid: userId, today: todayUTC }
                        )
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
