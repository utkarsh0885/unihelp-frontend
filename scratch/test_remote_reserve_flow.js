const axios = require('axios');

const BASE_URL = 'https://unihelp-backend-a5f3.onrender.com';

async function runTest() {
  const emailA = `user_a_${Date.now()}@example.com`;
  const emailB = `user_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('--- 1. Register User A (Seller) ---');
  let res = await axios.post(`${BASE_URL}/api/auth/signup`, {
    name: 'Seller User',
    email: emailA,
    password: password
  });
  const tokenA = res.data.accessToken;
  const userA = res.data.user;
  console.log(`✅ User A registered. ID: ${userA.id}, Email: ${userA.email}`);

  console.log('--- 2. Register User B (Buyer) ---');
  res = await axios.post(`${BASE_URL}/api/auth/signup`, {
    name: 'Buyer User',
    email: emailB,
    password: password
  });
  const tokenB = res.data.accessToken;
  const userB = res.data.user;
  console.log(`✅ User B registered. ID: ${userB.id}, Email: ${userB.email}`);

  console.log('--- 3. User A creates a Buy/Sell listing ---');
  const postPayload = {
    title: 'UniHelp Verification Book',
    content: 'Selling verification book',
    category: 'Buy/Sell',
    price: '$99',
    condition: 'Good',
    description: 'A book used for verification testing',
  };
  
  res = await axios.post(`${BASE_URL}/api/posts`, postPayload, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const post = res.data;
  console.log(`✅ Post created. ID: ${post.id}, Title: ${post.title}`);

  console.log('--- 4. User B tries to reserve the listing ---');
  const reservePayload = { status: 'Reserved' };
  console.log('API URL:', `${BASE_URL}/api/posts/${post.id}`);
  console.log('HTTP method: PUT');
  console.log('Request body:', reservePayload);

  try {
    res = await axios.put(`${BASE_URL}/api/posts/${post.id}`, reservePayload, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    console.log('✅ Response status code:', res.status);
    console.log('✅ Response body:', res.data);
  } catch (err) {
    console.log('❌ Request failed!');
    if (err.response) {
      console.log('Response status code:', err.response.status);
      console.log('Response body:', err.response.data);
    } else {
      console.log('Error message:', err.message);
    }
  }
}

runTest().catch(err => {
  console.error('Test script crashed:', err);
});
