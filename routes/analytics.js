import express from 'express';
import { trackWhatsAppAnalytics } from '../utils/posthog_helper.js';
import { supabase } from '../utils/supabase_helper.js';

const router = express.Router();

/* Tracking WhatsApp Clicks Route */
router.post('/whatsapp-click', async (req, res) => {
  try {
    const { distinctId, origin, clickedAt } = req.body

    if (!distinctId || !clickedAt) {
      return res.status(400).json({ error: 'missing distinctId or clickedAt' })
    }

    const { error } = await supabase
      .from('whatsapp_clicks')
      .insert({
        distinct_id: distinctId,
        origin,
        clicked_at: clickedAt,
      })

    if (error) {
      console.error('Supabase insert error:', error)
      return res.status(500).json({ error: 'db insert error' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'server error' })
  }
});

/* Tracking Conversation Start Route */
router.post('/whatsapp-chat-started', async (req, res) => {
  try {
    // Find the latest WhatsApp click within 120 seconds
    const cutoffTime = new Date(Date.now() - 120 * 1000).toISOString();

    const { data: clickData, error: clickError } = await supabase
      .from('whatsapp_clicks')
      .select('*')
      .gte('clicked_at', cutoffTime)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clickError) {
      console.error('Supabase query error:', clickError);
      return res.status(500).json({ error: 'db query error' });
    }

    // Add matched click data to payload for analytics
    const enrichedPayload = {
      ...req.body,
      matchedClick: clickData || null
    };

    const result = await trackWhatsAppAnalytics('whatsapp_chat_started', enrichedPayload);

    if (result.success) {
      return res.sendStatus(result.statusCode);
    } else {
      return res.status(result.statusCode).json({ error: result.error });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
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
