import fs from 'fs';
import cron from 'node-cron';

for (const l of fs.readFileSync('.env','utf8').split('\n')) {
  const t=l.trim(); if(!t||t.startsWith('#')) continue;
  const i=t.indexOf('='); if(i<0) continue;
  process.env[t.slice(0,i)] = t.slice(i+1).trim();
}

const CRON_TARGET_URL = process.env.CRON_TARGET_URL!;
const CRON_SECRET = process.env.CRON_SECRET;

const runJob = async (job: string) => {
  if (!CRON_SECRET) { console.error(`[CRON] ${job} skipped: CRON_SECRET is not set`); return; }
  try {
    const res = await fetch(`${CRON_TARGET_URL}/api/cron/${job}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    console.log(`[CRON] ${job} -> ${res.status} ${await res.text()}`);
  } catch (err) { console.error(`[CRON] ${job} request failed`, err); }
};

console.log('registered every-minute schedule at', new Date().toISOString());
const task = cron.schedule('* * * * *', () => runJob('service-rollover'), { timezone: 'Asia/Singapore' });
setTimeout(() => { task.stop(); console.log('stopped at', new Date().toISOString()); process.exit(0); }, 70000);
