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

const sendFridayCollectionReminder = () => {
  console.log('Friday Reminder')
}

export { fetchBotspace, sendFridayCollectionReminder };
