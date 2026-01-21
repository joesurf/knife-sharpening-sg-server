import { Client } from '@notionhq/client';
import { getNewOrderNumber } from './utils.js';
import { parseISO, addWeeks, addDays, format } from 'date-fns';
import { type QueryDataSourceResponse, type PageObjectResponse, type QueryDataSourceParameters } from "@notionhq/client"

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const ORDER_STATUS_DATASOURCE_ID = '2edb653f-dfd3-8033-83ee-000b9e670c37';
const ORDER_GROUPS_DATASOURCE_ID = '2edb653f-dfd3-8044-84ea-000bc9a2a2e0';
const ORDERS_DATASOURCE_ID = '9c015ed7-2d42-4689-b036-794ac2ba6295';
const CUSTOMERS_DATASOURCE_ID = 'e4dcf0cf-c09d-4917-9d2a-b7e1eaedf976';

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
  const pickupDate = format(orderConstants.serviceOrderGroup.pickupDate, 'yyyy-MM-dd');
  return tomorrow === pickupDate;
};

export const isDeliveryTomorrow = async () => {
  const orderConstants = await getOrderConstants();
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const deliveryDate = format(orderConstants.serviceOrderGroup.deliveryDate, 'yyyy-MM-dd');
  return tomorrow === deliveryDate;
};

export const isServiceEnded = async () => {
  const orderConstants = await getOrderConstants();
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
  const deliveryDate = format(orderConstants.serviceOrderGroup.deliveryDate, 'yyyy-MM-dd');

  return yesterday === deliveryDate;
};

export const isBookingEnded = async () => {
  const orderConstants = await getOrderConstants();
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const pickupDate = format(orderConstants.bookingOrderGroup.pickupDate, 'yyyy-MM-dd');

  return tomorrow === pickupDate;
};

export const isBookingFull = async () => {
  const orderConstants = await getOrderConstants();
  const knifeCount = await getKnifeCountForGroup(orderConstants.bookingOrderGroup.orderGroupNumber);

  return knifeCount > 50;
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


export const updateNotionPagePickupOrder = async (pageId: string, pickupOrder: number) => {
  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        'Pickup Order': { number: pickupOrder },
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

export type OrderGroupDetails = {
  orderGroupNumber: number;
  pickupDate: string;
  deliveryDate: string;
  timing: string;
};

export type OrderConstants = {
  bookingOrderGroup: OrderGroupDetails;
  serviceOrderGroup: OrderGroupDetails;
};

async function getOrderStatusRow(name: 'Booking' | 'Service'): Promise<{ orderGroupId: string; orderGroupNumber: number }> {
  const response = await notion.dataSources.query({
    data_source_id: ORDER_STATUS_DATASOURCE_ID,
    filter: {
      property: 'Name',
      title: { equals: name },
    },
  });

  const row = response?.results?.[0];
  if (!row || !('properties' in row)) throw new Error(`No "${name}" row found in Order Status`);

  const relationProp = row.properties['Order Group'];
  if (relationProp?.type !== 'relation') throw new Error(`Order Group is not a relation for "${name}"`);

  const relationArray = relationProp.relation as { id: string }[];
  const relation = relationArray?.[0];
  if (!relation?.id) throw new Error(`No Order Group relation found for "${name}"`);

  const orderGroupPage = await notion.pages.retrieve({ page_id: relation.id });
  if (!('properties' in orderGroupPage)) throw new Error(`Could not retrieve Order Group page for "${name}"`);

  const nameProp = orderGroupPage.properties['Name'];
  const orderGroupNumber = nameProp?.type === 'title'
    ? parseInt(nameProp.title?.[0]?.plain_text, 10)
    : NaN;

  if (isNaN(orderGroupNumber)) throw new Error(`Invalid order group number for "${name}"`);

  return { orderGroupId: relation.id, orderGroupNumber };
}

async function getOrderGroupDetails(orderGroupId: string): Promise<{ pickupDate: string; deliveryDate: string; timing: string }> {
  const page = await notion.pages.retrieve({ page_id: orderGroupId });
  if (!('properties' in page)) throw new Error('Could not retrieve Order Group details');

  const pickupDateProp = page.properties['Pickup Date'];
  const deliveryDateProp = page.properties['Delivery Date'];
  const timingProp = page.properties['Timing'];

  const pickupDate = pickupDateProp?.type === 'date' ? pickupDateProp.date?.start : undefined;
  const deliveryDate = deliveryDateProp?.type === 'date' ? deliveryDateProp.date?.start : undefined;
  const timing = timingProp?.type === 'rich_text' ? timingProp.rich_text?.[0]?.plain_text : undefined;

  if (!pickupDate || !deliveryDate || typeof timing !== 'string') {
    throw new Error('Order Group missing required fields');
  }

  return { pickupDate, deliveryDate, timing };
}

export const getOrderConstants = async (): Promise<OrderConstants> => {
  const [bookingStatus, driverStatus] = await Promise.all([
    getOrderStatusRow('Booking'),
    getOrderStatusRow('Service'),
  ]);

  const [bookingDetails, driverDetails] = await Promise.all([
    getOrderGroupDetails(bookingStatus.orderGroupId),
    getOrderGroupDetails(driverStatus.orderGroupId),
  ]);

  return {
    bookingOrderGroup: {
      orderGroupNumber: bookingStatus.orderGroupNumber,
      ...bookingDetails,
    },
    serviceOrderGroup: {
      orderGroupNumber: driverStatus.orderGroupNumber,
      ...driverDetails,
    },
  };
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

export const getOrderCountForGroup = async (orderGroup: number): Promise<number> => {
  const orders = await getOrders({ orderGroup, includeUrgent: true });
  return orders?.length ?? 0;
};

export const getKnifeCountForGroup = async (orderGroup: number): Promise<number> => {
  const orders = await getOrders({ orderGroup, includeUrgent: true });
  if (!orders) return 0;
  const formattedOrders = formatOrders(orders);
  return formattedOrders.reduce((total, order) => total + order.knives, 0);
};

async function getOrderStatusPageId(name: 'Booking' | 'Service'): Promise<string> {
  const response = await notion.dataSources.query({
    data_source_id: ORDER_STATUS_DATASOURCE_ID,
    filter: {
      property: 'Name',
      title: { equals: name },
    },
  });

  const row = response?.results?.[0];
  if (!row) throw new Error(`No "${name}" row found in Order Status`);
  return row.id;
}

async function getOrCreateOrderGroupByNumber(orderGroupNumber: number): Promise<string> {
  // Try to find existing Order Group
  const response = await notion.dataSources.query({
    data_source_id: ORDER_GROUPS_DATASOURCE_ID,
    filter: {
      property: 'Name',
      title: { equals: String(orderGroupNumber) },
    },
  });

  const existing = response?.results?.[0];
  if (existing) {
    return existing.id;
  }

  // Create new Order Group with dates one week from current
  const orderConstants = await getOrderConstants();
  const currentPickupDate = orderConstants.bookingOrderGroup.pickupDate;
  const currentDeliveryDate = orderConstants.bookingOrderGroup.deliveryDate;
  const timing = orderConstants.bookingOrderGroup.timing;

  const newPickupDate = format(addWeeks(parseISO(currentPickupDate), 1), 'yyyy-MM-dd');
  const newDeliveryDate = format(addWeeks(parseISO(currentDeliveryDate), 1), 'yyyy-MM-dd');

  const newPage = await notion.pages.create({
    parent: {
      data_source_id: ORDER_GROUPS_DATASOURCE_ID,
    },
    properties: {
      Name: {
        title: [{ text: { content: String(orderGroupNumber) } }],
      },
      'Pickup Date': {
        date: { start: newPickupDate },
      },
      'Delivery Date': {
        date: { start: newDeliveryDate },
      },
      Timing: {
        rich_text: [{ text: { content: timing } }],
      },
    },
  });

  return newPage.id;
}

async function updateOrderStatusRelation(statusName: 'Booking' | 'Service', orderGroupPageId: string): Promise<void> {
  const statusPageId = await getOrderStatusPageId(statusName);

  await notion.pages.update({
    page_id: statusPageId,
    properties: {
      'Order Group': {
        relation: [{ id: orderGroupPageId }],
      },
    },
  });
}

export const updateOrderConstantsToNextOrderGroup = async () => {
  const orderConstants = await getOrderConstants();
  const nextOrderGroupNumber = orderConstants.bookingOrderGroup.orderGroupNumber + 1;
  const nextOrderGroupId = await getOrCreateOrderGroupByNumber(nextOrderGroupNumber);
  await updateOrderStatusRelation('Booking', nextOrderGroupId);
};

export const updateServiceOrderConstantsToNextOrderGroup = async () => {
  const orderConstants = await getOrderConstants();
  const nextOrderGroupNumber = orderConstants.serviceOrderGroup.orderGroupNumber + 1;
  const nextOrderGroupId = await getOrCreateOrderGroupByNumber(nextOrderGroupNumber);
  await updateOrderStatusRelation('Service', nextOrderGroupId);
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
  const sharpeningNote = getTextFromNotionProperty(properties["Sharpening Note"]) ?? "NA";
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
    sharpeningNote,
    collected,
    delivered,
    knives,
    repairs,
  };
}
