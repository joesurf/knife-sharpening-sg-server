import express from 'express';
import { type Request } from 'express';
import {
  formatDate,
} from '../utils/utils.js';
import {
  getOrderConstants,
  updateNotionPagePickupOrder,
  getOrders,
} from '../utils/notion_helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Stripe' });
});

router.get('/get-order-constants', async (req, res) => {
  const orderConstants = await getOrderConstants();
  const formatted = {
    bookingOrderGroup: {
      ...orderConstants.bookingOrderGroup,
      pickupDate: formatDate(orderConstants.bookingOrderGroup.pickupDate),
      deliveryDate: formatDate(orderConstants.bookingOrderGroup.deliveryDate),
    },
    serviceOrderGroup: {
      ...orderConstants.serviceOrderGroup,
      pickupDate: formatDate(orderConstants.serviceOrderGroup.pickupDate),
      deliveryDate: formatDate(orderConstants.serviceOrderGroup.deliveryDate),
    },
  };
  res.json(formatted);
});

type PickupOrder = {
  pageId: string;
  position: number;
}

type UpdatePickupOrderRequest = {
  pickupOrder: PickupOrder[];
}

// eslint-disable-next-line
router.put('/update-pickup-order', async (req: Request<{}, {}, UpdatePickupOrderRequest>, res) => {
  const { pickupOrder } = req.body;
  await Promise.all(
    pickupOrder.map(order =>
      updateNotionPagePickupOrder(order.pageId, order.position)
    )
  );
  res.json({ received: true });
});

router.get('/get-orders', async (req, res) => {
  const { orderGroup, driverId, sharpenerId, includeUrgent = false } = req.query;
  const orders = await getOrders({
    orderGroup: Number(orderGroup),
    driverId: driverId?.toString(),
    sharpenerId: sharpenerId?.toString(),
    includeUrgent: Boolean(includeUrgent),
  });
  res.json(orders);
})

export default router;
