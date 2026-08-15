import 'dotenv/config';
import express from 'express';
import logger from 'morgan';
import cron from 'node-cron';

/**
 * Scheduler only.
 *
 * All HTTP endpoints (notion, analytics, stripe, picture uploads) and the
 * business logic behind them now live in the Next app. This process exists
 * purely to fire the cron schedules, which post to /api/cron/<job>. The job
 * endpoints own their own guards (isPickupTomorrow, isBookingEnded, ...).
 */
const app = express();

app.use(logger('dev'));

// Health check so the droplet/uptime monitor has something to hit.
app.get('/', (req, res) => {
  res.json({ ok: true, role: 'cron-scheduler', target: CRON_TARGET_URL });
});

const CRON_TARGET_URL =
  process.env.CRON_TARGET_URL || 'https://www.knifesharpening.sg';
const CRON_SECRET = process.env.CRON_SECRET;

const runJob = async (job: string) => {
  if (!CRON_SECRET) {
    console.error(`[CRON] ${job} skipped: CRON_SECRET is not set`);
    return;
  }

  try {
    const res = await fetch(`${CRON_TARGET_URL}/api/cron/${job}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = await res.text();
    console.log(`[CRON] ${job} -> ${res.status} ${body}`);
  } catch (err) {
    console.error(`[CRON] ${job} request failed`, err);
  }
};

const sg = { timezone: 'Asia/Singapore' } as const;

// 5pm  - daily order status to Telegram
cron.schedule('0 17 * * *', () => runJob('order-status'), sg);

// 6pm  - pickup reminders (no-op unless pickup is tomorrow)
cron.schedule('0 18 * * *', () => runJob('pickup-reminder'), sg);

// 6.15pm - sharpener + driver messages (no-op unless pickup is tomorrow)
cron.schedule('15 18 * * *', () => runJob('order-messages'), sg);

// 6pm  - delivery reminders (no-op unless delivery is tomorrow)
cron.schedule('0 18 * * *', () => runJob('delivery-reminder'), sg);

// Wed 8pm - 180 day + requested reminders
cron.schedule('0 20 * * 3', () => runJob('weekly-reminders'), sg);

// Thu 8pm - prospect follow-ups
cron.schedule('0 20 * * 4', () => runJob('prospect-reminder'), sg);

// 6.30pm - roll booking group forward once booking has ended
cron.schedule('30 18 * * *', () => runJob('booking-rollover'), sg);

// 4pm  - roll service group forward once service has ended
cron.schedule('0 16 * * *', () => runJob('service-rollover'), sg);

console.log(`[CRON] scheduler started, target ${CRON_TARGET_URL}`);

export default app;
