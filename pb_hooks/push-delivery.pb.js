
/**
 * pb_hooks/push-delivery.pb.js
 *
 * Cron: every 60 seconds — deliver undelivered notifications via CF Worker.
 *
 * Flow:
 *   1. SELECT notifications WHERE delivered=false LIMIT 50
 *   2. For each: get push_subscriptions for user_id + check quiet_hours
 *   3. Batch single $http.send() to CF Worker /push-batch
 *   4. CF Worker 200 → mark delivered=true
 *   5. CF Worker 410 → delete stale push_subscription
 *   6. Other errors → log to error_logs collection
 */

const PUSH_WORKER_URL = $os.getenv("PUSH_WORKER_URL") || "https://push.jumpedia.app";
const PUSH_WORKER_SECRET = $os.getenv("PUSH_WORKER_SECRET");

/** Check if current time falls within user's quiet hours (IANA timezone-aware) */
function isQuietHours(prefs) {
    try {
        const tz = prefs.getString("timezone") || "UTC";
        const start = prefs.getString("quiet_hours_start"); // "HH:MM"
        const end = prefs.getString("quiet_hours_end");     // "HH:MM"
        if (!start || !end) return false;

        // Get current hour:minute in user's timezone using JS Date
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const [hourStr, minStr] = formatter.format(now).split(":");
        const currentMinutes = parseInt(hourStr) * 60 + parseInt(minStr);

        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        if (startMinutes <= endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        } else {
            // Overnight quiet hours (e.g., 22:00 → 07:00)
            return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        }
    } catch {
        return false;
    }
}

/** Log error to error_logs collection (non-blocking) */
function logError(message, details) {
    try {
        const collection = $app.findCollectionByNameOrId("error_logs");
        const errRecord = new Record(collection, {
            error: message,
            stack: typeof details === "string" ? details : JSON.stringify(details),
            url: "pb_hooks/push-delivery.pb.js",
        });
        $app.save(errRecord);
    } catch {
        $app.logger().error("push-delivery: failed to log error", "msg", message);
    }
}

cronAdd("push-delivery", "* * * * *", () => {
    if (!PUSH_WORKER_SECRET) {
        $app.logger().warn("push-delivery: PUSH_WORKER_SECRET not set, skipping");
        return;
    }

    try {
        // 1. Fetch undelivered notifications (LIMIT 50 to avoid burst)
        const undelivered = $app.findAllRecords("notifications",
            $app.pbql("delivered = false"),
            "-created",
            50
        );

        if (undelivered.length === 0) return;

        // 2. Build batch payload grouped by notification
        const batchItems = [];
        const notifIds = []; // track ids for marking delivered

        for (const notif of undelivered) {
            const userId = notif.getString("user_id");

            // Get user's notification preferences
            let prefs = null;
            try {
                prefs = $app.findFirstRecordByFilter(
                    "notification_preferences",
                    $app.pbql("user_id = {:uid}", { uid: userId })
                );
            } catch { /* no prefs = use defaults */ }

            // Check push_enabled
            if (prefs && !prefs.getBool("push_enabled")) {
                // Mark as delivered (user has push disabled — won't get it anyway)
                notif.set("delivered", true);
                $app.save(notif);
                continue;
            }

            // Check disabled_types
            if (prefs) {
                const disabledTypes = prefs.getStringSlice("disabled_types");
                if (disabledTypes.includes(notif.getString("type"))) {
                    notif.set("delivered", true);
                    $app.save(notif);
                    continue;
                }
            }

            // Check quiet hours
            if (prefs && isQuietHours(prefs)) {
                // Skip this Cron cycle — will retry next minute
                continue;
            }

            // Fetch push subscriptions for this user
            let subscriptions = [];
            try {
                subscriptions = $app.findAllRecords("push_subscriptions",
                    $app.pbql("user_id = {:uid}", { uid: userId })
                );
            } catch { continue; }

            if (subscriptions.length === 0) {
                // No device subscribed — mark delivered so we don't retry forever
                notif.set("delivered", true);
                $app.save(notif);
                continue;
            }

            const subPayloads = subscriptions.map((sub) => ({
                id: sub.getId(), // store for 410 cleanup
                endpoint: sub.getString("endpoint"),
                keys: {
                    p256dh: sub.getString("p256dh"),
                    auth: sub.getString("auth_key"),
                },
            }));

            batchItems.push({
                notifId: notif.getId(),
                payload: {
                    title: notif.getString("type").replace("_", " ").toUpperCase(),
                    body: notif.getString("message"),
                    link: notif.getString("link") || "/",
                    priority: notif.getString("priority") || "normal",
                },
                subscriptions: subPayloads,
            });

            notifIds.push(notif.getId());
        }

        if (batchItems.length === 0) return;

        // 3. Send batch to CF Worker
        const response = $http.send({
            method: "POST",
            url: `${PUSH_WORKER_URL}/push-batch`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${PUSH_WORKER_SECRET}`,
            },
            body: JSON.stringify({ notifications: batchItems.map((i) => ({ payload: i.payload, subscriptions: i.subscriptions })) }),
            timeout: 30,
        });

        if (response.statusCode !== 200) {
            logError(
                `push-delivery: CF Worker returned ${response.statusCode}`,
                response.raw || ""
            );
            return;
        }

        // 4. Process per-subscription results
        const results = JSON.parse(response.raw).results || [];
        const staleEndpoints = new Set(
            results.filter((r) => r.status === 410).map((r) => r.endpoint)
        );
        const failedEndpoints = new Set(
            results.filter((r) => r.status !== 200 && r.status !== 410).map((r) => r.endpoint)
        );

        if (failedEndpoints.size > 0) {
            logError(
                `push-delivery: ${failedEndpoints.size} subscriptions failed`,
                Array.from(failedEndpoints).join(", ")
            );
        }

        // 5. Delete stale subscriptions (410 Gone)
        for (const item of batchItems) {
            for (const sub of item.subscriptions) {
                if (staleEndpoints.has(sub.endpoint)) {
                    try {
                        const staleSub = $app.findRecordById("push_subscriptions", sub.id);
                        if (staleSub) $app.delete(staleSub);
                    } catch (err) {
                        $app.logger().error("push-delivery: delete stale sub", "error", String(err));
                    }
                }
            }
        }

        // 6. Mark delivered=true for successfully sent notifications
        for (const item of batchItems) {
            const allFailed = item.subscriptions.every((s) => failedEndpoints.has(s.endpoint));
            if (!allFailed) {
                try {
                    const notif = $app.findRecordById("notifications", item.notifId);
                    if (notif) {
                        notif.set("delivered", true);
                        $app.save(notif);
                    }
                } catch (err) {
                    $app.logger().error("push-delivery: mark delivered", "error", String(err));
                }
            }
        }

    } catch (err) {
        logError("push-delivery: cron failed", String(err));
    }
});
