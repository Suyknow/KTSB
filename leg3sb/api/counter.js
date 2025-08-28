import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
// 增加连接选项，有助于在高并发下管理连接池
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let cachedDb = null;

async function connectToDatabase() {
  // 如果已有缓存连接，直接返回
  if (cachedDb) {
    console.log('Using cached database instance');
    return cachedDb;
  }
  
  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    const db = client.db('counter_db');
    cachedDb = db;
    console.log('New database connection established');
    return db;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    // 抛出错误，让主handler可以捕获到
    throw new Error('Database connection failed');
  }
}

const MAX_INCREMENT_ALLOWED = 20;

export default async function handler(req, res) {
  // 预先设置CORS头，确保任何响应都包含它们
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    console.log(`[${req.method}] Request received for /api/counter`);
    const db = await connectToDatabase();
    
    // 增加一个日志，确认数据库对象是否获取成功
    if (!db) {
        throw new Error('Database object is null or undefined after connection attempt.');
    }
    
    const collection = db.collection('counts');
    const counterId = 'total_shabi_count';

    if (req.method === 'GET') {
      console.log('Executing GET request logic');
      const counterDoc = await collection.findOne({ _id: counterId });
      const count = counterDoc ? counterDoc.value : 0;
      console.log(`GET request successful, returning total: ${count}`);
      return res.status(200).json({ total: count });
    }

    if (req.method === 'POST') {
      console.log('Executing POST request logic');
      const { incrementBy } = req.body;

      if (typeof incrementBy !== 'number' || !Number.isInteger(incrementBy) || incrementBy <= 0) {
        return res.status(400).json({ error: 'Invalid increment value. Must be a positive integer.' });
      }

      const validatedIncrement = Math.min(incrementBy, MAX_INCREMENT_ALLOWED);
      console.log(`Validated increment value: ${validatedIncrement}`);

      const result = await collection.findOneAndUpdate(
        { _id: counterId },
        { $inc: { value: validatedIncrement } },
        { upsert: true, returnDocument: 'after' }
      );

      // 增加一个日志，检查数据库返回的结果
      console.log('MongoDB findOneAndUpdate result:', result);

      if (!result) {
        throw new Error('MongoDB findOneAndUpdate returned null or undefined.');
      }
      
      const newTotal = result.value ? result.value.value : validatedIncrement;
      console.log(`POST request successful, returning new total: ${newTotal}`);
      return res.status(200).json({ total: newTotal });
    }

    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

  } catch (error) {
    // 捕获所有可能的错误，包括数据库连接失败
    console.error('[HANDLER_ERROR] An error occurred:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
