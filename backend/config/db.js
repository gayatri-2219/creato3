const mongoose = require('mongoose');

let listenersRegistered = false;

const getMongoTarget = (uri) => {
  try {
    const parsed = new URL(uri);
    const port = parsed.port || (parsed.protocol === 'mongodb+srv:' ? 'default' : '27017');
    return `${parsed.hostname}:${port}`;
  } catch {
    return 'the configured MongoDB host';
  }
};

const formatConnectionError = (error, uri) => {
  const message = error?.message || 'Unknown MongoDB error';
  const code = error?.cause?.code || error?.code || '';

  if (code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
    return `Could not connect to MongoDB at ${getMongoTarget(uri)}. Make sure MongoDB is running or update MONGO_URI.`;
  }

  return message;
};

const registerConnectionListeners = () => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('error', (error) => {
    console.error(`MongoDB runtime error: ${error.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
};

const connectDB = async () => {
  const { MONGO_URI, MONGODB_URI, NODE_ENV } = process.env;
  const uri = MONGO_URI || MONGODB_URI;

  if (!uri) {
    throw new Error('MONGO_URI or MONGODB_URI is not defined');
  }

  registerConnectionListeners();

  try {
    await mongoose.connect(uri, {
      autoIndex: NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB connected');
  } catch (error) {
    console.error(`MongoDB connection error: ${formatConnectionError(error, uri)}`);
    throw error;
  }
};

module.exports = connectDB;
