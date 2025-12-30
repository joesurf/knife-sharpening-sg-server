import { Client } from '@notionhq/client';
import { getNewOrderNumber } from './utils.js';
import { parseISO, addWeeks, addDays, format } from 'date-fns';
import { type QueryDataSourceResponse, type PageObjectResponse, type QueryDataSourceParameters } from "@notionhq/client"

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const ORDER_CONSTANTS_DATASOURCE_ID = '286b653f-dfd3-800c-adf4-000b46bcc393';
const ORDERS_DATASOURCE_ID = '9c015ed7-2d42-4689-b036-794ac2ba6295';
const CUSTOMERS_DATASOURCE_ID = 'e4dcf0cf-c09d-4917-9d2a-b7e1eaedf976';
const ORDER_CONSTANTS_PAGE_ID = '286b653fdfd380c7a11bc46af8d61357';

type NotionProperty =
  PageObjectResponse["properties"][string];

export function getTextFromNotionProperty(
  property: NotionProperty
): string | undefined {
  const propertyType = property.type;

  if (propertyType === "title") {
    return property.title[0]?.plain_text;
  }

  if (propertyType === "rich_text") {
    return property.rich_text[0]?.plain_text;
  }

  if (propertyType === "number") {
    return property.number != null
      ? String(property.number)
      : undefined;
  }

  if (propertyType === "date") {
    return property.date?.start ?? undefined;
  }

  if (propertyType === "checkbox") {
    return property.checkbox.toString();
  }

  if (propertyType === "rollup") {
    const rollup = property.rollup;

    if (rollup.type === "array" && rollup.array.length > 0) {
      const item = rollup.array[0];

      if (item.type === "title") {
        return item.title[0]?.plain_text;
      }

      if (item.type === "rich_text") {
        return item.rich_text[0]?.plain_text;
      }

      if (item.type === "phone_number") {
        return item.phone_number?.replace(' ', '') ?? undefined;
      }

      if (item.type === "number") {
        return item.number != null
          ? String(item.number)
          : undefined;
      }

      if (item.type === "date") {
        return item.date?.start ?? undefined;
      }
    }

    return undefined;
  }

  return undefined;
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

export const getNotionCustomerIdByPhone = async (customerPhone: string) => {
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
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export const updateNotionCustomerAddress = async (customerId: string, address: string) => {
  try {
    const response = await notion.pages.update({
      page_id: customerId,
      properties: {
        Address: { rich_text: [{ text: { content: String(address) } }] },
      },
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export const updateNotionCustomer180DayFollowUp = async (customerId: string, check: boolean) => {
  try {
    const response = await notion.pages.update({
      page_id: customerId,
      properties: {
        '180 Day Followup?': { checkbox: check },
      },
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export const getNotionPageIdByOrderNumber = async (orderNumber: string) => {
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
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export const updateNotionOrderCollected = async (orderId: string, check: boolean) => {
  try {
    const response = await notion.pages.update({
      page_id: orderId,
      properties: {
        'Collected': { checkbox: check },
      },
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export const updateNotionOrderDelivered = async (orderId: string, check: boolean) => {
  try {
    const response = await notion.pages.update({
      page_id: orderId,
      properties: {
        'Delivered': { checkbox: check },
      },
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

type Customer = {
  name: string;
  phone: string;
  address: string;
};

export const insertNotionCustomer = async (customer: Customer) => {
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
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

type Order = {
  knives: number;
  repairs: number;
  orderTotal: number;
  note: string;
  sharpeningNote: string;
  customerId: string;
  orderGroup: number;
  currentOrder: number;
  pickupDate: string;
  deliveryDate: string;
};

export const insertNotionOrder = async (order: Order) => {
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
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

type OrderConstants = {
  pickupDate: string;
  deliveryDate: string;
  previousPickupDate: string;
  previousDeliveryDate: string;
  orderGroup: number;
  driverOrderGroup: number;
  currentOrder: number;
  timing: string;
}

export const getOrderConstants = async (): Promise<OrderConstants> => {
  const response: QueryDataSourceResponse = await notion.dataSources.query({
    data_source_id: ORDER_CONSTANTS_DATASOURCE_ID,
  });
  const first = response.results[0];

  if (!first || first.object !== "page" || !("properties" in first)) {
    throw new Error("Order constants row is not a full PageObjectResponse");
  }

  const constantsResponseProperties = first.properties;

  const constants: OrderConstants = {
    pickupDate: getTextFromNotionProperty(constantsResponseProperties['Pickup Date']) || 'NA',
    deliveryDate: getTextFromNotionProperty(constantsResponseProperties['Delivery Date']) || 'NA',
    previousPickupDate: getTextFromNotionProperty(constantsResponseProperties['Previous Pickup Date']) || 'NA',
    previousDeliveryDate: getTextFromNotionProperty(constantsResponseProperties['Previous Delivery Date']) || 'NA',
    orderGroup: Number(getTextFromNotionProperty(constantsResponseProperties['Order Group'])),
    driverOrderGroup: Number(getTextFromNotionProperty(constantsResponseProperties['Driver Order Group'])),
    currentOrder: Number(getTextFromNotionProperty(constantsResponseProperties['Current Order'])),
    timing: getTextFromNotionProperty(constantsResponseProperties['Timing']) || 'NA',
  };

  return constants;
};

type GetOrdersParams = {
  orderGroup: number;
  driverId?: string;
  includeUrgent?: boolean;
};

export const getOrders = async ({ orderGroup, driverId, includeUrgent = false }: GetOrdersParams) => {
  try {
    type FilterUnion = NonNullable<QueryDataSourceParameters['filter']>;
    type AndArray = Extract<FilterUnion, { and: unknown }>['and'];

    const filters: AndArray = [
      { property: 'ID', rich_text: { contains: `${orderGroup}O` } },
    ];

    if (!includeUrgent) {
      filters.push({
        property: 'ID',
        rich_text: { does_not_contain: 'U' },
      });
    }

    if (driverId) {
      filters.push({
        property: 'Driver ID',
        rollup: {
          any: {
            "rich_text": {
              "contains": driverId,
            }
          },
        },
      })
    }

    const response = await notion.dataSources.query({
      data_source_id: ORDERS_DATASOURCE_ID,
      filter: { and: filters },
      sorts: [{ property: 'ID', direction: 'ascending' }],
    });
    return response.results;
  } catch (error) {
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An error occurred:', error);
    }
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
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
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
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export const clearNotionCustomerReminderDate = async (customerId: string) => {
  try {
    const response = await notion.pages.update({
      page_id: customerId,
      properties: {
        'Reminder Date': { date: null },
      },
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('An error occurred:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  }
};

export function formatOrders(orders: QueryDataSourceResponse["results"]) {
  return orders
    .filter((order): order is PageObjectResponse => "properties" in order)
    .map(formatOrder);
}

export function formatOrder(order: PageObjectResponse) {
  const properties = order.properties;

  const pageId = order.id;
  const orderId = getTextFromNotionProperty(properties["ID"]) ?? "NA";
  const customerName =
    getTextFromNotionProperty(properties["Customer Name"]) ?? "NA";
  const whatsApp =
    getTextFromNotionProperty(properties["Customer Phone"]) ?? "NA";
  const address =
    getTextFromNotionProperty(properties["Customer Address"]) ?? "NA";
  const note = getTextFromNotionProperty(properties["Note"]) ?? "NA";
  const collected =
    getTextFromNotionProperty(properties["Collected"]) === "true";
  const delivered =
    getTextFromNotionProperty(properties["Delivered"]) === "true";
  const knives = Number(getTextFromNotionProperty(properties["Knifes"]));
  const repairs = Number(getTextFromNotionProperty(properties["Repairs"]));

  return {
    pageId,
    orderId,
    customerName,
    whatsApp,
    address,
    note,
    collected,
    delivered,
    knives,
    repairs,
  };
}
