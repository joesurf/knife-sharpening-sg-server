import { getOrderConstants, getOrders, formatOrders } from './notion_helper.js';
import { sendMessageToTelegramNotifications } from './telegram_helper.js';
export const runStabilityTestOrderDetails = async () => {
    console.log('Running stability test');
    const orderConstants = await getOrderConstants();
    const orders = await getOrders({ orderGroup: orderConstants.orderGroup, includeUrgent: false });
    if (!orders || orders?.length === 0) {
        console.log('No orders found');
        return;
    }
    const formattedOrders = formatOrders(orders);
    let message = '';
    let missingAddress = false;
    formattedOrders.forEach((order) => {
        if (order.address === 'NA') {
            missingAddress = true;
        }
    });
    if (missingAddress) {
        message = '🔴 We have a missing address';
    }
    else {
        message = '🟢 All addresses are present';
    }
    sendMessageToTelegramNotifications(message);
};
