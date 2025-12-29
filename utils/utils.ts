import { parseISO, format } from 'date-fns';

type Address = {
  line1: string;
  line2: string;
  postal_code: string;
};

const stringifyAddressObject = (addressObject: Address) => {
  const addressLines = [];

  if (addressObject.line1) {
    addressLines.push(addressObject.line1);
  }

  if (addressObject.line2) {
    addressLines.push(addressObject.line2);
  }

  if (addressObject.postal_code) {
    addressLines.push(addressObject.postal_code);
  }

  return addressLines.join(', ');
};

const getNewOrderNumber = (orderGroup: number, currentOrder: number) => {
  return `${orderGroup}O${currentOrder + 1}`;
};

const formatDate = (date: string) => {
  return format(parseISO(date), 'd MMMM');
};

export { stringifyAddressObject, getNewOrderNumber, formatDate };
