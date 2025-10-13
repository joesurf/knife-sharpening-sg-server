import 'dotenv/config';

const checkingResponse = await fetch(
  'http://localhost:3000/botspace/getOrderConstants',
);
const checkingData = await checkingResponse.json();
console.log(checkingData);
