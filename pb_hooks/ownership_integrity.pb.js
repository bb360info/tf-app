// pb_hooks/ownership_integrity.pb.js
// Track 4.263 — Validates owner_type FK consistency for competitions
//
// NOTE: Validation is inlined in each handler because PocketBase JSVM
// has handler-scope limitations with top-level function references.

onRecordCreate((e) => {
    const ownerType = e.record.get("owner_type");
    const seasonId = e.record.get("season_id");
    const athleteId = e.record.get("athlete_id");
    const groupId = e.record.get("group_id");

    if (!ownerType) {
        throw new BadRequestError("owner_type is required");
    }
    if (ownerType === "season" && !seasonId) {
        throw new BadRequestError("season_id is required when owner_type='season'");
    }
    if (ownerType === "athlete" && !athleteId) {
        throw new BadRequestError("athlete_id is required when owner_type='athlete'");
    }
    if (ownerType === "group" && !groupId) {
        throw new BadRequestError("group_id is required when owner_type='group'");
    }

    e.next();
}, "competitions");

onRecordUpdate((e) => {
    const ownerType = e.record.get("owner_type");
    const seasonId = e.record.get("season_id");
    const athleteId = e.record.get("athlete_id");
    const groupId = e.record.get("group_id");

    if (!ownerType) {
        throw new BadRequestError("owner_type is required");
    }
    if (ownerType === "season" && !seasonId) {
        throw new BadRequestError("season_id is required when owner_type='season'");
    }
    if (ownerType === "athlete" && !athleteId) {
        throw new BadRequestError("athlete_id is required when owner_type='athlete'");
    }
    if (ownerType === "group" && !groupId) {
        throw new BadRequestError("group_id is required when owner_type='group'");
    }

    e.next();
}, "competitions");
