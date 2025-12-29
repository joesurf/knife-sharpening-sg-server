import axios from 'axios';
import { getOrderConstants, getOrders } from './notion_helper.ts';

export const sendMessageToTelegramNotifications = async (message) => {
  await axios
    .post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        message_thread_id: process.env.TELEGRAM_THREAD_ID,
      },
    )
    .then(function(response) {
      console.log('telegram message successfully sent');
    })
    .catch(function(error) {
      console.log(error);
    });
};

export const createMessageFromOrders = async () => {
  const orderConstants = await getOrderConstants();
  const orders = await getOrders({ orderGroup: orderConstants.orderGroup });

  let sharpenerMessage;
  let driverMessage;

  if (orders.length === 0) {
    sharpenerMessage = `No message for sharpener`;
    driverMessage = `No message for driver`;
  } else {
    sharpenerMessage = `
*Order Summary for ${orderConstants.pickupDate} to ${orderConstants.deliveryDate}*
    ${orders
        .map(
          (order) =>
            `
Order ${order.properties.ID.title[0].text.content.replace(`${orderConstants.orderGroup}O`, '')}:
${order.properties.Knifes.number} x sharpen
${order.properties.Repairs.number} x repair
- ${order.properties['Sharpening Note'].rich_text[0]?.plain_text || 'NA'}
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
  }

  return { sharpenerMessage, driverMessage };
};

export const createNewOrderNotificationMessage = (orderInfo) => {
  const message = `
${orderInfo.orderNumber}: ${orderInfo.name} (${orderInfo.phone}) has placed an order.
- Address: ${orderInfo.address}
- Note: ${orderInfo.note}
  `

  return message;
};

export const createCollectionNotificationMessage = (orderId, imageUrl) => {
  const message = `
${orderId} has been collected.
- Image: ${imageUrl}
  `

  return message;
};

export const createDeliveryNotificationMessage = (orderId, imageUrl) => {
  const message = `
${orderId} has been delivered.
- Image: ${imageUrl}
  `

  return message;
};
