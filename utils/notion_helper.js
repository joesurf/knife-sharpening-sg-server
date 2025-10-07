import { Client } from '@notionhq/client'

const notion = new Client({
    auth: process.env.NOTION_TOKEN
})

// const ORDERS_DATABASE_ID = '9758b8e1fcbf4bc9b8ba1762755c25c2';
// const CUSTOMERS_DATABASE_ID = '179b653fdfd380a09557de6692f419b6';
const CUSTOMERS_DATASOURCE_ID = 'e4dcf0cf-c09d-4917-9d2a-b7e1eaedf976';

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
                        content: customer.name
                } 
              }
            ]
        } 
      }
    });
    console.log("Creating Notion Page...");
    return response
  } catch (error) {
    console.error('An error occurred:', error.message)
  }
};

