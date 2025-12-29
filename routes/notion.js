import express from 'express';
import {
  formatDate,
} from '../utils/utils.js';
import {
  getOrderConstants,
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


export default router;
