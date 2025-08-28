import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // 在开发模式下，使用一个全局变量来保存client，这样在热重载时不会重复创建连接
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // 在生产模式下，这是最佳实践
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

const MAX_INCREMENT_ALLOWED = 20;

export default async function handler(req, res) {
  try {
    // 等待并复用全局的数据库连接Promise
    const client = await clientPromise;
    const db = client.db("counter_db");
    const collection = db.collection('counts');
    const counterId = 'total_shabi_count';

    if (req.method === 'GET') {
      const counterDoc = await collection.findOne({ _id: counterId });
      const count = counterDoc ? counterDoc.value : 0;
      return res.status(200).json({ total: count });
    }

    if (req.method === 'POST') {
      const { incrementBy } = req.body;

      if (typeof incrementBy !== 'number' || !Number.isInteger(incrementBy) || incrementBy <= 0) {
        return res.status(400).json({ error: 'Invalid increment value. Must be a positive integer.' });
      }

      const validatedIncrement = Math.min(incrementBy, MAX_INCREMENT_ALLOWED);

      const result = await collection.findOneAndUpdate(
        { _id: counterId },
        { $inc: { value: validatedIncrement } },
        { upsert: true, returnDocument: 'after' }
      );
      
      if (!result) {
        throw new Error('Database operation failed to return a result.');
      }
      
      const newTotal = result.value.value;
      return res.status(200).json({ total: newTotal });
    }

    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error) {
    console.error('[API_HANDLER_ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
