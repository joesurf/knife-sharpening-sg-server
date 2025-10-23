import 'dotenv/config';
import {
  sendMessageToTelegramNotifications,
  createMessageFromOrders,
} from './utils/telegram_helper.js';

const { sharpenerMessage, driverMessage } = await createMessageFromOrders();
sendMessageToTelegramNotifications(sharpenerMessage);
<<<<<<< HEAD
// sendMessageToTelegramNotifications(driverMessage);
//
// sean testing git 3
=======
sendMessageToTelegramNotifications(driverMessage);

// yoyoyo
>>>>>>> 4042d07 (sean yoyoyo)
