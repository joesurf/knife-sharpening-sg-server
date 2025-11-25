import express from 'express';
import { trackWhatsAppAnalytics } from '../utils/posthog_helper.js';

const router = express.Router();

/* Tracking Conversation Start Route */
router.post('/whatsapp-chat-started', async (req, res) => {
  const result = await trackWhatsAppAnalytics('whatsapp_chat_started', req.body);

  if (result.success) {
    return res.sendStatus(result.statusCode);
  } else {
    return res.status(result.statusCode).json({ error: result.error });
  }
});

/* Tracking Order Request Route */
router.post('/whatsapp-chat-order-request', async (req, res) => {
  const result = await trackWhatsAppAnalytics('whatsapp_chat_order_request', req.body);

  if (result.success) {
    return res.sendStatus(result.statusCode);
  } else {
    return res.status(result.statusCode).json({ error: result.error });
  }
});

/* Tracking Order Conversion Route */
router.post('/whatsapp-chat-order-conversion', async (req, res) => {
  const result = await trackWhatsAppAnalytics('whatsapp_chat_order_conversion', req.body);

  if (result.success) {
    return res.sendStatus(result.statusCode);
  } else {
    return res.status(result.statusCode).json({ error: result.error });
  }
});

export default router;
