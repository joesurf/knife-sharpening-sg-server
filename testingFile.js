import 'dotenv/config';
// import {
//   sendMessageToTelegramNotifications,
//   createMessageFromOrders,
// } from './utils/telegram_helper.js';

import { isPickupTomorrow, isDeliveryTomorrow } from './utils/notion_helper.js';

if (await isPickupTomorrow()) {
  console.log('It is tomorrow');
}

if (await isDeliveryTomorrow()) {
  console.log('It is tomorrow');
}

// const { sharpenerMessage, driverMessage } = await createMessageFromOrders();
// sendMessageToTelegramNotifications(sharpenerMessage);
// sendMessageToTelegramNotifications(driverMessage);
