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

export { stringifyAddressObject };
