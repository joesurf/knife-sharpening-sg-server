import express from 'express';
import Stripe from 'stripe';
import {
  stringifyAddressObject,
  fetchBotspace,
  getNewOrderNumber,
} from '../utils/utils.js';
import {
  insertNotionCustomer,
  insertNotionOrder,
  getOrderConstants,
} from '../utils/notion_helper.js';
import { parseISO, format } from 'date-fns';

const router = express.Router();

const endpointSecret = process.env.STRIPE_SIGNING_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const botspaceNewOrderWebhookUrl = process.env.BOTSPACE_NEW_ORDER_WEBHOOK_URL;

router.get('/', (req, res) => {
  res.render('index', { title: 'Stripe' });
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
        const eventData = event.data.object;
        const customerData = eventData.customer_details;
        const customerPhone = customerData.phone;
        const customerName = customerData.name;
        const customerAddress = stringifyAddressObject(customerData.address);
        const additionalInstructions =
          eventData.custom_fields.find(
            (field) => field.key === 'additionalinstructions',
          )?.text?.value || 'NA';
        const orderData = eventData.metadata;
        const orderKnives = orderData?.knives || 0;
        const orderRepairs = orderData?.repairs || 0;
        const orderTotal = eventData?.amount_total / 100;
        const orderConstants = await getOrderConstants();

        const customerBody = {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
        };
        const customer = await insertNotionCustomer(customerBody);

        const orderBody = {
          knives: parseInt(orderKnives),
          repairs: parseInt(orderRepairs),
          orderTotal: parseFloat(orderTotal),
          orderTotal: orderTotal,
          note: additionalInstructions,
          customerId: customer.id,
          orderGroup: orderConstants.orderGroup,
          currentOrder: orderConstants.currentOrder,
          pickupDate: orderConstants.pickupDate,
          deliveryDate: orderConstants.deliveryDate,
        };
        await insertNotionOrder(orderBody);

        const formattedPickupDate = format(
          parseISO(orderConstants.pickupDate),
          'd MMMM',
        );
        const formattedDeliveryDate = format(
          parseISO(orderConstants.deliveryDate),
          'd MMMM',
        );

        const botspaceBody = {
          name: customerName,
          phone: customerPhone,
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

        await fetchBotspace(botspaceNewOrderWebhookUrl, botspaceBody);

        break;
    }

    res.json({ received: true });
  },
);

export default router;
