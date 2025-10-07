import express from 'express';
import Stripe from 'stripe';
import { stringifyAddressObject } from '../utils/utils.js';

const router = express.Router();

const endpointSecret = process.env.STRIPE_SIGNING_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.get('/', (req, res, next) => {
  res.render('index', { title: 'Stripe' });
});

router.post('/', express.raw({type: 'application/json'}),  (req, res, next) => { 
  let event;

  // Make sure this is a Stripe event
  if (endpointSecret) {
    const signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`:warning: Webhook signature verification failed.`, err.message);
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
      console.log(`customerName: ${customerName}`);
      console.log(`customerPhone: ${customerPhone}`);
      console.log(`customerAddress: ${customerAddress}`);
      break;
  }

  res.json({ received: true });
});

export default router;
