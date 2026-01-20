import 'dotenv/config';

// INSTRUCTIONS
// npx tsx testingFile.js

// import { isPickupTomorrow, isDeliveryTomorrow, getOrderConstants } from './utils/notion_helper.js';
// import { runStabilityTestOrderDetails } from './utils/stability_tests.js';
import { createMessageFromOrders, createOrderStatusMessage, sendMessageToTelegramNotifications } from './utils/telegram_helper.js';
import { getKnifeCountForGroup, getOrderConstants, getOrderCountForGroup } from './utils/notion_helper.js';

// const orderConstants = await getOrderConstants();
// console.log(orderConstants);
//
// if (await isPickupTomorrow()) {
//   console.log('It is tomorrow');
// }
//
// if (await isDeliveryTomorrow()) {
//   console.log('It is tomorrow');
// }

// const { sharpenerMessage } = await createMessageFromOrders();
// sendMessageToTelegramNotifications(sharpenerMessage);
// sendMessageToTelegramNotifications(driverMessage);
// sendCollectionReminder();

console.log('[CRON] Running Order Constant Check at 9pm');
const message = await createOrderStatusMessage();
await sendMessageToTelegramNotifications(message);