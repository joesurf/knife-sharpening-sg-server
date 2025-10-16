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
  getNotionCustomerIdByPhone,
  updateNotionCustomerAddress,
  updateNotionCustomer180DayFollowUp,
  clearNotionCustomerReminderDate,
} from '../utils/notion_helper.js';
import { fetchBotspace } from '../utils/botspace_helper.js';

const router = express.Router();

const endpointSecret = process.env.STRIPE_SIGNING_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BOTSPACE_NEW_ORDER_WEBHOOK_URL =
  'https://hook.bot.space/ZHVAL4hD99ef/v1/webhook/automation/68da50444ce0c3f496978e79/flow/68e4cbdbbf1d5ae408c5657d';

router.get('/', (req, res) => {
  res.render('index', { title: 'Stripe' });
});

router.get('/getOrderConstants', async (req, res) => {
  const orderConstants = await getOrderConstants();
  orderConstants.pickupDate = formatDate(orderConstants.pickupDate);
  orderConstants.deliveryDate = formatDate(orderConstants.deliveryDate);
  res.json(orderConstants);
});

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;

    // Make sure this is a Stripe event
    if (endpointSecret) {
      const signature = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret,
        );
      } catch (err) {
        console.log(
          `:warning: Webhook signature verification failed.`,
          err.message,
        );
        return res.sendStatus(400);
      }
    }

    switch (event.type) {
      case 'checkout.session.completed':
        console.log(event);
        const eventData = event.data.object;
        const customerData = eventData.customer_details;
        const customerPhone = customerData.phone.replaceAll(' ', '');
        const customerName = customerData.name;
        const customerAddress = stringifyAddressObject(customerData.address);
        const additionalInstructions =
          eventData.custom_fields.find(
            (field) => field.key === 'additional_instructions',
          )?.text?.value || 'NA';
        const orderData = eventData.metadata;
        const orderKnives = orderData?.knives || 0;
        const orderRepairs = orderData?.repairs || 0;
        const orderTotal = eventData?.amount_total / 100;
        const orderConstants = await getOrderConstants();
        const formattedPickupDate = formatDate(orderConstants.pickupDate);
        const formattedDeliveryDate = formatDate(orderConstants.deliveryDate);

        const customerBody = {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
        };

        let customerId = await getNotionCustomerIdByPhone(customerPhone);

        if (customerId) {
          await updateNotionCustomerAddress(customerId, customerBody.address);
          await updateNotionCustomer180DayFollowUp(customerId, false);
          await clearNotionCustomerReminderDate(customerId);
        } else {
          const customer = await insertNotionCustomer(customerBody);
          customerId = customer.id;
        }

        const orderBody = {
          knives: parseInt(orderKnives),
          repairs: parseInt(orderRepairs),
          orderTotal: parseFloat(orderTotal),
          orderTotal: orderTotal,
          note: additionalInstructions,
          customerId: customerId,
          orderGroup: orderConstants.orderGroup,
          currentOrder: orderConstants.currentOrder,
          pickupDate: orderConstants.pickupDate,
          deliveryDate: orderConstants.deliveryDate,
        };
        await insertNotionOrder(orderBody);

        const botspaceBody = {
          name: customerName,
          phone: customerPhone.replaceAll(' ', ''),
          address: customerAddress,
          note: additionalInstructions,
          orderNumber: getNewOrderNumber(
            orderConstants.orderGroup,
            orderConstants.currentOrder,
          ),
          pickupDate: formattedPickupDate,
          deliveryDate: formattedDeliveryDate,
          timing: orderConstants.timing,
        };
        await fetchBotspace(BOTSPACE_NEW_ORDER_WEBHOOK_URL, botspaceBody);

        break;
    }

    res.json({ received: true });
  },
);

export default router;
