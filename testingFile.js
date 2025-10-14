import 'dotenv/config';
import {
  sendMessageToTelegramNotifications,
  createMessageFromOrders,
} from './utils/telegram_helper.js';

const { sharpenerMessage, driverMessage } = await createMessageFromOrders();
sendMessageToTelegramNotifications(sharpenerMessage);
sendMessageToTelegramNotifications(driverMessage);
