import { Client } from '@notionhq/client';
import { getNewOrderNumber } from './utils.js';
import { parseISO, addWeeks, addDays, format } from 'date-fns';
import { type QueryDataSourceResponse, type PageObjectResponse } from "@notionhq/client"

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const ORDER_CONSTANTS_DATASOURCE_ID = '286b653f-dfd3-800c-adf4-000b46bcc393';
const ORDERS_DATASOURCE_ID = '9c015ed7-2d42-4689-b036-794ac2ba6295';
const CUSTOMERS_DATASOURCE_ID = 'e4dcf0cf-c09d-4917-9d2a-b7e1eaedf976';
const ORDER_CONSTANTS_PAGE_ID = '286b653fdfd380c7a11bc46af8d61357';

export function getTextFromNotionProperty(property: PageObjectResponse['properties']['string']) {
  const propertyType = property.type;

  if (propertyType === 'title') {
    return property.title[0].plain_text
  } else if (propertyType === 'rich_text') {
    return property.rich_text[0].plain_text
  } else if (propertyType === 'rollup') {
    const rollupType = property.rollup.type;

    if (rollupType === 'array') {
      if (property.rollup.array.length === 0) {
        return '';
      }

      const arrayType = property.rollup.array[0].type;

      if (arrayType === 'title') {
        return property.rollup.array[0].title[0].plain_text;
      }

      if (arrayType === 'phone_number') {
        return property.rollup.array[0].phone_number;
      }

      if (arrayType === 'rich_text') {
        return property.rollup.array[0].rich_text[0].plain_text;
      }
    }
  } else if (propertyType === 'checkbox') {
    return property.checkbox.toString();
  }
}

export const isPickupTomorrow = async () => {
  const orderConstants = await getOrderConstants();
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const pickupDate = format(orderConstants.pickupDate, 'yyyy-MM-dd');
  return tomorrow === pickupDate;
};

export const isDeliveryTomorrow = async () => {
  const orderConstants = await getOrderConstants();
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const deliveryDate = format(orderConstants.previousDeliveryDate, 'yyyy-MM-dd');
  return tomorrow === deliveryDate;
};

export const getNotionCustomerIdByPhone = async (customerPhone) => {
  try {
    const response = await notion.dataSources.query({
      data_source_id: CUSTOMERS_DATASOURCE_ID,
      filter: {
        or: [
          {
            property: 'Phone',
            phone_number: {
              equals: customerPhone,
            },
          },
        ],
      },
      page_size: 1,
    });

    return response.results?.[0]?.id;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const updateNotionCustomerAddress = async (customerId, address) => {
  try {
    const response = await notion.pages.update({
      page_id: customerId,
      properties: {
        Address: { rich_text: [{ text: { content: String(address) } }] },
      },
    });

    return response;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const updateNotionCustomer180DayFollowUp = async (customerId, check) => {
  try {
    const response = await notion.pages.update({
      page_id: customerId,
      properties: {
        '180 Day Followup?': { checkbox: check },
      },
    });

    return response;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const getNotionOrderIdByOrderNumber = async (orderNumber) => {
  try {
    const response = await notion.dataSources.query({
      data_source_id: ORDERS_DATASOURCE_ID,
      filter: {
        and: [
          {
            property: 'ID',
            title: {
              equals: orderNumber,
            }
          }
        ],
      },
      page_size: 1,
    });

    return response.results?.[0]?.id;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const updateNotionOrderCollected = async (orderId, check) => {
  try {
    const response = await notion.pages.update({
      page_id: orderId,
      properties: {
        'Collected': { checkbox: check },
      },
    });

    return response;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const updateNotionOrderDelivered = async (orderId, check) => {
  try {
    const response = await notion.pages.update({
      page_id: orderId,
      properties: {
        'Delivered': { checkbox: check },
      },
    });

    return response;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const insertNotionCustomer = async (customer) => {
  try {
    const response = await notion.pages.create({
      parent: {
        data_source_id: CUSTOMERS_DATASOURCE_ID,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: customer.name,
              },
            },
          ],
        },
        Phone: {
          phone_number: customer.phone,
        },
        Address: {
          rich_text: [
            {
              text: {
                content: customer.address,
              },
            },
          ],
        },
        Status: {
          select: {
            name: 'Customer',
          },
        },
      },
    });
    return response;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const insertNotionOrder = async (order) => {
  try {
    const newOrderNumber = getNewOrderNumber(
      order.orderGroup,
      order.currentOrder,
    );

    await notion.pages.update({
      page_id: ORDER_CONSTANTS_PAGE_ID,
      properties: {
        'Current Order': {
          number: order.currentOrder + 1,
        },
      },
    });

    const response = await notion.pages.create({
      parent: {
        data_source_id: ORDERS_DATASOURCE_ID,
      },
      properties: {
        ID: {
          title: [
            {
              text: {
                content: `${newOrderNumber}`,
              },
            },
          ],
        },
        Knifes: {
          number: order.knives,
        },
        Repairs: {
          number: order.repairs,
        },
        'Sharpening Revenue': {
          number: order.orderTotal,
        },
        'Paid Amt': {
          number: order.orderTotal,
        },
        Note: {
          rich_text: [
            {
              text: {
                content: order.note,
              },
            },
          ],
        },
        'Sharpening Note': {
          rich_text: [
            {
              text: {
                content: order.sharpeningNote,
              },
            },
          ],
        },
        Paid: {
          select: {
            name: 'Paid',
          },
        },
        Customers: {
          relation: [
            {
              id: order.customerId,
            },
          ],
        },
        'Date of Pickup': {
          date: {
            start: order.pickupDate,
          },
        },
        'Date of Delivery': {
          date: {
            start: order.deliveryDate,
          },
        },
      },
    });
    return response;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const getOrderConstants = async () => {
  try {
    const response: QueryDataSourceResponse = await notion.dataSources.query({
      data_source_id: ORDER_CONSTANTS_DATASOURCE_ID,
    });
    const first = response.results[0];

    if (!first || first.object !== "page" || !("properties" in first)) {
      throw new Error("Order constants row is not a full PageObjectResponse");
    }

    const constantsResponseProperties = first.properties;

    const constants = {
      pickupDate: getTextFromNotionProperty(constantsResponseProperties['Pickup Date']),
      deliveryDate: getTextFromNotionProperty(constantsResponseProperties['Delivery Date']),
      previousPickupDate: getTextFromNotionProperty(constantsResponseProperties['Previous Pickup Date']),
      previousDeliveryDate: getTextFromNotionProperty(constantsResponseProperties['Previous Delivery Date']),
      orderGroup: Number(getTextFromNotionProperty(constantsResponseProperties['Order Group'])),
      driverOrderGroup: Number(getTextFromNotionProperty(constantsResponseProperties['Driver Order Group'])),
      currentOrder: Number(getTextFromNotionProperty(constantsResponseProperties['Current Order'])),
      timing: getTextFromNotionProperty(constantsResponseProperties['Timing']),
    };
    return constants;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const getOrders = async (orderGroup, includeUrgent = false) => {
  try {
    const filters = [
      { property: 'ID', rich_text: { contains: `${orderGroup}O` } },
    ];

    if (!includeUrgent) {
      filters.push({
        property: 'ID',
        rich_text: { does_not_contain: 'U' },
      });
    }

    const response = await notion.dataSources.query({
      data_source_id: ORDERS_DATASOURCE_ID,
      filter: { and: filters },
      sorts: [{ property: 'ID', direction: 'ascending' }],
    });
    return response.results;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const updateOrderConstantsToNextOrderGroup = async () => {
  const orderConstants = await getOrderConstants();
  const newOrderGroup = orderConstants.orderGroup + 1;
  const newPickupDate = format(
    addWeeks(parseISO(orderConstants.pickupDate), 1),
    'yyyy-MM-dd',
  );
  const newDeliveryDate = format(
    addWeeks(parseISO(orderConstants.deliveryDate), 1),
    'yyyy-MM-dd',
  );

  await notion.pages.update({
    page_id: ORDER_CONSTANTS_PAGE_ID,
    properties: {
      'Order Group': {
        number: newOrderGroup,
      },
      'Current Order': {
        number: 0,
      },
      'Pickup Date': {
        date: {
          start: newPickupDate,
        },
      },
      'Delivery Date': {
        date: {
          start: newDeliveryDate,
        },
      },
      'Previous Pickup Date': {
        date: {
          start: orderConstants.pickupDate,
        },
      },
      'Previous Delivery Date': {
        date: {
          start: orderConstants.deliveryDate,
        },
      },
    },
  });
};

export const updateDriverOrderConstantsToNextOrderGroup = async () => {
  const orderConstants = await getOrderConstants();
  const newOrderGroup = orderConstants.driverOrderGroup + 1;

  await notion.pages.update({
    page_id: ORDER_CONSTANTS_PAGE_ID,
    properties: {
      'Driver Order Group': {
        number: newOrderGroup,
      }
    },
  });
};

export const getCustomers180DaysOld = async () => {
  try {
    const response = await notion.dataSources.query({
      data_source_id: CUSTOMERS_DATASOURCE_ID,
      filter: {
        and: [
          {
            property: 'Days Since Last Order / Contact',
            number: { greater_than_or_equal_to: 180 },
          },
          {
            property: 'Status',
            select: { equals: 'Customer' },
          },
          {
            property: '180 Day Followup?',
            checkbox: { equals: false },
          },
        ],
      },
      page_size: 100,
    });

    return response.results;
  } catch (error) {
    console.error('getCustomers180DaysOld error:', error.message);
  }
};

export const getCustomersWithReminderDates = async () => {
  const nowISO = new Date().toISOString();

  try {
    const response = await notion.dataSources.query({
      data_source_id: CUSTOMERS_DATASOURCE_ID,
      filter: {
        and: [
          {
            property: 'Reminder Date',
            date: { on_or_before: nowISO },
          },
          {
            property: 'Reminder Date',
            date: { is_not_empty: true },
          },
        ],
      },
      page_size: 100,
    });

    return response.results;
  } catch (error) {
    console.error('getCustomersWithReminderDates error:', error.message);
  }
};

export const clearNotionCustomerReminderDate = async (customerId) => {
  try {
    const response = await notion.pages.update({
      page_id: customerId,
      properties: {
        'Reminder Date': { date: null },
      },
    });

    return response;
  } catch (error) {
    console.error('clearNotionCustomerReminderDate error:', error.message);
  }
};
