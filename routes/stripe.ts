import express from 'express';
import Stripe from 'stripe';
import {
  stringifyAddressObject,
  getNewOrderNumber,
  formatDate,
} from '../utils/utils.js';
import {
  insertNotionCustomer,
  insertNotionOrder,
  getOrderConstants,
  getOrderCountForGroup,
  getNotionCustomerIdByPhone,
  updateNotionCustomerAddress,
  updateNotionCustomerName,
  updateNotionCustomer180DayFollowUp,
  clearNotionCustomerReminderDate,
} from '../utils/notion_helper.js';
import { fetchBotspace } from '../utils/botspace_helper.js';
import { createNewOrderNotificationMessage, sendMessageToTelegramNotifications } from '../utils/telegram_helper.js';

const router = express.Router();

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  { name, email, phone }: { name: string; email: string; phone: string },
): Promise<string | null> {
  const existing = await stripe.customers.search({
    query: `phone:'${phone}'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({ name, email, phone });
  return customer.id;
}

const endpointSecret = process.env.STRIPE_SIGNING_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'NA');
const BOTSPACE_NEW_ORDER_WEBHOOK_URL = 'https://hook.bot.space/ZHVAL4hD99ef/v1/webhook/automation/68da50444ce0c3f496978e79/flow/68e4cbdbbf1d5ae408c5657d'

router.post(
  '/new-order',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;

    // Make sure this is a Stripe event
    if (endpointSecret) {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.sendStatus(400);
      }

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret,
        );
      } catch (err) {
        console.log(
          `:warning: Webhook signature verification failed.`,
          err
        );
        return res.sendStatus(400);
      }
    }

    if (!event) {
      return res.sendStatus(400);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        console.log(event);
        const eventData = event.data.object;
        const customerData = eventData.customer_details;

        if (!customerData || !customerData.phone || !customerData.name || !customerData.address || !eventData.amount_total) {
          return res.sendStatus(400);
        }
        const customerPhone = customerData.phone.replaceAll(' ', '');
        const customerName = customerData.name;

        const addressToStringify = {
          line1: customerData.address.line1 || '',
          line2: customerData.address.line2 || '',
          postal_code: customerData.address.postal_code || '',
        };

        const customerAddress = stringifyAddressObject(addressToStringify);
        const additionalInstructions =
          eventData.custom_fields.find(
            (field) => field.key === 'additional_instructions',
          )?.text?.value || 'NA';
        const sharpeningNote = 'NA';
        const orderData = eventData.metadata;
        const orderKnives = orderData?.knives || '0';
        const orderRepairs = orderData?.repairs || '0';
        const orderCustom = orderData?.custom || '0';
        const orderGroup = orderData?.orderGroup || '0';
        const orderTotal = eventData?.amount_total / 100;
        const orderConstants = await getOrderConstants();
        const bookingGroup = orderConstants.bookingOrderGroupArray.find(group => group.orderGroupNumber === Number(orderGroup)) || orderConstants.bookingOrderGroup;
        const currentOrderCount = await getOrderCountForGroup(bookingGroup.orderGroupNumber);
        const formattedPickupDate = formatDate(bookingGroup.pickupDate);
        const formattedDeliveryDate = formatDate(bookingGroup.deliveryDate);

        // If the order is custom, we don't want to create a new order
        if (Number(orderCustom) > 0) {
          break;
        }

        const customerBody = {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
        };

        let customerId = await getNotionCustomerIdByPhone(customerPhone);

        if (customerId) {
          await updateNotionCustomerAddress(customerId, customerBody.address);
          await updateNotionCustomerName(customerId, customerBody.name);
          await updateNotionCustomer180DayFollowUp(customerId, false);
          await clearNotionCustomerReminderDate(customerId);
        } else {
          const customer = await insertNotionCustomer(customerBody);
          if (!customer) {
            return res.sendStatus(400);
          }
          customerId = customer.id;
        }

        const paymentIntentId = eventData.payment_intent as string | null;

        (async () => {
          try {
            const stripeCustomerId =
              (await getOrCreateStripeCustomer(stripe, {
                name: customerName,
                email: customerData.email ?? '',
                phone: customerPhone,
              }));

            if (stripeCustomerId && paymentIntentId) {
              await stripe.paymentIntents.update(paymentIntentId, {
                customer: stripeCustomerId,
              });
            }
          } catch (err) {
            console.error('Stripe customer association failed:', err);
          }
        })();

        const orderBody = {
          knives: parseInt(orderKnives),
          repairs: parseInt(orderRepairs),
          orderTotal: orderTotal,
          note: additionalInstructions,
          sharpeningNote: sharpeningNote,
          customerId: customerId,
          orderGroup: bookingGroup.orderGroupNumber,
          currentOrder: currentOrderCount,
          pickupDate: bookingGroup.pickupDate,
          deliveryDate: bookingGroup.deliveryDate,
        };
        await insertNotionOrder(orderBody);

        const botspaceBody = {
          name: customerName,
          phone: customerPhone.replaceAll(' ', ''),
          address: customerAddress,
          note: additionalInstructions,
          orderNumber: getNewOrderNumber(
            bookingGroup.orderGroupNumber,
            currentOrderCount,
          ),
          pickupDate: formattedPickupDate,
          deliveryDate: formattedDeliveryDate,
          timing: bookingGroup.timing,
          knives: parseInt(orderKnives),
          repairs: parseInt(orderRepairs),
          orderTotal: orderTotal,
        };
        await fetchBotspace(BOTSPACE_NEW_ORDER_WEBHOOK_URL, botspaceBody);

        const newOrderNotification = createNewOrderNotificationMessage(botspaceBody);
        await sendMessageToTelegramNotifications(newOrderNotification);

        break;

      }
    }

    res.json({ received: true });
  },
);

export default router;
