import { parseISO, format } from 'date-fns';

const stringifyAddressObject = (addressObject) => {
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

const getNewOrderNumber = (orderGroup, currentOrder) => {
  return `${orderGroup}O${currentOrder + 1}`;
};

const formatDate = (date) => {
  return format(parseISO(date), 'd MMMM');
};

export { stringifyAddressObject, getNewOrderNumber, formatDate };
