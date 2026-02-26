/**
 * pb_hooks/push-delivery.pb.js
 *
 * Cron: every 60 seconds — deliver undelivered notifications via CF Worker.
 *
 * IMPORTANT: In PB JSVM, all top-level declarations (const, function) are NOT
 * accessible inside cronAdd/onRecord callbacks. Everything must be defined
 * INSIDE the callback body.
 */

cronAdd("push-delivery", "* * * * *", () => {
    // ── ENV (must be read inside callback) ──
    const PUSH_WORKER_URL = $os.getenv("PUSH_WORKER_URL") || "https://push.jumpedia.app";
    const PUSH_WORKER_SECRET = $os.getenv("PUSH_WORKER_SECRET");

    if (!PUSH_WORKER_SECRET) {
        $app.logger().warn("push-delivery: PUSH_WORKER_SECRET not set, skipping");
        return;
    }

    // ── Helper: quiet hours check ──
    function isQuietHours(prefs) {
        try {
            const tz = prefs.getString("timezone") || "UTC";
            const start = prefs.getString("quiet_hours_start");
            const end = prefs.getString("quiet_hours_end");
            if (!start || !end) return false;

            const now = new Date();
            const formatter = new Intl.DateTimeFormat("en-US", {
                timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
            });
            const [hourStr, minStr] = formatter.format(now).split(":");
            const currentMinutes = parseInt(hourStr) * 60 + parseInt(minStr);

            const [sh, sm] = start.split(":").map(Number);
            const [eh, em] = end.split(":").map(Number);
            const startMin = sh * 60 + sm;
            const endMin = eh * 60 + em;

            if (startMin <= endMin) {
                return currentMinutes >= startMin && currentMinutes < endMin;
            }
            return currentMinutes >= startMin || currentMinutes < endMin;
        } catch {
            return false;
        }
    }

    // ── Helper: log error to error_logs collection ──
    function logError(message, details) {
        try {
            const col = $app.findCollectionByNameOrId("error_logs");
            const rec = new Record(col, {
                error: message,
                stack: typeof details === "string" ? details : JSON.stringify(details),
                url: "pb_hooks/push-delivery.pb.js",
            });
            $app.save(rec);
        } catch {
            $app.logger().error("push-delivery: failed to log error", "msg", message);
        }
    }

    try {
        // 1. Fetch undelivered notifications (fetch more to prevent Head-of-Line blocking by quiet hours)
        let undelivered;
        try {
            undelivered = $app.findRecordsByFilter(
                "notifications",
                "delivered = false",
                "-created",
                1000, // Increased from 50 to 1000 to bypass blocked items
                0
            );
        } catch {
            return; // no records = no work
        }

        if (!undelivered || undelivered.length === 0) return;

        $app.logger().info("push-delivery: found " + undelivered.length + " undelivered notifications");

        // 2. Build batch payload
        const batchItems = [];

        for (const notif of undelivered) {
            if (batchItems.length >= 50) break; // Limit batch size to 50 for CF Worker
            const userId = notif.getString("user_id");

            // Get notification preferences
            let prefs = null;
            try {
                prefs = $app.findFirstRecordByFilter(
                    "notification_preferences",
                    "user_id = {:uid}",
                    { uid: userId }
                );
            } catch { /* defaults */ }

            // Check push_enabled
            if (prefs && !prefs.getBool("push_enabled")) {
                notif.set("delivered", true);
                $app.save(notif);
                continue;
            }

            // Check disabled_types
            if (prefs) {
                const disabled = prefs.getStringSlice("disabled_types");
                if (disabled.includes(notif.getString("type"))) {
                    notif.set("delivered", true);
                    $app.save(notif);
                    continue;
                }
            }

            // Check quiet hours
            if (prefs && isQuietHours(prefs)) continue;

            // Fetch push subscriptions
            let subscriptions;
            try {
                subscriptions = $app.findRecordsByFilter(
                    "push_subscriptions",
                    "user_id = {:uid}",
                    "", 100, 0,
                    { uid: userId }
                );
            } catch {
                notif.set("delivered", true);
                $app.save(notif);
                continue;
            }

            if (!subscriptions || subscriptions.length === 0) {
                notif.set("delivered", true);
                $app.save(notif);
                continue;
            }

            const subPayloads = subscriptions.map((sub) => ({
                id: sub.id,
                endpoint: sub.getString("endpoint"),
                keys: {
                    p256dh: sub.getString("p256dh"),
                    auth: sub.getString("auth_key"),
                },
            }));

            // ─── NEW: Localization Logic ───
            const lang = (prefs ? prefs.getString("language") : "") || "ru";

            const pushDict = {
                "ru": {
                    "invite_accepted": { "title": "Новый участник", "body": "👋 {athleteName} вступил в группу «{groupName}»" },
                    "plan_published": { "title": "Новый план", "body": "📅 Опубликован план на {week} неделю" },
                    "coach_note": { "title": "Сообщение от тренера", "body": "{text}" },
                    "achievement": { "title": "Новое достижение", "body": "🏆 Вы получили награду: {title}" },
                    "system": { "title": "Jumpedia", "body": "{message}" },
                },
                "en": {
                    "invite_accepted": { "title": "New Member", "body": "👋 {athleteName} joined group '{groupName}'" },
                    "plan_published": { "title": "Plan Published", "body": "📅 Week {week} plan is ready" },
                    "coach_note": { "title": "Note from Coach", "body": "{text}" },
                    "achievement": { "title": "New Achievement", "body": "🏆 Achievement earned: {title}" },
                    "system": { "title": "Jumpedia", "body": "{message}" },
                },
                "cn": {
                    "invite_accepted": { "title": "新成员", "body": "👋 {athleteName} 加入了小组 「{groupName}」" },
                    "plan_published": { "title": "新计划", "body": "📅 第 {week} 周计划已发布" },
                    "coach_note": { "title": "教练留言", "body": "{text}" },
                    "achievement": { "title": "新成就", "body": "🏆 获得成就：{title}" },
                    "system": { "title": "Jumpedia", "body": "{message}" },
                }
            };

            const notifType = notif.getString("type");
            const dict = pushDict[lang] || pushDict["ru"];
            const entry = dict[notifType] || dict["system"];

            let title = entry.title;
            let body = entry.body;

            // Simple Interpolation: replace {key} with value from message_params
            const msgParamsRaw = notif.getString("message_params");
            let msgParams = {};
            try {
                msgParams = JSON.parse(msgParamsRaw || "{}");
            } catch (e) { /* ignore parse error */ }

            // Special handling for system type if no entry
            if (!dict[notifType] && !notif.getString("message_key")) {
                body = notif.getString("message");
            }

            // Replace placeholders
            Object.keys(msgParams).forEach(key => {
                const val = String(msgParams[key]);
                title = title.replace("{" + key + "}", val);
                body = body.replace("{" + key + "}", val);
            });

            // Final fallback: if body still has placeholders or is empty
            if (!body || body === "{message}") {
                body = notif.getString("message") || "New notification";
            }

            batchItems.push({
                notifId: notif.id,
                payload: {
                    notifId: notif.id,
                    title: title,
                    body: body,
                    link: notif.getString("link") || "/",
                    priority: notif.getString("priority") || "normal",
                },
                subscriptions: subPayloads,
            });
        }

        if (batchItems.length === 0) return;

        $app.logger().info("push-delivery: sending " + batchItems.length + " to CF Worker");

        // 3. Send batch to CF Worker
        const response = $http.send({
            method: "POST",
            url: PUSH_WORKER_URL + "/push-batch",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + PUSH_WORKER_SECRET,
            },
            body: JSON.stringify({
                notifications: batchItems.map((i) => ({
                    payload: i.payload,
                    subscriptions: i.subscriptions,
                })),
            }),
            timeout: 30,
        });

        if (response.statusCode !== 200) {
            logError("push-delivery: CF Worker returned " + response.statusCode, response.raw || "");
            $app.logger().error("push-delivery: CF Worker error", "status", String(response.statusCode));
            return;
        }

        $app.logger().info("push-delivery: CF Worker returned 200");

        // 4. Process results
        let results = [];
        try {
            results = JSON.parse(response.raw).results || [];
        } catch {
            $app.logger().error("push-delivery: failed to parse CF response", "raw", response.raw || "");
        }

        // Log per-subscription results for debugging
        const statusCounts = {};
        const errorSamples = [];
        for (const r of results) {
            const s = String(r.status);
            statusCounts[s] = (statusCounts[s] || 0) + 1;
            if (r.error && errorSamples.length < 3) {
                errorSamples.push(String(r.error).substring(0, 200));
            }
        }
        $app.logger().info("push-delivery: sub results", "counts", JSON.stringify(statusCounts));
        if (errorSamples.length > 0) {
            $app.logger().error("push-delivery: error samples", "errors", JSON.stringify(errorSamples));
        }

        const staleEndpoints = new Set(
            results.filter((r) => r.status === 410).map((r) => r.endpoint)
        );

        // 5. Delete stale subscriptions (410)
        for (const item of batchItems) {
            for (const sub of item.subscriptions) {
                if (staleEndpoints.has(sub.endpoint)) {
                    try {
                        const stale = $app.findRecordById("push_subscriptions", sub.id);
                        if (stale) $app.delete(stale);
                        $app.logger().info("push-delivery: deleted stale sub", "endpoint", sub.endpoint.substring(0, 50));
                    } catch (err) {
                        $app.logger().error("push-delivery: delete stale", "error", String(err));
                    }
                }
            }
        }

        // 6. Mark ALL as delivered (CF Worker got 200 = delivery was attempted)
        // We mark delivered even if individual push subs failed to avoid infinite retry.
        // Stale subs are cleaned up above; other failures are transient.
        for (const item of batchItems) {
            try {
                const notif = $app.findRecordById("notifications", item.notifId);
                if (notif) {
                    notif.set("delivered", true);
                    $app.save(notif);
                }
            } catch (err) {
                $app.logger().error("push-delivery: mark delivered", "error", String(err), "notifId", item.notifId);
            }
        }

        $app.logger().info("push-delivery: done, delivered " + batchItems.length);

    } catch (err) {
        $app.logger().error("push-delivery: cron failed", "error", String(err));
        logError("push-delivery: cron failed", String(err));
    }
});
