import { posthog } from '../app.js';

/**
 * Track WhatsApp chat started event
 * @param {Object} payload - The BotSpace webhook payload
 * @returns {Object} - Result object with success status and data/error
 */
export async function trackWhatsAppAnalytics(event_name, payload) {
  try {
    console.log("Webhook Payload:", payload);

    const phone = payload?.contact || null;

    if (!phone) {
      console.error("L No phone found in BotSpace payload");
      return {
        success: false,
        error: "No phone number in payload",
        statusCode: 400
      };
    }

    const distinctId = phone;

    // If we have a matched click with a PostHog ID, alias them together
    if (payload?.matchedClick?.distinct_id) {
      const posthogId = payload.matchedClick.distinct_id;

      posthog.alias({
        distinctId: phone,
        alias: posthogId,
      });

      console.log(`Aliased PostHog ID ${posthogId} with phone ${phone}`);
    }

    posthog.capture({
      distinctId: distinctId,
      event: event_name,
      properties: {
        phone,
        raw_payload: payload,
      },
    });

    console.log(`Tracked ${event_name} for ${phone}`);

    return {
      success: true,
      statusCode: 200
    };
  } catch (err) {
    console.error("L Error handling BotSpace webhook:", err);
    return {
      success: false,
      error: "Server error",
      statusCode: 500
    };
  }
}
