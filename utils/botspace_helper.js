import { getOrderConstants, getOrders } from './notion_helper.js';

const BOTSPACE_COLLECTION_WEBHOOK_URL =
  'https://hook.bot.space/ZHVAL4hD99ef/v1/webhook/automation/68da50444ce0c3f496978e79/flow/68e8a0a0f881d90a0c73f941';

const fetchBotspace = (url, body) => {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Success:', data);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
};

const sendFridayCollectionReminder = async () => {
  const orderConstants = await getOrderConstants();
  const timing = orderConstants.timing;
  const orders = await getOrders(orderConstants.orderGroup, false);
  orders.forEach(async (order) => {
    const orderBody = {
      name: order.properties['Customer Name'].rollup.array[0].title[0]
        .plain_text,
      phone: order.properties[
        'Customer Phone'
      ].rollup.array[0].phone_number.replaceAll(' ', ''),
      timing: timing,
    };
    await fetchBotspace(BOTSPACE_COLLECTION_WEBHOOK_URL, orderBody);
  });
};

export { fetchBotspace, sendFridayCollectionReminder };
