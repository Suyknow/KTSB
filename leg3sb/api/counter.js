import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
// 移除已弃用的选项，让驱动程序使用最新、最稳定的默认设置
const client = new MongoClient(uri);

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  // 仅在需要时连接，驱动程序会管理连接池
  await client.connect();
  const db = client.db('counter_db');
  cachedDb = db;
  return db;
}

const MAX_INCREMENT_ALLOWED = 20;

export default async function handler(req, res) {
  try {
    const db = await connectToDatabase();
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
        // 如果数据库操作因某些原因没有返回结果，主动抛出错误
        throw new Error('Database operation failed to return a result.');
      }
      
      const newTotal = result.value ? result.value.value : validatedIncrement;
      return res.status(200).json({ total: newTotal });
    }

    // 如果方法不是GET或POST，返回405
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error) {
    // 这个 catch 会捕获所有错误，包括数据库连接或操作失败
    console.error('[API_HANDLER_ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
