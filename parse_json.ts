import fs from 'fs';
import path from 'path';

const locales = ['ru', 'en', 'cn'];

locales.forEach(locale => {
  const commonPath = path.join(process.cwd(), `messages/${locale}/common.json`);
  if (!fs.existsSync(commonPath)) {
    console.log(`Skipping ${locale} - file not found`);
    return;
  }

  const raw = fs.readFileSync(commonPath, 'utf-8');
  const data = JSON.parse(raw);

  // Gathering all top-level keys
  const allKeys = Object.keys(data);

  const authKeys = ["auth", "onboarding"];
  const trainingKeys = ["training", "athleteForm", "readiness", "peaking"];
  const dashboardKeys = ["dashboard", "groups"];
  const settingsKeys = ["settings"];
  const analyticsKeys = ["analytics"];
  const referenceKeys = ["reference"];

  // Everything else goes to shared
  const handledKeys = [...authKeys, ...trainingKeys, ...dashboardKeys, ...settingsKeys, ...analyticsKeys, ...referenceKeys];
  const sharedKeys = allKeys.filter(k => !handledKeys.includes(k));

  const extract = (keys: string[]) => {
    const res: Record<string, unknown> = {};
    keys.forEach(k => {
      if (data[k] !== undefined) {
        res[k] = data[k];
      }
    });
    return res;
  };

  fs.writeFileSync(`messages/${locale}/shared.json`, JSON.stringify(extract(sharedKeys), null, 2));
  fs.writeFileSync(`messages/${locale}/auth.json`, JSON.stringify(extract(authKeys), null, 2));
  fs.writeFileSync(`messages/${locale}/training.json`, JSON.stringify(extract(trainingKeys), null, 2));
  fs.writeFileSync(`messages/${locale}/dashboard.json`, JSON.stringify(extract(dashboardKeys), null, 2));
  fs.writeFileSync(`messages/${locale}/settings.json`, JSON.stringify(extract(settingsKeys), null, 2));
  fs.writeFileSync(`messages/${locale}/analytics.json`, JSON.stringify(extract(analyticsKeys), null, 2));
  fs.writeFileSync(`messages/${locale}/reference.json`, JSON.stringify(extract(referenceKeys), null, 2));

  console.log(`Created chunks for ${locale}, total keys handled: ${allKeys.length}, shared keys: ${sharedKeys.length}`);
});
