import axios from 'axios';
import { getOrderConstants, getOrders, formatOrders, getOrderCountForGroup, getKnifeCountForGroup, isPickupTomorrow, isDeliveryTomorrow } from './notion_helper.js';

export const sendMessageToTelegramNotifications = async (message: string) => {
  await axios
    .post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        message_thread_id: process.env.TELEGRAM_THREAD_ID,
      },
    )
    .then(function() {
      console.log('telegram message successfully sent');
    })
    .catch(function(error) {
      console.log(error);
    });
};

export const createMessageFromOrders = async () => {
  const orderConstants = await getOrderConstants();
  const serviceGroup = orderConstants.serviceOrderGroup;
  const orders = await getOrders({ orderGroup: serviceGroup.orderGroupNumber });
  if (!orders || orders?.length === 0) {
    return {
      sharpenerMessage: `No message for sharpener`,
      driverMessage: `No message for driver`,
    };
  }

  const formattedOrders = formatOrders(orders);

  let sharpenerMessage;
  let driverMessage;

  sharpenerMessage = `
*Order Summary for ${serviceGroup.pickupDate} to ${serviceGroup.deliveryDate}*
    ${formattedOrders
      .map(
        (order) =>
          `
Order ${order.orderId.replace(`${serviceGroup.orderGroupNumber}O`, '')}:
${order.knives} x sharpen
${order.repairs} x repair
- ${order.sharpeningNote}
          `,
      )
      .join('')}
    `;
  driverMessage = `
*Drivers*

Drivers are using the dashboard.

Remember to assign them the orders in Notion, and then ask Sean to pay them this amount.

Pricing
Collection – $${orders.length * 8}
Return – $${orders.length * 8}
Total – $${orders.length * 16}
    `;

  return { sharpenerMessage, driverMessage };
};

type OrderInfo = {
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  knives: number;
  repairs: number;
  orderTotal: number;
};

export const createNewOrderNotificationMessage = (orderInfo: OrderInfo) => {
  const message = `
${orderInfo.orderNumber}: ${orderInfo.name} (${orderInfo.phone}) has placed an order.
- Address: ${orderInfo.address}
- Note: ${orderInfo.note}
- ${orderInfo.knives} x sharpen
- ${orderInfo.repairs} x repair
- Total: $${orderInfo.orderTotal}
  `

  return message;
};

export const createCollectionNotificationMessage = (orderId: string, imageUrl: string) => {
  const message = `
${orderId} has been collected.
- Image: ${imageUrl}
  `

  return message;
};

export const createDeliveryNotificationMessage = (orderId: string, imageUrl: string) => {
  const message = `
${orderId} has been delivered.
- Image: ${imageUrl}
  `

  return message;
};

export const createOrderStatusMessage = async () => {
  const orderConstants = await getOrderConstants();
  const bookingOrderCount = await getOrderCountForGroup(orderConstants.bookingOrderGroup.orderGroupNumber, false);
  const bookingKnifeCount = await getKnifeCountForGroup(orderConstants.bookingOrderGroup.orderGroupNumber, false);
  const serviceOrderCount = await getOrderCountForGroup(orderConstants.serviceOrderGroup.orderGroupNumber, false);
  const serviceKnifeCount = await getKnifeCountForGroup(orderConstants.serviceOrderGroup.orderGroupNumber, false);
  const pickupTomorrow = await isPickupTomorrow();
  const deliveryTomorrow = await isDeliveryTomorrow();

  const pickupIcon = pickupTomorrow ? '🟢' : '⚪';
  const deliveryIcon = deliveryTomorrow ? '🟢' : '⚪';

  return `📊 *Daily Order Status*
━━━━━━━━━━━━━━━━━━

📦 *Booking Group ${orderConstants.bookingOrderGroup.orderGroupNumber}*
├ Orders: ${bookingOrderCount}
├ Knives: ${bookingKnifeCount}
├ Pickup: ${orderConstants.bookingOrderGroup.pickupDate}
└ Delivery: ${orderConstants.bookingOrderGroup.deliveryDate}

🚚 *Service Group ${orderConstants.serviceOrderGroup.orderGroupNumber}*
├ Orders: ${serviceOrderCount}
├ Knives: ${serviceKnifeCount}
├ Pickup: ${orderConstants.serviceOrderGroup.pickupDate}
└ Delivery: ${orderConstants.serviceOrderGroup.deliveryDate}

━━━━━━━━━━━━━━━━━━
${pickupIcon} Pickup Tomorrow: ${pickupTomorrow ? 'Yes' : 'No'}
${deliveryIcon} Delivery Tomorrow: ${deliveryTomorrow ? 'Yes' : 'No'}`;
};

export const createBookingOrderGroupUpdatedMessage = async () => {
  const orderConstants = await getOrderConstants();
  const booking = orderConstants.bookingOrderGroup;

  return `📦 *Booking Order Group Updated*
━━━━━━━━━━━━━━━━━━

New booking group is now active:

*Group ${booking.orderGroupNumber}*
├ Pickup: ${booking.pickupDate}
└ Delivery: ${booking.deliveryDate}`;
};

export const createServiceOrderGroupUpdatedMessage = async () => {
  const orderConstants = await getOrderConstants();
  const service = orderConstants.serviceOrderGroup;

  return `🚚 *Service Order Group Updated*
━━━━━━━━━━━━━━━━━━

New service group is now active:

*Group ${service.orderGroupNumber}*
├ Pickup: ${service.pickupDate}
└ Delivery: ${service.deliveryDate}`;
};
