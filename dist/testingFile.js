import 'dotenv/config';
// import { isPickupTomorrow, isDeliveryTomorrow, getOrderConstants } from './utils/notion_helper.js';
import { runStabilityTestOrderDetails } from './utils/stability_tests.js';
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
// const { sharpenerMessage, driverMessage } = await createMessageFromOrders();
// sendMessageToTelegramNotifications(sharpenerMessage);
// sendMessageToTelegramNotifications(driverMessage);
// sendCollectionReminder();
runStabilityTestOrderDetails();
