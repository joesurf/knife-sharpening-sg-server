import 'dotenv/config';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import indexRouter from './routes/index.js';
import notionRouter from './routes/notion.js';
import analyticsRouter from './routes/analytics.js';
import stripeRouter from './routes/stripe.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cron from 'node-cron';
import { PostHog } from 'posthog-node';
import type { ErrorRequestHandler } from "express";
import {
  send180DayReminder,
  sendCollectionReminder,
  sendDeliveryReminder,
  sendRequestedReminder,
  sendProspectReminder,
} from './utils/botspace_helper.js';
import {
  isBookingEnded,
  isDeliveryTomorrow,
  isPickupTomorrow,
  isServiceEnded,
  updateOrderConstantsToNextOrderGroup,
  updateServiceOrderConstantsToNextOrderGroup,
} from './utils/notion_helper.js';
import {
  createMessageFromOrders,
  createOrderStatusMessage,
  createBookingOrderGroupUpdatedMessage,
  createServiceOrderGroupUpdatedMessage,
  sendMessageToTelegramNotifications,
} from './utils/telegram_helper.js';
import { runStabilityTestOrderDetails } from './utils/stability_tests.js';

const app = express();

// Initialize PostHog
const posthog = new PostHog(
  process.env.POSTHOG_KEY || 'NA',
  { host: 'https://us.i.posthog.com' }
);

// Export posthog client so it can be used in routes
export { posthog };

// Recreate __dirname (not available by default in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(cors());

// Has to be placed before express.json()
// Stripe needs the raw body instead of JSON
app.use('/stripe', express.raw({ type: 'application/json' }), stripeRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/notion', notionRouter);
app.use('/analytics', analyticsRouter);

cron.schedule(
  '0 17 * * *',
  async () => {
    console.log('[CRON] Running Order Constant Check at 5pm');
    const message = await createOrderStatusMessage();
    await sendMessageToTelegramNotifications(message);
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '0 18 * * *',
  async () => {
    if (await isPickupTomorrow()) {
      console.log('[CRON] Running Pickup Reminder at 6pm');
      runStabilityTestOrderDetails();
      sendCollectionReminder();
    }
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '15 18 * * *',
  async () => {
    if (await isPickupTomorrow()) {
      console.log(
        '[CRON] Generating Order Messages for Sharpener & Driver at 6.15pm',
      );
      const { sharpenerMessage, driverMessage } =
        await createMessageFromOrders();
      sendMessageToTelegramNotifications(sharpenerMessage);
      sendMessageToTelegramNotifications(driverMessage);
    }
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '0 18 * * *',
  async () => {
    if (await isDeliveryTomorrow()) {
      console.log('[CRON] Running Delivery Reminder at 6pm');
      sendDeliveryReminder();
    }
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '0 20 * * 3',
  async () => {
    console.log(
      '[CRON] Running Wednesday 180 Day, Requested at 8pm',
    );
    send180DayReminder();
    sendRequestedReminder();
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '0 20 * * 4',
  async () => {
    console.log(
      '[CRON] Running Thursday at 8pm',
    );
    sendProspectReminder();
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '30 18 * * *',
  async () => {
    console.log('[CRON] Running Booking Order Status Update at 6.30pm');
    if (await isBookingEnded()) {
      await updateOrderConstantsToNextOrderGroup();
      const message = await createBookingOrderGroupUpdatedMessage();
      await sendMessageToTelegramNotifications(message);
    }
  },
  {
    timezone: 'Asia/Singapore',
  },
);

cron.schedule(
  '0 16 * * *',
  async () => {
    console.log('[CRON] Running Service Order Status Update at 4pm');
    if (await isServiceEnded()) {
      await updateServiceOrderConstantsToNextOrderGroup();
      const message = await createServiceOrderGroupUpdatedMessage();
      await sendMessageToTelegramNotifications(message);
    }
  },
  {
    timezone: 'Asia/Singapore',
  },
);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  void _next;
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status((err).status || 500);
  res.render("error");
};

app.use(errorHandler);

export default app;
