// Rate limit state module (shared via require() registry)
// PocketBase Goja: modules loaded via require() use a shared registry,
// so this state persists across requests.
//
// WARNING from PB docs: "mutations should be avoided when possible
// to prevent concurrency issues" — but for a simple counter this
// is acceptable (worst case: a few extra attempts slip through).

var state = {};

module.exports = {
    get: function (ip) {
        return state[ip] || null;
    },
    set: function (ip, entry) {
        state[ip] = entry;
    },
    cleanup: function (now) {
        var keys = Object.keys(state);
        for (var i = 0; i < keys.length; i++) {
            if (now > state[keys[i]].resetAt) {
                delete state[keys[i]];
            }
        }
    }
};
