const axios = require('axios');

const BASE_URL = 'https://unihelp-backend-a5f3.onrender.com';

async function runTest() {
  const sellerEmail = `seller_${Date.now()}@example.com`;
  const buyerEmail = `buyer_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('\n--- 1. Register Seller ---');
  let res = await axios.post(`${BASE_URL}/api/auth/signup`, {
    name: 'Verification Seller',
    email: sellerEmail,
    password: password
  });
  const sellerToken = res.data.accessToken;
  const sellerId = res.data.user.id;
  console.log(`✅ Seller registered. ID: ${sellerId}, Email: ${sellerEmail}`);

  console.log('\n--- 2. Register Buyer ---');
  res = await axios.post(`${BASE_URL}/api/auth/signup`, {
    name: 'Verification Buyer',
    email: buyerEmail,
    password: password
  });
  const buyerToken = res.data.accessToken;
  const buyerId = res.data.user.id;
  console.log(`✅ Buyer registered. ID: ${buyerId}, Email: ${buyerEmail}`);

  console.log('\n--- 3. Seller Creates Listing ---');
  const postPayload = {
    title: 'Verification Item',
    content: 'Testing item reservation and chat',
    category: 'Buy/Sell',
    price: '$50',
    condition: 'Like New',
    description: 'Item for API tracing',
  };
  console.log('API URL:', `${BASE_URL}/api/posts`);
  console.log('HTTP method: POST');
  console.log('Request body:', postPayload);
  res = await axios.post(`${BASE_URL}/api/posts`, postPayload, {
    headers: { Authorization: `Bearer ${sellerToken}` }
  });
  const post = res.data;
  console.log('Response status code:', res.status);
  console.log('Response body:', post);

  console.log('\n--- 4. Buyer Reserves Listing ---');
  const reservePayload = { status: 'Reserved' };
  console.log('API URL:', `${BASE_URL}/api/posts/${post.id}`);
  console.log('HTTP method: PUT');
  console.log('Request body:', reservePayload);
  try {
    res = await axios.put(`${BASE_URL}/api/posts/${post.id}`, reservePayload, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log('Response status code:', res.status);
    console.log('Response body:', res.data);
  } catch (err) {
    console.log('❌ Reservation failed!');
    if (err.response) {
      console.log('Response status code:', err.response.status);
      console.log('Response body:', err.response.data);
    } else {
      console.log('Error message:', err.message);
    }
  }

  console.log('\n--- 5. Contact Seller (Init Chat) ---');
  const chatPayload = {
    recipientId: sellerId,
    recipientName: 'Verification Seller'
  };
  console.log('API URL:', `${BASE_URL}/api/chat/init`);
  console.log('HTTP method: POST');
  console.log('Request body:', chatPayload);
  let chatId;
  try {
    res = await axios.post(`${BASE_URL}/api/chat/init`, chatPayload, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    chatId = res.data.id;
    console.log('Response status code:', res.status);
    console.log('Response body:', res.data);
  } catch (err) {
    console.log('❌ Contact Seller failed!');
    if (err.response) {
      console.log('Response status code:', err.response.status);
      console.log('Response body:', err.response.data);
    } else {
      console.log('Error message:', err.message);
    }
  }

  if (chatId) {
    console.log('\n--- 6. Send Message ---');
    const msgPayload = { text: 'Hello, is this item still available?' };
    console.log('API URL:', `${BASE_URL}/api/chat/${chatId}/messages`);
    console.log('HTTP method: POST');
    console.log('Request body:', msgPayload);
    try {
      res = await axios.post(`${BASE_URL}/api/chat/${chatId}/messages`, msgPayload, {
        headers: { Authorization: `Bearer ${buyerToken}` }
      });
      console.log('Response status code:', res.status);
      console.log('Response body:', res.data);
    } catch (err) {
      console.log('❌ Sending message failed!');
      if (err.response) {
        console.log('Response status code:', err.response.status);
        console.log('Response body:', err.response.data);
      } else {
        console.log('Error message:', err.message);
      }
    }

    console.log('\n--- 7. Read Messages ---');
    console.log('API URL:', `${BASE_URL}/api/chat/${chatId}/messages`);
    console.log('HTTP method: GET');
    try {
      res = await axios.get(`${BASE_URL}/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${buyerToken}` }
      });
      console.log('Response status code:', res.status);
      console.log('Response body:', res.data);
    } catch (err) {
      console.log('❌ Reading messages failed!');
      if (err.response) {
        console.log('Response status code:', err.response.status);
        console.log('Response body:', err.response.data);
      } else {
        console.log('Error message:', err.message);
      }
    }
  }
}

runTest().catch(err => {
  console.error('Test script crashed:', err);
});
