import 'dotenv/config';
import {
  sendMessageToTelegramNotifications,
  createMessageFromOrders,
} from './utils/telegram_helper.js';

import { isPickupTomorrow, isDeliveryTomorrow, getOrderConstants } from './utils/notion_helper.ts';

const orderConstants = await getOrderConstants();
console.log(orderConstants);

if (await isPickupTomorrow()) {
  console.log('It is tomorrow');
}

if (await isDeliveryTomorrow()) {
  console.log('It is tomorrow');
}

const { sharpenerMessage, driverMessage } = await createMessageFromOrders();
sendMessageToTelegramNotifications(sharpenerMessage);
sendMessageToTelegramNotifications(driverMessage);
