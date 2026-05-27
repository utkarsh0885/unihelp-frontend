const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/unihelp');
    // Note: useNewUrlParser and useUnifiedTopology are removed — deprecated in Mongoose 8+

    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);

    // ── Connection event listeners ──
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES - 1) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
      console.log(`   Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    console.error('❌ All MongoDB connection attempts failed. Exiting.');
    process.exit(1);
  }
};

module.exports = connectDB;
