// pb_hooks/ownership_integrity.pb.js
// Track 4.263 — Validates owner_type FK consistency for competitions

function validateOwnership(record) {
    const ownerType = record.get("owner_type");
    const seasonId = record.get("season_id");
    const athleteId = record.get("athlete_id");
    const groupId = record.get("group_id");

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
}

onRecordCreate((e) => {
    validateOwnership(e.record);
    e.next();
}, "competitions");

onRecordUpdate((e) => {
    validateOwnership(e.record);
    e.next();
}, "competitions");
