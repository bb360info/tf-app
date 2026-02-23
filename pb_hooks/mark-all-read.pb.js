
/**
 * pb_hooks/mark-all-read.pb.js
 *
 * Custom endpoint: POST /api/custom/mark-all-read
 *
 * Marks all unread notifications as read for the authenticated user.
 * Uses PB findRecordsByFilter + save loop.
 *
 * Auth: requires valid user token (enforced by $apis.requireAuth())
 * Response: { ok: true, updated: <count> }
 */

routerAdd("POST", "/api/custom/mark-all-read", (e) => {
    const userId = e.auth.id;

    try {
        // Find all unread notifications for this user
        const unread = $app.findRecordsByFilter(
            "notifications",
            "user_id = {:uid} && read = false",
            "-created",
            0, // no limit
            0, // no offset
            { uid: userId }
        );

        let updated = 0;
        for (const notif of unread) {
            notif.set("read", true);
            $app.save(notif);
            updated++;
        }

        return e.json(200, { ok: true, updated });
    } catch (err) {
        $app.logger().error("mark-all-read: failed", "userId", userId, "error", String(err));
        return e.json(500, { error: "Internal Server Error" });
    }
}, $apis.requireAuth());
