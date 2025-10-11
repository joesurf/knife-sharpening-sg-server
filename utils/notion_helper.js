import { Client } from '@notionhq/client';
import { getNewOrderNumber } from './utils.js';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const ORDER_CONSTANTS_DATASOURCE_ID = '286b653f-dfd3-800c-adf4-000b46bcc393';
const ORDERS_DATASOURCE_ID = '9c015ed7-2d42-4689-b036-794ac2ba6295';
const CUSTOMERS_DATASOURCE_ID = 'e4dcf0cf-c09d-4917-9d2a-b7e1eaedf976';
const ORDER_CONSTANTS_PAGE_ID = '286b653fdfd380c7a11bc46af8d61357';

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
    const response = await notion.dataSources.query({
      data_source_id: ORDER_CONSTANTS_DATASOURCE_ID,
    });
    const constants = {
      pickupDate: response.results[0].properties['Pickup Date'].date.start,
      deliveryDate: response.results[0].properties['Delivery Date'].date.start,
      orderGroup: response.results[0].properties['Order Group'].number,
      currentOrder: response.results[0].properties['Current Order'].number,
      timing: response.results[0].properties['Timing'].rich_text[0].plain_text,
    };
    return constants;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

export const getOrders = async (orderGroup) => {
  try {
    const response = await notion.dataSources.query({
      data_source_id: ORDERS_DATASOURCE_ID,
      filter: {
        property: 'ID',
        rich_text: {
          contains: `${orderGroup}O`,
        },
      },
    });
    return response.results;
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};
