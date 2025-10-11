import 'dotenv/config';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import indexRouter from './routes/index.js';
import botspaceRouter from './routes/botspace.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cron from 'node-cron';
import { sendFridayCollectionReminder } from './utils/botspace_helper.js';

const app = express();

// Recreate __dirname (not available by default in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));

// Has to be placed before express.json()
// Stripe needs the raw body instead of JSON
app.use('/botspace', express.raw({ type: 'application/json' }), botspaceRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

cron.schedule(
  '0 18 * * 5',
  () => {
    console.log('[CRON] Running Friday Collection Reminder at 6pm');
    sendFridayCollectionReminder();
  },
  {
    timezone: 'Asia/Singapore',
  },
);

// catch 404 and forward to error handler
app.use((req, res) => {
  next(createError(404));
});

// error handler
app.use((err, req, res) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

export default app;
