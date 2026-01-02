import axios from 'axios';
import { getOrderConstants, getOrders, formatOrders } from './notion_helper.js';

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
  const orders = await getOrders({ orderGroup: orderConstants.orderGroup });
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
*Order Summary for ${orderConstants.pickupDate} to ${orderConstants.deliveryDate}*
    ${formattedOrders
      .map(
        (order) =>
          `
Order ${order.orderId.replace(`${orderConstants.orderGroup}O`, '')}:
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
};

export const createNewOrderNotificationMessage = (orderInfo: OrderInfo) => {
  const message = `
${orderInfo.orderNumber}: ${orderInfo.name} (${orderInfo.phone}) has placed an order.
- Address: ${orderInfo.address}
- Note: ${orderInfo.note}
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
