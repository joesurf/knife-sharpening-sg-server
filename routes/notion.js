import express from 'express';
import {
  formatDate,
} from '../utils/utils.js';
import {
  getOrderConstants,
  updateNotionPagePickupOrder,
} from '../utils/notion_helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Stripe' });
});

router.get('/get-order-constants', async (req, res) => {
  const orderConstants = await getOrderConstants();
  orderConstants.pickupDate = formatDate(orderConstants.pickupDate);
  orderConstants.deliveryDate = formatDate(orderConstants.deliveryDate);
  res.json(orderConstants);
});

router.put('/update-pickup-order', async (req, res) => {
  const pickupOrder = req.body.pickupOrder;
  await Promise.all(
    pickupOrder.map(order =>
      updateNotionPagePickupOrder(order.pageId, order.position)
    )
  );
  res.json({ received: true });
});

export default router;
