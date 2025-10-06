import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

const endpointSecret = process.env.STRIPE_SIGNING_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.get('/', (req, res, next) => {
  res.render('index', { title: 'Stripe' });
});

router.post('/', express.raw({type: 'application/json'}),  (req, res, next) => { 
  let event;
  if (endpointSecret) {
    // Get the signature sent by Stripe
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
      // The customer has completed the checkout flow.
      // You should create a new customer record in your database for them.
      console.log(`:moneybag: Checkout session completed: ${event.data.object.id}`);
      break;
  }

  res.json({ received: true });
});

export default router;
