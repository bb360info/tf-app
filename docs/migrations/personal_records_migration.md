# Personal Records (PR) Deprecation Migration

## 🛑 Deprecation Notice

We have officially transitioned from managing Personal Records inside the `personal_records` entity to dynamically projecting them using the `prProjectionService`.

The `personal_records` collection tracking is now legacy.

## Migration Steps

### PocketBase Database

As an administrator, follow these steps:

1. Locate the `personal_records` collection in your PocketBase instance.
2. It's safe to archive or directly drop this collection.

*Note: Due to our shift to projecting PRs directly from \`competitions.official_result\`, the \`personal_records\` historical data is no longer referenced by the App UI.*

### Data Consistency

All the legacy manual inputs for PR via 'Add Athlete' and 'Athlete Profile Settings' and 'Onboarding' have been wiped from UI.
You can't create or edit legacy PRs.

The UI relies fully on `getPRProjection` and `getPRTimeline` utilizing `official_result` of completed competitions.
