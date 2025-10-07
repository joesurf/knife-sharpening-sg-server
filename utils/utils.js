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

export { stringifyAddressObject, fetchBotspace };
