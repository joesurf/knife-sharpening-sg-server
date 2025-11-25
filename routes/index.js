import express from 'express';
import { posthog } from '../app.js';

const router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

/* Testing Route */
router.get('/test', (req, res, next) => {
  res.render('index', { title: 'Test' });
  console.log('test');
});

/* Tracking Conversation Start Route */
router.post('/analytics/whatsapp-chat-started', async (req, res) => {
  try {
    const payload = req.body;
    console.log("BotSpace Webhook Payload:", payload);

    // ---- 1. Extract phone number ----
    // Adjust this based on BotSpace webhook structure
    const phone =
      payload?.contact ||
      null;

    if (!phone) {
      console.error("❌ No phone found in BotSpace payload");
      return res.status(400).json({ error: "No phone number in payload" });
    }

    // ---- 2. Set distinctId ----
    const distinctId = phone; // stable unique ID

    // ---- 3. Send event to PostHog ----
    posthog.capture({
      distinctId: distinctId,
      event: 'whatsapp_chat_started',
      properties: {
        phone,
        raw_payload: payload, // optional, remove if too big
      },
    });

    console.log(`✅ Tracked whatsapp_chat_started for ${phone}`);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling BotSpace webhook:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
