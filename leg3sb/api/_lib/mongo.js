import { MongoClient } from 'mongodb';

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'counter_db';

let clientPromise = null;

function getClientPromise() {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (process.env.NODE_ENV === 'development') {
    // 开发模式下复用全局 Promise，避免热重载时重复创建连接
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri).connect();
  }

  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(MONGODB_DB_NAME);
}
