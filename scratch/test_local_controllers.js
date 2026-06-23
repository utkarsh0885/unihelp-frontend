const path = require('path');

// Local storage for mock collections
const store = {
  posts: {
    'test_post_123': {
      author: 'seller_user_id',
      authorName: 'Seller User',
      title: 'Test Textbook',
      content: 'Selling old textbook',
      category: 'Buy/Sell',
      price: '$50',
      condition: 'Good',
      status: 'Available',
    }
  },
  chats: {},
  messages: {},
  users: {
    'seller_user_id': {
      name: 'Seller User',
      avatarUrl: 'https://avatar/seller',
    },
    'buyer_user_id': {
      name: 'Buyer User',
      avatarUrl: 'https://avatar/buyer',
    }
  }
};

// Mock Firebase DB Admin Cert
const mockDoc = (collection, docId) => ({
  exists: !!store[collection][docId],
  id: docId,
  data: () => store[collection][docId]
});

const mockDb = {
  collection: (colName) => {
    return {
      doc: (docId) => {
        return {
          get: async () => {
            console.log(`[Mock DB] GET document ${docId} from collection "${colName}"`);
            return mockDoc(colName, docId);
          },
          update: async (updates) => {
            console.log(`[Mock DB] UPDATE document ${docId} in collection "${colName}" with:`, updates);
            if (store[colName][docId]) {
              store[colName][docId] = { ...store[colName][docId], ...updates };
            }
            return {};
          },
          collection: (subColName) => {
            return {
              add: async (data) => {
                console.log(`[Mock DB] ADD document in subcollection "${subColName}" of chat ${docId}:`, data);
                const msgId = `msg_${Date.now()}`;
                if (!store.messages[docId]) store.messages[docId] = {};
                store.messages[docId][msgId] = data;
                return { id: msgId };
              },
              get: async () => {
                console.log(`[Mock DB] GET messages subcollection "${subColName}" of chat ${docId}`);
                const list = [];
                const msgs = store.messages[docId] || {};
                for (const key of Object.keys(msgs)) {
                  list.push({
                    id: key,
                    exists: true,
                    data: () => msgs[key]
                  });
                }
                return {
                  forEach: (cb) => list.forEach(cb),
                  docs: list,
                  empty: list.length === 0
                };
              },
              orderBy: () => {
                return {
                  limit: () => {
                    return {
                      get: async () => {
                        const msgs = store.messages[docId] || {};
                        const sorted = Object.keys(msgs).map(k => ({ id: k, ...msgs[k] }));
                        const last = sorted[sorted.length - 1];
                        const list = last ? [{ id: last.id, exists: true, data: () => last }] : [];
                        return {
                          forEach: (cb) => list.forEach(cb),
                          docs: list,
                          empty: list.length === 0
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      },
      add: async (data) => {
        const id = `col_${Date.now()}`;
        console.log(`[Mock DB] ADD document to collection "${colName}" with ID ${id}:`, data);
        store[colName][id] = data;
        return { id };
      },
      where: (field, op, value) => {
        return {
          get: async () => {
            console.log(`[Mock DB] WHERE query on "${colName}": ${field} ${op} ${value}`);
            const list = [];
            for (const key of Object.keys(store[colName])) {
              const item = store[colName][key];
              if (op === 'array-contains') {
                if (Array.isArray(item[field]) && item[field].includes(value)) {
                  list.push({ id: key, exists: true, data: () => item });
                }
              }
            }
            return {
              forEach: (cb) => list.forEach(cb),
              docs: list,
              empty: list.length === 0
            };
          }
        };
      }
    };
  }
};

const mockAdmin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date(),
    }
  }
};

// Inject mockDb into require.cache
const dbPath = require.resolve('../backend/config/db.js');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    db: mockDb,
    admin: mockAdmin
  }
};

// Load postController and chatController
const postController = require('../backend/controllers/postController.js');
const chatController = require('../backend/controllers/chatController.js');

// Helper to run a controller action returning a Promise
function runController(controllerFn, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        resolve({ status: this.statusCode, data });
      }
    };
    const next = (err) => {
      reject(err);
    };
    controllerFn(req, res, next);
  });
}

async function testAll() {
  console.log('\n--- 1. Testing postController.updatePost (Reserve Action) ---');
  let req = {
    params: { id: 'test_post_123' },
    body: { status: 'Reserved' },
    user: { id: 'buyer_user_id', role: 'user' },
  };
  let result = await runController(postController.updatePost, req);
  console.log(`Response status: ${result.status}`);
  console.log('Response data:', result.data);

  console.log('\n--- 2. Testing chatController.getOrCreateChat (Contact Seller Action) ---');
  req = {
    body: {
      recipientId: 'seller_user_id',
      recipientName: 'Seller User'
    },
    user: { id: 'buyer_user_id', name: 'Buyer User', role: 'user' }
  };
  result = await runController(chatController.getOrCreateChat, req);
  console.log(`Response status: ${result.status}`);
  console.log('Response data:', result.data);
  const activeChat = result.data;

  if (activeChat) {
    const chatId = activeChat.id;

    console.log('\n--- 3. Testing chatController.sendMessage (Send Chat Message Action) ---');
    req = {
      params: { chatId },
      body: { text: 'Hello, is the item still available?' },
      user: { id: 'buyer_user_id', role: 'user' }
    };
    result = await runController(chatController.sendMessage, req);
    console.log(`Response status: ${result.status}`);
    console.log('Response data:', result.data);

    console.log('\n--- 4. Testing chatController.getMessages (Retrieve Messages Action) ---');
    req = {
      params: { chatId },
      user: { id: 'buyer_user_id', role: 'user' }
    };
    result = await runController(chatController.getMessages, req);
    console.log(`Response status: ${result.status}`);
    console.log('Response data:', result.data);

    console.log('\n--- 5. Testing chatController.getChats (Fetch Active Conversations Action) ---');
    req = {
      user: { id: 'buyer_user_id', role: 'user' }
    };
    result = await runController(chatController.getChats, req);
    console.log(`Response status: ${result.status}`);
    console.log('Response data:', result.data);
  }
}

testAll().catch(err => {
  console.error('❌ Test failed with error:', err);
});
