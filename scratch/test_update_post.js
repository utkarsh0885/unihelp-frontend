// Mock Firebase DB
const mockDoc = {
  exists: true,
  data: () => ({
    author: 'seller_user_id',
    title: 'Test Textbook',
    content: 'Selling old textbook',
    category: 'Buy/Sell',
    price: '$50',
    condition: 'Good',
    status: 'Available',
  })
};

const mockDb = {
  collection: (name) => ({
    doc: (id) => ({
      get: async () => {
        console.log(`[Mock DB] get doc: ${id} from collection: ${name}`);
        return mockDoc;
      },
      update: async (updates) => {
        console.log(`[Mock DB] update doc: ${id} with:`, updates);
        return {};
      }
    })
  })
};

// Inject mockDb into require.cache
const dbPath = require.resolve('/Users/utkarshsingh/Desktop/UNIHELP/backend/config/db.js');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    db: mockDb,
    admin: {
      firestore: {
        FieldValue: {
          serverTimestamp: () => new Date(),
        }
      }
    }
  }
};

// Load postController
const postController = require('/Users/utkarshsingh/Desktop/UNIHELP/backend/controllers/postController.js');

async function testReserve() {
  const req = {
    params: { id: 'test_post_123' },
    body: { status: 'Reserved' },
    user: { id: 'buyer_user_id', role: 'user' },
  };

  const res = {
    json: (data) => {
      console.log('✅ Response JSON:', data);
    },
    status: (code) => {
      console.log('Status code:', code);
      return res;
    }
  };

  try {
    console.log('--- Executing updatePost controller for reservation ---');
    await postController.updatePost(req, res);
  } catch (err) {
    console.error('❌ Error thrown in controller:', err.message, err.statusCode);
  }
}

testReserve();
