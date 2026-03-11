import {
  getOrderConstants,
  getOrders,
  getCustomers180DaysOld,
  updateNotionCustomer180DayFollowUp,
  clearNotionCustomerReminderDate,
  getCustomersWithReminderDates,
  getProspectsCreatedThisWeek,
  formatOrders,
} from './notion_helper.js';

const BOTSPACE_REMINDER_WEBHOOK_URL =
  'https://hook.bot.space/ZHVAL4hD99ef/v1/webhook/automation/68da50444ce0c3f496978e79/flow/68eff0c8bf1d5ae40860a005';

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

const sendCollectionReminder = async () => {
  const orderConstants = await getOrderConstants();
  const serviceGroup = orderConstants.serviceOrderGroup;
  const orders = await getOrders({ orderGroup: serviceGroup.orderGroupNumber, includeUrgent: false });
  const formattedOrders = formatOrders(orders);
  formattedOrders.forEach(async (order) => {
    const orderBody = {
      name: order.customerName,
      phone: order.whatsApp,
      timing: serviceGroup.timing,
      address: order.address,
      note: order.note,
      reminderType: 'collection',
    };
    await fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, orderBody);
  });
};

const sendDeliveryReminder = async () => {
  const orderConstants = await getOrderConstants();
  const serviceGroup = orderConstants.serviceOrderGroup;
  const orders = await getOrders({ orderGroup: serviceGroup.orderGroupNumber, includeUrgent: false });
  const formattedOrders = formatOrders(orders);
  formattedOrders.forEach(async (order) => {
    const orderBody = {
      name: order.customerName,
      phone: order.whatsApp,
      timing: serviceGroup.timing,
      address: order.address,
      note: order.note,
      reminderType: 'delivery',
    };
    await fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, orderBody);
  });
};

const send180DayReminder = async () => {
  const customers = await getCustomers180DaysOld();
  customers.forEach(async (customer) => {
    const customerBody = {
      id: customer.id,
      name: customer.properties['Name'].title[0].plain_text,
      phone: customer.properties['Phone'].phone_number.replaceAll(' ', ''),
      reminderType: 'oneeighty',
    }
    await fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, customerBody);
    await updateNotionCustomer180DayFollowUp(customerBody.id, true);
  })
};

const sendRequestedReminder = async () => {
  const customers = await getCustomersWithReminderDates();
  customers.forEach(async (customer) => {
    const customerBody = {
      id: customer.id,
      name: customer.properties['Name'].title[0].plain_text,
      phone: customer.properties['Phone'].phone_number.replaceAll(' ', ''),
      reminderType: 'request',
    }
    await fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, customerBody);
    await clearNotionCustomerReminderDate(customerBody.id);
  })
};

const sendProspectReminder = async () => {
  const prospects = await getProspectsCreatedThisWeek();
  prospects.forEach(async (prospect) => {
    const prospectBody = {
      id: prospect.id,
      name: prospect.properties['Name'].title[0].plain_text,
      phone: prospect.properties['Phone'].phone_number.replaceAll(' ', ''),
      reminderType: 'followup',
    };
    await fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, prospectBody);
  });
};

const sendCollectedMessage = async (orderId, imageUrl) => {
  const orderConstants = await getOrderConstants();
  const orders = await getOrders({ orderGroup: orderConstants.serviceOrderGroup.orderGroupNumber, includeUrgent: false });
  const customer = orders.find((order) => order.properties['ID'].title[0].text.content === orderId);
  console.log(customer);

  if (customer) {
    const customerBody = {
      id: customer.id,
      name: customer.properties['Customer Name'].rollup.array[0].title[0]
        .plain_text,
      phone: customer.properties[
        'Customer Phone'
      ].rollup.array[0].phone_number.replaceAll(' ', ''),
      imageUrl: imageUrl,
      reminderType: 'collected'
    }
    fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, customerBody);
  } else {
    console.log(`Unable to find customer with order ID ${orderId}`);
  }
};

const sendDeliveredMessage = async (orderId, imageUrl) => {
  const orderConstants = await getOrderConstants();
  const orders = await getOrders({ orderGroup: orderConstants.serviceOrderGroup.orderGroupNumber, includeUrgent: false });
  const customer = orders.find((order) => order.properties['ID'].title[0].text.content === orderId);
  console.log(customer);

  if (customer) {
    const customerBody = {
      id: customer.id,
      name: customer.properties['Customer Name'].rollup.array[0].title[0]
        .plain_text,
      phone: customer.properties[
        'Customer Phone'
      ].rollup.array[0].phone_number.replaceAll(' ', ''),
      imageUrl: imageUrl,
      reminderType: 'delivered'
    }
    fetchBotspace(BOTSPACE_REMINDER_WEBHOOK_URL, customerBody);
  } else {
    console.log(`Unable to find customer with order ID ${orderId}`);
  }
};

export {
  fetchBotspace,
  sendCollectionReminder,
  sendDeliveryReminder,
  send180DayReminder,
  sendRequestedReminder,
  sendProspectReminder,
  sendCollectedMessage,
  sendDeliveredMessage,
};
